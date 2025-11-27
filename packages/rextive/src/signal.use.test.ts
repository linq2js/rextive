import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "./index";
import type { GroupPlugin } from "./types";

describe("signal.use", () => {
  describe("basic functionality", () => {
    it("should execute group plugin with all signals", () => {
      const count = signal(0);
      const name = signal("Alice");

      let receivedSignals: any;
      const plugin: GroupPlugin<typeof signals> = (sigs) => {
        receivedSignals = sigs;
      };

      const signals = { count, name };
      signal.use(signals, [plugin]);

      expect(receivedSignals).toBe(signals);
      expect(receivedSignals.count()).toBe(0);
      expect(receivedSignals.name()).toBe("Alice");

      count.dispose();
      name.dispose();
    });

    it("should execute multiple plugins in order", () => {
      const count = signal(0);
      const callOrder: number[] = [];

      const plugin1: GroupPlugin<{ count: typeof count }> = () => {
        callOrder.push(1);
      };
      const plugin2: GroupPlugin<{ count: typeof count }> = () => {
        callOrder.push(2);
      };
      const plugin3: GroupPlugin<{ count: typeof count }> = () => {
        callOrder.push(3);
      };

      signal.use({ count }, [plugin1, plugin2, plugin3]);

      expect(callOrder).toEqual([1, 2, 3]);
      count.dispose();
    });

    it("should return cleanup function", () => {
      const count = signal(0);
      const cleanup = signal.use({ count }, []);

      expect(typeof cleanup).toBe("function");
      count.dispose();
    });

    it("should handle empty plugins array", () => {
      const count = signal(0);
      const cleanup = signal.use({ count }, []);

      expect(() => cleanup()).not.toThrow();
      count.dispose();
    });
  });

  describe("cleanup behavior", () => {
    it("should execute plugin cleanups when combined cleanup is called", () => {
      const count = signal(0);
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      const plugin1: GroupPlugin<{ count: typeof count }> = () => cleanup1;
      const plugin2: GroupPlugin<{ count: typeof count }> = () => cleanup2;

      const combinedCleanup = signal.use({ count }, [plugin1, plugin2]);

      expect(cleanup1).not.toHaveBeenCalled();
      expect(cleanup2).not.toHaveBeenCalled();

      combinedCleanup();

      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();

      count.dispose();
    });

    it("should execute cleanups in reverse order (LIFO)", () => {
      const count = signal(0);
      const callOrder: number[] = [];

      const plugin1: GroupPlugin<{ count: typeof count }> = () => () =>
        callOrder.push(1);
      const plugin2: GroupPlugin<{ count: typeof count }> = () => () =>
        callOrder.push(2);
      const plugin3: GroupPlugin<{ count: typeof count }> = () => () =>
        callOrder.push(3);

      const cleanup = signal.use({ count }, [plugin1, plugin2, plugin3]);
      cleanup();

      expect(callOrder).toEqual([3, 2, 1]); // Reverse order

      count.dispose();
    });

    it("should handle plugins without cleanup", () => {
      const count = signal(0);
      const plugin: GroupPlugin<{ count: typeof count }> = () => {
        // No cleanup returned
      };

      const cleanup = signal.use({ count }, [plugin]);
      expect(() => cleanup()).not.toThrow();

      count.dispose();
    });

    it("should continue cleanup even if one throws", () => {
      const count = signal(0);
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn(() => {
        throw new Error("Cleanup error");
      });
      const cleanup3 = vi.fn();

      const plugin1: GroupPlugin<{ count: typeof count }> = () => cleanup1;
      const plugin2: GroupPlugin<{ count: typeof count }> = () => cleanup2;
      const plugin3: GroupPlugin<{ count: typeof count }> = () => cleanup3;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const combinedCleanup = signal.use({ count }, [plugin1, plugin2, plugin3]);
      combinedCleanup();

      // All cleanups should be called despite error (reverse order)
      expect(cleanup3).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
      expect(cleanup1).toHaveBeenCalledOnce();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      count.dispose();
    });
  });

  describe("error handling", () => {
    it("should clean up previous plugins if one throws during application", () => {
      const count = signal(0);
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      const plugin1: GroupPlugin<{ count: typeof count }> = () => cleanup1;
      const plugin2: GroupPlugin<{ count: typeof count }> = () => cleanup2;
      const errorPlugin: GroupPlugin<{ count: typeof count }> = () => {
        throw new Error("Plugin error");
      };

      expect(() =>
        signal.use({ count }, [plugin1, plugin2, errorPlugin])
      ).toThrow("Plugin error");

      // Previous cleanups should have been called
      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();

      count.dispose();
    });

    it("should ignore cleanup errors during error handling rollback", () => {
      const count = signal(0);
      const cleanup1 = vi.fn(() => {
        throw new Error("Cleanup 1 error");
      });
      const cleanup2 = vi.fn(() => {
        throw new Error("Cleanup 2 error");
      });

      const plugin1: GroupPlugin<{ count: typeof count }> = () => cleanup1;
      const plugin2: GroupPlugin<{ count: typeof count }> = () => cleanup2;
      const errorPlugin: GroupPlugin<{ count: typeof count }> = () => {
        throw new Error("Plugin error");
      };

      // Should throw original error, not cleanup errors
      expect(() =>
        signal.use({ count }, [plugin1, plugin2, errorPlugin])
      ).toThrow("Plugin error");

      // All cleanups should still have been attempted
      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();

      count.dispose();
    });
  });

  describe("real-world use cases", () => {
    it("should support group logger plugin", () => {
      const count = signal(0);
      const name = signal("Alice");
      const logs: string[] = [];

      const groupLogger: GroupPlugin<{ count: typeof count; name: typeof name }> =
        (signals) => {
          const unsubs = Object.entries(signals).map(([key, sig]) =>
            sig.on(() => logs.push(`[${key}] ${sig()}`))
          );
          return () => unsubs.forEach((fn) => fn());
        };

      const cleanup = signal.use({ count, name }, [groupLogger]);

      count.set(1);
      name.set("Bob");
      count.set(2);

      expect(logs).toEqual(["[count] 1", "[name] Bob", "[count] 2"]);

      cleanup();

      // After cleanup, no more logs
      count.set(3);
      expect(logs).toEqual(["[count] 1", "[name] Bob", "[count] 2"]);

      count.dispose();
      name.dispose();
    });

    it("should support coordinated persistence plugin", () => {
      const count = signal(0);
      const name = signal("Alice");
      const savedData: any[] = [];

      const persistPlugin: GroupPlugin<{
        count: typeof count;
        name: typeof name;
      }> = (signals) => {
        const save = () => {
          savedData.push({
            count: signals.count(),
            name: signals.name(),
          });
        };
        const unsubs = Object.values(signals).map((s) => s.on(save));
        return () => unsubs.forEach((fn) => fn());
      };

      const cleanup = signal.use({ count, name }, [persistPlugin]);

      count.set(1);
      expect(savedData).toEqual([{ count: 1, name: "Alice" }]);

      name.set("Bob");
      expect(savedData).toEqual([
        { count: 1, name: "Alice" },
        { count: 1, name: "Bob" },
      ]);

      cleanup();
      count.dispose();
      name.dispose();
    });

    it("should support form validation plugin", () => {
      const email = signal("");
      const password = signal("");
      const errors = signal<Record<string, string>>({});

      const validationPlugin: GroupPlugin<{
        email: typeof email;
        password: typeof password;
        errors: typeof errors;
      }> = (signals) => {
        const validate = () => {
          const newErrors: Record<string, string> = {};

          if (!signals.email().includes("@")) {
            newErrors.email = "Invalid email";
          }
          if (signals.password().length < 8) {
            newErrors.password = "Password too short";
          }

          signals.errors.set(newErrors);
        };

        const unsubs = [signals.email.on(validate), signals.password.on(validate)];

        return () => unsubs.forEach((fn) => fn());
      };

      const cleanup = signal.use(
        { email, password, errors },
        [validationPlugin]
      );

      expect(errors()).toEqual({});

      email.set("invalid");
      expect(errors()).toEqual({
        email: "Invalid email",
        password: "Password too short",
      });

      email.set("valid@email.com");
      expect(errors()).toEqual({ password: "Password too short" });

      password.set("longpassword");
      expect(errors()).toEqual({});

      cleanup();
      email.dispose();
      password.dispose();
      errors.dispose();
    });

    it("should support multiple plugins working together", () => {
      const count = signal(0);
      const history: number[] = [];
      const logs: string[] = [];

      const historyPlugin: GroupPlugin<{ count: typeof count }> = (signals) => {
        return signals.count.on(() => {
          history.push(signals.count());
        });
      };

      const loggerPlugin: GroupPlugin<{ count: typeof count }> = (signals) => {
        return signals.count.on(() => {
          logs.push(`Value: ${signals.count()}`);
        });
      };

      const cleanup = signal.use({ count }, [historyPlugin, loggerPlugin]);

      count.set(1);
      count.set(2);
      count.set(3);

      expect(history).toEqual([1, 2, 3]);
      expect(logs).toEqual(["Value: 1", "Value: 2", "Value: 3"]);

      cleanup();
      count.dispose();
    });
  });

  describe("type safety", () => {
    it("should infer signal types from the signals object", () => {
      const count = signal(0);
      const name = signal("Alice");
      const enabled = signal(true);

      const plugin: GroupPlugin<{
        count: typeof count;
        name: typeof name;
        enabled: typeof enabled;
      }> = (signals) => {
        // Type should be inferred correctly
        const c: number = signals.count();
        const n: string = signals.name();
        const e: boolean = signals.enabled();

        expect(typeof c).toBe("number");
        expect(typeof n).toBe("string");
        expect(typeof e).toBe("boolean");
      };

      signal.use({ count, name, enabled }, [plugin]);

      count.dispose();
      name.dispose();
      enabled.dispose();
    });
  });
});

