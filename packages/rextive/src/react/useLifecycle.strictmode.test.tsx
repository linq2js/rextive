import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { useLifecycle } from "./useLifecycle";
import "@testing-library/jest-dom/vitest";

/**
 * StrictMode tests for useLifecycle
 * 
 * React StrictMode intentionally double-mounts components in development to help detect bugs:
 * 1. Mount → Unmount → Remount (same component)
 * 
 * Our useLifecycle should handle this gracefully:
 * - Cleanup runs immediately on unmount
 * - Dispose is deferred and can be cancelled if component remounts
 * - This prevents unnecessary disposal of resources during StrictMode double-mounting
 */
describe("useLifecycle StrictMode safety", () => {
  describe("component lifecycle in StrictMode", () => {
    it("should not dispose on StrictMode double-mount", async () => {
      const init = vi.fn();
      const mount = vi.fn();
      const cleanup = vi.fn();
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({ init, mount, cleanup, dispose });
        return <div>test</div>;
      };

      // Render in StrictMode (simulates double-mount)
      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );

      // Wait for all effects to settle
      await new Promise((resolve) => setTimeout(resolve, 10));

      // In StrictMode, React fully remounts the component:
      // 1. Mount → init, mount
      // 2. Unmount → cleanup
      // 3. Remount → init again, mount again
      
      // Init and mount called at least twice (StrictMode double-mount)
      expect(init).toHaveBeenCalled();
      expect(mount).toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalled();

      // ✅ KEY ASSERTION: Dispose should NOT be called
      // Because the component remounted before dispose microtask ran
      expect(dispose).not.toHaveBeenCalled();
    });

    it("should dispose on final unmount after StrictMode cycles", async () => {
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({ dispose });
        return <div>test</div>;
      };

      const { unmount } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );

      // Dispose should not be called during StrictMode double-mount
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(dispose).not.toHaveBeenCalled();

      // Now really unmount the component
      unmount();

      // Wait for deferred disposal
      await new Promise((resolve) => setTimeout(resolve, 10));

      // ✅ Now dispose should be called
      expect(dispose).toHaveBeenCalledOnce();
    });

    it("should call cleanup on each unmount but dispose only once", async () => {
      const cleanup = vi.fn();
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({ cleanup, dispose });
        return <div>test</div>;
      };

      const { unmount } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Cleanup runs during StrictMode unmount
      expect(cleanup).toHaveBeenCalledTimes(1);
      // But dispose doesn't (because component remounts)
      expect(dispose).not.toHaveBeenCalled();

      unmount();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Final unmount: cleanup and dispose both called once more
      expect(cleanup).toHaveBeenCalledTimes(2);
      expect(dispose).toHaveBeenCalledOnce();
    });
  });

  describe("object lifecycle in StrictMode", () => {
    it("should not dispose target on StrictMode double-mount with same target", async () => {
      const target = { id: 1, name: "Test" };
      const init = vi.fn();
      const mount = vi.fn();
      const cleanup = vi.fn();
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({
          for: target,
          init,
          mount,
          cleanup,
          dispose,
        });
        return <div>{target.name}</div>;
      };

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      // StrictMode causes full remount with same target
      expect(init).toHaveBeenCalledWith(target);
      expect(mount).toHaveBeenCalledWith(target);
      expect(cleanup).toHaveBeenCalledWith(target);

      // ✅ KEY ASSERTION: Dispose NOT called (target remounted before microtask)
      expect(dispose).not.toHaveBeenCalled();
    });

    it("should dispose old target when target changes after StrictMode mount", async () => {
      const target1 = { id: 1, name: "Target1" };
      const target2 = { id: 2, name: "Target2" };
      const init = vi.fn();
      const dispose = vi.fn();

      const TestComponent = ({ target }: { target: typeof target1 }) => {
        useLifecycle({
          for: target,
          init,
          dispose,
        });
        return <div>{target.name}</div>;
      };

      const { rerender } = render(
        <StrictMode>
          <TestComponent target={target1} />
        </StrictMode>
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Init called with target1
      expect(init).toHaveBeenCalledWith(target1);
      expect(dispose).not.toHaveBeenCalled();

      // Change target
      rerender(
        <StrictMode>
          <TestComponent target={target2} />
        </StrictMode>
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      // ✅ Old target should be disposed when target changes
      expect(dispose).toHaveBeenCalledWith(target1);
      expect(init).toHaveBeenCalledWith(target2);
      // dispose called once for target1 (target2 still mounted)
      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple target changes in StrictMode", async () => {
      const target1 = { id: 1 };
      const target2 = { id: 2 };
      const target3 = { id: 3 };
      const init = vi.fn();
      const dispose = vi.fn();

      const TestComponent = ({ target }: { target: typeof target1 }) => {
        useLifecycle({
          for: target,
          init,
          dispose,
        });
        return <div>{target.id}</div>;
      };

      const { rerender } = render(
        <StrictMode>
          <TestComponent target={target1} />
        </StrictMode>
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      rerender(
        <StrictMode>
          <TestComponent target={target2} />
        </StrictMode>
      );
      await new Promise((resolve) => setTimeout(resolve, 10));

      rerender(
        <StrictMode>
          <TestComponent target={target3} />
        </StrictMode>
      );
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Init called for all three targets
      expect(init).toHaveBeenCalledWith(target1);
      expect(init).toHaveBeenCalledWith(target2);
      expect(init).toHaveBeenCalledWith(target3);
      
      // target1 and target2 disposed (target3 still mounted)
      expect(dispose).toHaveBeenCalledWith(target1);
      expect(dispose).toHaveBeenCalledWith(target2);
      expect(dispose).toHaveBeenCalledTimes(2);
    });

    it("should dispose final target on unmount in StrictMode", async () => {
      const target = { id: 1 };
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({
          for: target,
          dispose,
        });
        return <div>test</div>;
      };

      const { unmount } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(dispose).not.toHaveBeenCalled();

      unmount();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(dispose).toHaveBeenCalledWith(target);
      expect(dispose).toHaveBeenCalledOnce();
    });
  });

  describe("production vs development behavior", () => {
    it("should defer disposal in development (default vitest env)", async () => {
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({ dispose });
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      // Should not be called synchronously
      expect(dispose).not.toHaveBeenCalled();

      // Should be called after microtask
      await Promise.resolve();
      expect(dispose).toHaveBeenCalledOnce();
    });

    it("should handle cleanup errors without breaking StrictMode safety", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const cleanup = vi.fn();
      const dispose = vi.fn(() => {
        throw new Error("Dispose error");
      });

      const TestComponent = () => {
        useLifecycle({ cleanup, dispose });
        return <div>test</div>;
      };

      const { unmount } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Cleanup called during StrictMode unmount
      expect(cleanup).toHaveBeenCalledTimes(1);

      unmount();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Dispose throws error but doesn't break
      expect(consoleError).toHaveBeenCalledWith(
        "Error in dispose callback:",
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle rapid mount/unmount/remount cycles", async () => {
      const init = vi.fn();
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({ init, dispose });
        return <div>test</div>;
      };

      // Simulate rapid mounting/unmounting
      const { unmount: unmount1 } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );
      unmount1();

      const { unmount: unmount2 } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );
      unmount2();

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Both components fully unmounted, so dispose called for each
      // (Note: exact counts may vary due to StrictMode, but dispose should be called)
      expect(dispose).toHaveBeenCalled();
      expect(dispose.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("should not leak pending dispose tasks", async () => {
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({ dispose });
        return <div>test</div>;
      };

      // Mount and immediately unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <StrictMode>
            <TestComponent />
          </StrictMode>
        );
        unmount();
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should call dispose exactly 5 times (once per final unmount)
      expect(dispose).toHaveBeenCalledTimes(5);
    });

    it("should handle object lifecycle with rapid target changes", async () => {
      const dispose = vi.fn();

      const TestComponent = ({ id }: { id: number }) => {
        useLifecycle({
          for: { id },
          dispose: (target) => dispose(target.id),
        });
        return <div>{id}</div>;
      };

      const { rerender } = render(
        <StrictMode>
          <TestComponent id={1} />
        </StrictMode>
      );

      // Rapidly change targets
      for (let id = 2; id <= 5; id++) {
        rerender(
          <StrictMode>
            <TestComponent id={id} />
          </StrictMode>
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should dispose 1, 2, 3, 4 (not 5, still mounted)
      expect(dispose).toHaveBeenCalledTimes(4);
      expect(dispose).toHaveBeenCalledWith(1);
      expect(dispose).toHaveBeenCalledWith(2);
      expect(dispose).toHaveBeenCalledWith(3);
      expect(dispose).toHaveBeenCalledWith(4);
      expect(dispose).not.toHaveBeenCalledWith(5);
    });
  });
});

