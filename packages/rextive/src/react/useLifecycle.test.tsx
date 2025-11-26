import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useLifecycle } from "./useLifecycle";
import "@testing-library/jest-dom/vitest";

describe("useLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("init callback", () => {
    it("should call init during component initialization", () => {
      const init = vi.fn();

      const TestComponent = () => {
        useLifecycle({ init });
        return <div>test</div>;
      };

      render(<TestComponent />);
      expect(init).toHaveBeenCalledTimes(1);
    });

    it("should call init before first render", () => {
      const callOrder: string[] = [];

      const TestComponent = () => {
        useLifecycle({
          init: () => callOrder.push("init"),
          render: () => callOrder.push("render"),
        });
        return <div>test</div>;
      };

      render(<TestComponent />);
      expect(callOrder).toEqual(["init", "render"]);
    });

    it("should call init only once even on re-renders", () => {
      const init = vi.fn();

      const TestComponent = ({ count }: { count: number }) => {
        useLifecycle({ init });
        return <div>{count}</div>;
      };

      const { rerender } = render(<TestComponent count={1} />);
      expect(init).toHaveBeenCalledTimes(1);

      rerender(<TestComponent count={2} />);
      expect(init).toHaveBeenCalledTimes(1);
    });
  });

  describe("mount callback", () => {
    it("should call mount after first render", async () => {
      const mount = vi.fn();

      const TestComponent = () => {
        useLifecycle({ mount });
        return <div>test</div>;
      };

      render(<TestComponent />);
      await waitFor(() => {
        expect(mount).toHaveBeenCalledTimes(1);
      });
    });

    it("should call mount after init and render", async () => {
      const callOrder: string[] = [];

      const TestComponent = () => {
        useLifecycle({
          init: () => callOrder.push("init"),
          render: () => callOrder.push("render"),
          mount: () => callOrder.push("mount"),
        });
        return <div>test</div>;
      };

      render(<TestComponent />);
      await waitFor(() => {
        expect(callOrder).toEqual(["init", "render", "mount"]);
      });
    });

    it("should not call mount on re-renders", async () => {
      const mount = vi.fn();

      const TestComponent = ({ count }: { count: number }) => {
        useLifecycle({ mount });
        return <div>{count}</div>;
      };

      const { rerender } = render(<TestComponent count={1} />);
      await waitFor(() => {
        expect(mount).toHaveBeenCalledTimes(1);
      });

      rerender(<TestComponent count={2} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mount).toHaveBeenCalledTimes(1);
    });
  });

  describe("render callback", () => {
    it("should call render on every render", () => {
      const renderCallback = vi.fn();

      const TestComponent = ({ count }: { count: number }) => {
        useLifecycle({ render: renderCallback });
        return <div>{count}</div>;
      };

      const { rerender } = render(<TestComponent count={1} />);
      expect(renderCallback).toHaveBeenCalledTimes(1);

      rerender(<TestComponent count={2} />);
      expect(renderCallback).toHaveBeenCalledTimes(2);

      rerender(<TestComponent count={3} />);
      expect(renderCallback).toHaveBeenCalledTimes(3);
    });

    it("should call render before mount", async () => {
      const callOrder: string[] = [];

      const TestComponent = () => {
        useLifecycle({
          render: () => callOrder.push("render"),
          mount: () => callOrder.push("mount"),
        });
        return <div>test</div>;
      };

      render(<TestComponent />);
      await waitFor(() => {
        expect(callOrder).toEqual(["render", "mount"]);
      });
    });
  });

  describe("cleanup callback", () => {
    it("should call cleanup on unmount", async () => {
      const cleanup = vi.fn();

      const TestComponent = () => {
        useLifecycle({ cleanup });
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(cleanup).not.toHaveBeenCalled();

      unmount();
      await waitFor(() => {
        expect(cleanup).toHaveBeenCalledTimes(1);
      });
    });

    it("should call cleanup before dispose", async () => {
      const callOrder: string[] = [];

      const TestComponent = () => {
        useLifecycle({
          cleanup: () => callOrder.push("cleanup"),
          dispose: () => callOrder.push("dispose"),
        });
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      await waitFor(() => {
        expect(callOrder).toEqual(["cleanup", "dispose"]);
      });
    });
  });

  describe("dispose callback", () => {
    it("should call dispose on unmount", async () => {
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({ dispose });
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(dispose).not.toHaveBeenCalled();

      unmount();

      // dispose is deferred to microtask
      await waitFor(() => {
        expect(dispose).toHaveBeenCalledTimes(1);
      });
    });

    it("should defer dispose to microtask", async () => {
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
      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("should handle errors in dispose without crashing", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const dispose = vi.fn(() => {
        throw new Error("Test error");
      });

      const TestComponent = () => {
        useLifecycle({ dispose });
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Error in dispose callback:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("lifecycle order", () => {
    it("should execute all callbacks in correct order", async () => {
      const callOrder: string[] = [];

      const TestComponent = () => {
        useLifecycle({
          init: () => callOrder.push("init"),
          render: () => callOrder.push("render"),
          mount: () => callOrder.push("mount"),
          cleanup: () => callOrder.push("cleanup"),
          dispose: () => callOrder.push("dispose"),
        });
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);

      await waitFor(() => {
        expect(callOrder).toEqual(["init", "render", "mount"]);
      });

      unmount();

      await waitFor(() => {
        expect(callOrder).toEqual([
          "init",
          "render",
          "mount",
          "cleanup",
          "dispose",
        ]);
      });
    });
  });

  describe("callback updates", () => {
    it("should use latest callbacks on each call", async () => {
      let renderCount = 0;
      let mountCount = 0;

      const TestComponent = ({ id }: { id: number }) => {
        useLifecycle({
          render: () => {
            renderCount = id;
          },
          mount: () => {
            mountCount = id;
          },
        });
        return <div>{id}</div>;
      };

      const { rerender } = render(<TestComponent id={1} />);
      expect(renderCount).toBe(1);
      await waitFor(() => {
        expect(mountCount).toBe(1);
      });

      rerender(<TestComponent id={2} />);
      expect(renderCount).toBe(2);
      // mount doesn't run again
      expect(mountCount).toBe(1);
    });

    it("should use latest dispose callback", async () => {
      let disposeValue = 0;

      const TestComponent = ({ id }: { id: number }) => {
        useLifecycle({
          dispose: () => {
            disposeValue = id;
          },
        });
        return <div>{id}</div>;
      };

      const { rerender, unmount } = render(<TestComponent id={1} />);
      rerender(<TestComponent id={2} />);
      rerender(<TestComponent id={3} />);

      unmount();

      await waitFor(() => {
        expect(disposeValue).toBe(3); // Latest value
      });
    });
  });

  describe("no callbacks", () => {
    it("should work with no callbacks provided", () => {
      const TestComponent = () => {
        useLifecycle({});
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(() => unmount()).not.toThrow();
    });

    it("should work with empty options", () => {
      const TestComponent = () => {
        useLifecycle({});
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("partial callbacks", () => {
    it("should work with only init", () => {
      const init = vi.fn();

      const TestComponent = () => {
        useLifecycle({ init });
        return <div>test</div>;
      };

      render(<TestComponent />);
      expect(init).toHaveBeenCalledTimes(1);
    });

    it("should work with only dispose", async () => {
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({ dispose });
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      await waitFor(() => {
        expect(dispose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("multiple components", () => {
    it("should handle multiple components independently", async () => {
      const init1 = vi.fn();
      const init2 = vi.fn();
      const dispose1 = vi.fn();
      const dispose2 = vi.fn();

      const Component1 = () => {
        useLifecycle({ init: init1, dispose: dispose1 });
        return <div>1</div>;
      };

      const Component2 = () => {
        useLifecycle({ init: init2, dispose: dispose2 });
        return <div>2</div>;
      };

      const { unmount: unmount1 } = render(<Component1 />);
      const { unmount: unmount2 } = render(<Component2 />);

      expect(init1).toHaveBeenCalledTimes(1);
      expect(init2).toHaveBeenCalledTimes(1);

      unmount1();
      await waitFor(() => {
        expect(dispose1).toHaveBeenCalledTimes(1);
        expect(dispose2).not.toHaveBeenCalled();
      });

      unmount2();
      await waitFor(() => {
        expect(dispose2).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("error handling", () => {
    it("should handle errors in dispose callback gracefully", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const dispose = vi.fn(() => {
        throw new Error("Dispose error");
      });

      const TestComponent = () => {
        useLifecycle({ dispose });
        return <div>test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Error in dispose callback:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("object lifecycle (with 'for' option)", () => {
    it("should pass target to all callbacks", async () => {
      const user = { id: 1, name: "John" };
      const init = vi.fn();
      const mount = vi.fn();
      const renderCallback = vi.fn();
      const cleanup = vi.fn();
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({
          for: user,
          init,
          mount,
          render: renderCallback,
          cleanup,
          dispose,
        });
        return <div>test</div>;
      };

      render(<TestComponent />);

      expect(init).toHaveBeenCalledWith(user);
      expect(renderCallback).toHaveBeenCalledWith(user);

      await waitFor(() => {
        expect(mount).toHaveBeenCalledWith(user);
      });
    });

    it("should call init and mount for initial target", async () => {
      const user = { id: 1, name: "John" };
      const init = vi.fn();
      const mount = vi.fn();

      const TestComponent = () => {
        useLifecycle({
          for: user,
          init,
          mount,
        });
        return <div>{user.name}</div>;
      };

      render(<TestComponent />);

      expect(init).toHaveBeenCalledWith(user);
      expect(init).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(mount).toHaveBeenCalledWith(user);
        expect(mount).toHaveBeenCalledTimes(1);
      });
    });

    it("should dispose old target and init new target when reference changes", async () => {
      const user1 = { id: 1, name: "John" };
      const user2 = { id: 2, name: "Jane" };
      const init = vi.fn();
      const mount = vi.fn();
      const cleanup = vi.fn();
      const dispose = vi.fn();

      const TestComponent = ({ user }: { user: typeof user1 }) => {
        useLifecycle({
          for: user,
          init,
          mount,
          cleanup,
          dispose,
        });
        return <div>{user.name}</div>;
      };

      const { rerender } = render(<TestComponent user={user1} />);

      expect(init).toHaveBeenCalledWith(user1);
      await waitFor(() => {
        expect(mount).toHaveBeenCalledWith(user1);
      });

      // Change target
      rerender(<TestComponent user={user2} />);

      // Old target should be disposed
      expect(cleanup).toHaveBeenCalledWith(user1);
      expect(dispose).toHaveBeenCalledWith(user1);

      // New target should be initialized
      expect(init).toHaveBeenCalledWith(user2);
      expect(init).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(mount).toHaveBeenCalledWith(user2);
        expect(mount).toHaveBeenCalledTimes(2);
      });
    });

    it("should call render with current target on every render", () => {
      const user1 = { id: 1, name: "John" };
      const user2 = { id: 2, name: "Jane" };
      const renderCallback = vi.fn();

      const TestComponent = ({ user }: { user: typeof user1 }) => {
        useLifecycle({
          for: user,
          render: renderCallback,
        });
        return <div>{user.name}</div>;
      };

      const { rerender } = render(<TestComponent user={user1} />);

      expect(renderCallback).toHaveBeenCalledWith(user1);
      expect(renderCallback).toHaveBeenCalledTimes(1);

      rerender(<TestComponent user={user2} />);

      expect(renderCallback).toHaveBeenCalledWith(user2);
      expect(renderCallback).toHaveBeenCalledTimes(2);
    });

    it("should execute lifecycle in correct order for target changes", async () => {
      const user1 = { id: 1, name: "John" };
      const user2 = { id: 2, name: "Jane" };
      const callOrder: string[] = [];

      const TestComponent = ({ user }: { user: typeof user1 }) => {
        useLifecycle({
          for: user,
          init: (u) => callOrder.push(`init-${u.id}`),
          mount: (u) => callOrder.push(`mount-${u.id}`),
          render: (u) => callOrder.push(`render-${u.id}`),
          cleanup: (u) => callOrder.push(`cleanup-${u.id}`),
          dispose: (u) => callOrder.push(`dispose-${u.id}`),
        });
        return <div>{user.name}</div>;
      };

      const { rerender } = render(<TestComponent user={user1} />);

      await waitFor(() => {
        expect(callOrder).toEqual(["init-1", "render-1", "mount-1"]);
      });

      callOrder.length = 0; // Clear
      rerender(<TestComponent user={user2} />);

      await waitFor(() => {
        // React's actual lifecycle order:
        // 1. Render phase: render(user2)
        // 2. Commit phase: cleanup(user1), dispose(user1), init(user2), mount(user2)
        expect(callOrder).toEqual([
          "render-2",
          "cleanup-1",
          "dispose-1",
          "init-2",
          "mount-2",
        ]);
      });
    });

    it("should dispose current target on component unmount", async () => {
      const user = { id: 1, name: "John" };
      const cleanup = vi.fn();
      const dispose = vi.fn();

      const TestComponent = () => {
        useLifecycle({
          for: user,
          cleanup,
          dispose,
        });
        return <div>{user.name}</div>;
      };

      const { unmount } = render(<TestComponent />);

      unmount();

      await waitFor(() => {
        expect(cleanup).toHaveBeenCalledWith(user);
        expect(dispose).toHaveBeenCalledWith(user);
      });
    });

    it("should not re-run lifecycle if target reference stays same", async () => {
      const user = { id: 1, name: "John" };
      const init = vi.fn();
      const mount = vi.fn();
      const cleanup = vi.fn();
      const dispose = vi.fn();

      const TestComponent = ({ count }: { count: number }) => {
        useLifecycle({
          for: user, // Same reference
          init,
          mount,
          cleanup,
          dispose,
        });
        return <div>{count}</div>;
      };

      const { rerender } = render(<TestComponent count={1} />);

      await waitFor(() => {
        expect(init).toHaveBeenCalledTimes(1);
        expect(mount).toHaveBeenCalledTimes(1);
      });

      // Re-render with different prop but same target
      rerender(<TestComponent count={2} />);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not re-run lifecycle
      expect(init).toHaveBeenCalledTimes(1);
      expect(mount).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();
      expect(dispose).not.toHaveBeenCalled();
    });

    it("should handle multiple target changes", async () => {
      const user1 = { id: 1, name: "John" };
      const user2 = { id: 2, name: "Jane" };
      const user3 = { id: 3, name: "Bob" };
      const init = vi.fn();
      const dispose = vi.fn();

      const TestComponent = ({ user }: { user: typeof user1 }) => {
        useLifecycle({
          for: user,
          init,
          dispose,
        });
        return <div>{user.name}</div>;
      };

      const { rerender } = render(<TestComponent user={user1} />);

      expect(init).toHaveBeenCalledWith(user1);

      rerender(<TestComponent user={user2} />);
      await waitFor(() => {
        expect(dispose).toHaveBeenCalledWith(user1);
        expect(init).toHaveBeenCalledWith(user2);
      });

      rerender(<TestComponent user={user3} />);
      await waitFor(() => {
        expect(dispose).toHaveBeenCalledWith(user2);
        expect(init).toHaveBeenCalledWith(user3);
      });

      expect(init).toHaveBeenCalledTimes(3);
      expect(dispose).toHaveBeenCalledTimes(2); // user1, user2 (not user3 yet)
    });

    it("should work with complex objects", async () => {
      const scope1 = { count: { value: 0 }, name: "scope1" };
      const scope2 = { count: { value: 10 }, name: "scope2" };
      const init = vi.fn();
      const dispose = vi.fn();

      const TestComponent = ({ scope }: { scope: typeof scope1 }) => {
        useLifecycle({
          for: scope,
          init: (s) => {
            init(s);
            s.count.value++;
          },
          dispose: (s) => {
            dispose(s);
            s.count.value--;
          },
        });
        return <div>{scope.name}</div>;
      };

      const { rerender } = render(<TestComponent scope={scope1} />);

      expect(init).toHaveBeenCalledWith(scope1);
      expect(scope1.count.value).toBe(1);

      rerender(<TestComponent scope={scope2} />);

      await waitFor(() => {
        expect(dispose).toHaveBeenCalledWith(scope1);
        expect(init).toHaveBeenCalledWith(scope2);
        expect(scope1.count.value).toBe(0); // Decremented on dispose
        expect(scope2.count.value).toBe(11); // Incremented on init
      });
    });
  });
});
