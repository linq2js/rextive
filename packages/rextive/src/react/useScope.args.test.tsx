import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useScope, __clearCache } from "./useScope";
import { signal } from "../signal";

describe("useScope with args", () => {
  afterEach(() => {
    __clearCache();
  });

  describe("basic functionality", () => {
    it("should pass args to factory function", () => {
      const factory = vi.fn((a: number, b: string) => {
        const count = signal(a);
        return { count, label: b };
      });

      function TestComponent() {
        const scope = useScope("test", factory, [42, "test"]);
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
        const scope = useScope("user", factory, [userId]);
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

      function TestComponent({
        userId,
        count,
      }: {
        userId: number;
        count: number;
      }) {
        const scope = useScope("user", factory, [userId]);
        return (
          <div>
            {scope.data()} - {count}
          </div>
        );
      }

      const { rerender } = render(<TestComponent userId={1} count={0} />);

      expect(factory).toHaveBeenCalledOnce();

      // Change count but not userId
      rerender(<TestComponent userId={1} count={1} />);

      // Factory should not be called again
      expect(factory).toHaveBeenCalledOnce();
    });

    it("should support multiple args with different types", () => {
      const factory = vi.fn(
        (id: number, name: string, enabled: boolean, data: { x: number }) => {
          const count = signal(id);
          return { count, name, enabled, data };
        }
      );

      function TestComponent() {
        const scope = useScope("multi", factory, [42, "test", true, { x: 10 }]);
        return <div>{scope.count()}</div>;
      }

      render(<TestComponent />);

      expect(factory).toHaveBeenCalledWith(42, "test", true, { x: 10 });
    });
  });

  describe("type safety", () => {
    it("should enforce args match factory params", () => {
      function TestComponent() {
        // This should work
        const scope1 = useScope(
          "correct",
          (a: number, b: string) => {
            const count = signal(a);
            return { count, label: b };
          },
          [42, "test"] // ✅ Correct types
        );

        const scope2 = useScope(
          "wrong",
          // @ts-expect-error - Wrong types
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
    it("should work with single arg", () => {
      const factory = vi.fn((userId: number) => {
        const data = signal(userId);
        return { data };
      });

      function TestComponent() {
        const scope = useScope("single", factory, [42]);
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
        const scope = useScope("config", factory, [config]);
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
        const scope = useScope("objRef", factory, [config]);
        return <div>{scope.data()}</div>;
      }

      const { rerender } = render(<TestComponent config={{ id: 1 }} />);
      expect(factory).toHaveBeenCalledTimes(1);

      // New object reference (even with same value)
      rerender(<TestComponent config={{ id: 1 }} />);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should use custom equals for object comparison", () => {
      const factory = vi.fn((config: { id: number }) => {
        const data = signal(config.id);
        return { data };
      });

      function TestComponent({ config }: { config: { id: number } }) {
        const scope = useScope("customEquals", factory, [config], {
          equals: (a, b) =>
            (a as { id: number }).id === (b as { id: number }).id,
        });
        return <div>{scope.data()}</div>;
      }

      const { rerender } = render(<TestComponent config={{ id: 1 }} />);
      expect(factory).toHaveBeenCalledTimes(1);

      // New object reference but same id - should NOT recreate
      rerender(<TestComponent config={{ id: 1 }} />);
      expect(factory).toHaveBeenCalledTimes(1);

      // Different id - should recreate
      rerender(<TestComponent config={{ id: 2 }} />);
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("real-world example", () => {
    it("should work with user data fetching pattern", () => {
      const fetchUser = vi.fn((userId: number, filter: string) => ({
        id: userId,
        name: `User ${userId}`,
        filter,
      }));

      function TestComponent({
        userId,
        filter,
      }: {
        userId: number;
        filter: string;
      }) {
        const scope = useScope(
          "userData",
          (userId, filter) => {
            const userData = signal(fetchUser(userId, filter));
            return { userData };
          },
          [userId, filter]
        );

        const user = scope.userData();
        return (
          <div>
            {user.name} - {user.filter}
          </div>
        );
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
