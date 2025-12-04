import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useScope } from "./useScope";
import { signal } from "../index";

describe("useScope with args overload", () => {
  describe("basic functionality", () => {
    it("should pass args to factory function", () => {
      const factory = vi.fn((a: number, b: string) => {
        const count = signal(a);
        return { count, label: b };
      });

      function TestComponent() {
        const scope = useScope(factory, [42, "test"]);
        return <div>{scope.count()}</div>;
      }

      render(<TestComponent />);

      expect(factory).toHaveBeenCalledWith(42, "test");
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("should recreate scope when args change", () => {
      const factory = vi.fn((userId: number) => {
        const data = signal(`user-${userId}`);
        return { data };
      });

      function TestComponent({ userId }: { userId: number }) {
        const scope = useScope(factory, [userId]);
        return <div>{scope.data()}</div>;
      }

      const { rerender } = render(<TestComponent userId={1} />);

      expect(factory).toHaveBeenCalledWith(1);
      expect(screen.getByText("user-1")).toBeInTheDocument();

      // Change args
      rerender(<TestComponent userId={2} />);

      expect(factory).toHaveBeenCalledWith(2);
      expect(factory).toHaveBeenCalledTimes(2);
      expect(screen.getByText("user-2")).toBeInTheDocument();
    });

    it("should not recreate scope when args stay same", () => {
      const factory = vi.fn((userId: number) => {
        const data = signal(`user-${userId}`);
        return { data };
      });

      function TestComponent({ userId, count }: { userId: number; count: number }) {
        const scope = useScope(factory, [userId]);
        return <div>{scope.data()} - {count}</div>;
      }

      const { rerender } = render(<TestComponent userId={1} count={0} />);

      expect(factory).toHaveBeenCalledOnce();

      // Change count but not userId
      rerender(<TestComponent userId={1} count={1} />);

      // Factory should not be called again
      expect(factory).toHaveBeenCalledOnce();
    });

    it("should support multiple args with different types", () => {
      const factory = vi.fn((id: number, name: string, enabled: boolean, data: { x: number }) => {
        const count = signal(id);
        return { count, name, enabled, data };
      });

      function TestComponent() {
        const scope = useScope(factory, [42, "test", true, { x: 10 }]);
        return <div>{scope.count()}</div>;
      }

      render(<TestComponent />);

      expect(factory).toHaveBeenCalledWith(42, "test", true, { x: 10 });
    });
  });

  describe("with lifecycle options", () => {
    it("should work with init callback", () => {
      const init = vi.fn();

      function TestComponent({ userId }: { userId: number }) {
        const scope = useScope(
          (userId) => {
            const data = signal(userId);
            return { data };
          },
          [userId],
          { init }
        );
        return <div>{scope.data()}</div>;
      }

      render(<TestComponent userId={1} />);

      // Scope is returned as-is (not wrapped with disposable())
      // Disposal handles: signals created inside factory + scope's dispose method
      expect(init).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.any(Function) })
      );
    });

    it("should work with mount callback", async () => {
      const mount = vi.fn();

      function TestComponent({ userId }: { userId: number }) {
        const scope = useScope(
          (userId) => {
            const data = signal(userId);
            return { data };
          },
          [userId],
          { mount }
        );
        return <div>{scope.data()}</div>;
      }

      render(<TestComponent userId={1} />);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mount).toHaveBeenCalled();
    });

    it("should work with update callback", async () => {
      const update = vi.fn();

      function TestComponent({ userId }: { userId: number }) {
        const scope = useScope(
          (userId) => {
            const data = signal(userId);
            return { data };
          },
          [userId],
          { update }
        );
        return <div>{scope.data()}</div>;
      }

      render(<TestComponent userId={1} />);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(update).toHaveBeenCalled();
    });

    it("should work with cleanup and dispose", async () => {
      const cleanup = vi.fn();
      const dispose = vi.fn();

      function TestComponent({ userId }: { userId: number }) {
        const scope = useScope(
          (userId) => {
            const data = signal(userId);
            return { data };
          },
          [userId],
          { cleanup, dispose }
        );
        return <div>{scope.data()}</div>;
      }

      const { unmount } = render(<TestComponent userId={1} />);

      unmount();

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(cleanup).toHaveBeenCalled();
      expect(dispose).toHaveBeenCalled();
    });

    it("should call dispose when args change", async () => {
      const dispose = vi.fn();

      function TestComponent({ userId }: { userId: number }) {
        const scope = useScope(
          (userId) => {
            const data = signal(userId);
            return { data };
          },
          [userId],
          { dispose }
        );
        return <div>{scope.data()}</div>;
      }

      const { rerender } = render(<TestComponent userId={1} />);

      // Change userId
      rerender(<TestComponent userId={2} />);

      await new Promise((resolve) => setTimeout(resolve, 10));
      // Old scope should be disposed
      expect(dispose).toHaveBeenCalled();
    });
  });

  describe("type safety", () => {
    it("should enforce args match factory params", () => {
      function TestComponent() {
        // This should work
        const scope1 = useScope(
          (a: number, b: string) => {
            const count = signal(a);
            return { count, label: b };
          },
          [42, "test"] // ✅ Correct types
        );

        // @ts-expect-error - Wrong types
        const scope2 = useScope(
          (a: number, b: string) => {
            const count = signal(a);
            return { count, label: b };
          },
          ["wrong", 42] // ❌ Wrong types (should error)
        );

        return <div>{scope1.count()}</div>;
      }

      render(<TestComponent />);
    });
  });

  describe("edge cases", () => {
    it("should work with empty args array", () => {
      const factory = vi.fn(() => {
        const count = signal(0);
        return { count };
      });

      function TestComponent() {
        const scope = useScope(factory, []);
        return <div>{scope.count()}</div>;
      }

      render(<TestComponent />);

      expect(factory).toHaveBeenCalledWith();
      expect(factory).toHaveBeenCalledOnce();
    });

    it("should work with single arg", () => {
      const factory = vi.fn((userId: number) => {
        const data = signal(userId);
        return { data };
      });

      function TestComponent() {
        const scope = useScope(factory, [42]);
        return <div>{scope.data()}</div>;
      }

      render(<TestComponent />);

      expect(factory).toHaveBeenCalledWith(42);
    });

    it("should handle complex object args", () => {
      interface Config {
        id: number;
        settings: {
          enabled: boolean;
          name: string;
        };
      }

      const factory = vi.fn((config: Config) => {
        const data = signal(config);
        return { data };
      });

      const config = {
        id: 1,
        settings: { enabled: true, name: "test" },
      };

      function TestComponent() {
        const scope = useScope(factory, [config]);
        return <div>{scope.data().id}</div>;
      }

      render(<TestComponent />);

      expect(factory).toHaveBeenCalledWith(config);
    });

    it("should recreate scope when object arg reference changes", () => {
      const factory = vi.fn((config: { id: number }) => {
        const data = signal(config.id);
        return { data };
      });

      function TestComponent({ config }: { config: { id: number } }) {
        const scope = useScope(factory, [config]);
        return <div>{scope.data()}</div>;
      }

      const { rerender } = render(<TestComponent config={{ id: 1 }} />);
      expect(factory).toHaveBeenCalledTimes(1);

      // New object reference (even with same value)
      rerender(<TestComponent config={{ id: 1 }} />);
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("comparison with watch option", () => {
    it("args mode is more type-safe than watch mode", () => {
      function TestComponent({ userId, filter }: { userId: number; filter: string }) {
        // ✅ Args mode: type-safe, args match factory params
        const scope1 = useScope(
          (userId, filter) => {
            const data = signal(`${userId}-${filter}`);
            return { data };
          },
          [userId, filter]
        );

        // ❌ Watch mode: easy to forget to update watch when using new variables
        const scope2 = useScope(
          () => {
            // Using userId and filter from closure
            const data = signal(`${userId}-${filter}`);
            return { data };
          },
          { watch: [userId, filter] } // Must remember to add to watch
        );

        return <div>{scope1.data()}</div>;
      }

      render(<TestComponent userId={1} filter="test" />);
    });
  });

  describe("real-world example", () => {
    it("should work with user data fetching pattern", () => {
      const fetchUser = vi.fn((userId: number, filter: string) => ({
        id: userId,
        name: `User ${userId}`,
        filter,
      }));

      function TestComponent({ userId, filter }: { userId: number; filter: string }) {
        const scope = useScope(
          (userId, filter) => {
            const userData = signal(fetchUser(userId, filter));
            return { userData };
          },
          [userId, filter]
        );
        
        const user = scope.userData();
        return <div>{user.name} - {user.filter}</div>;
      }

      const { rerender } = render(<TestComponent userId={1} filter="active" />);
      
      expect(screen.getByText("User 1 - active")).toBeInTheDocument();
      expect(fetchUser).toHaveBeenCalledWith(1, "active");

      // Change filter
      rerender(<TestComponent userId={1} filter="inactive" />);
      
      expect(screen.getByText("User 1 - inactive")).toBeInTheDocument();
      expect(fetchUser).toHaveBeenCalledWith(1, "inactive");
      expect(fetchUser).toHaveBeenCalledTimes(2);
    });
  });
});

