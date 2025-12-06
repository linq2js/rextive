import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { tag } from "./tag";

describe("createMutableSignal", () => {
  describe("fallback error handling", () => {
    it("should use fallback when lazy initialization throws", () => {
      const sig = signal(
        () => {
          throw new Error("Error");
        },
        {
          fallback: () => 42,
        }
      );

      // Should use fallback value
      expect(sig()).toBe(42);
    });
  });

  describe("tags integration", () => {
    it("should register mutable signal with tags", () => {
      const myTag = tag<number>();

      const sig = signal(1, {
        use: [myTag],
      });

      // Should be tracked by tag
      expect(myTag.has(sig)).toBe(true);
      expect(myTag.size).toBe(1);
    });

    it("should unregister from tags on dispose", () => {
      const myTag = tag<number>();

      const sig = signal(1, {
        use: [myTag],
      });

      expect(myTag.has(sig)).toBe(true);

      // Dispose
      sig.dispose();

      expect(myTag.has(sig)).toBe(false);
      expect(myTag.size).toBe(0);
    });

    it("should handle multiple tags", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();

      const sig = signal(1, {
        use: [tag1, tag2],
      });

      expect(tag1.has(sig)).toBe(true);
      expect(tag2.has(sig)).toBe(true);

      sig.dispose();

      expect(tag1.has(sig)).toBe(false);
      expect(tag2.has(sig)).toBe(false);
    });
  });

  // .map() method removed - use select operator from rextive/op instead
  // .scan() method removed - use scan operator from rextive/op instead

  describe("eager initialization", () => {
    it("should compute immediately when lazy=false", () => {
      const computeFn = vi.fn(() => 42);

      const sig = signal(computeFn, { lazy: false });

      // Should have computed immediately
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(sig()).toBe(42);
      expect(computeFn).toHaveBeenCalledTimes(1); // Still once
    });

    it("should not compute when lazy=true (default)", () => {
      const computeFn = vi.fn(() => 42);

      const sig = signal(computeFn);

      // Should not have computed yet
      expect(computeFn).toHaveBeenCalledTimes(0);

      // Access triggers computation
      expect(sig()).toBe(42);
      expect(computeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("tuple property", () => {
    it("should return [signal, set] tuple for destructuring", () => {
      const countSignal = signal(0);
      const [count, setCount] = countSignal.tuple;

      // Signal should be the exact same instance
      expect(count).toBe(countSignal);

      // Read via destructured signal
      expect(count()).toBe(0);

      // Set via destructured setter
      setCount(5);
      expect(count()).toBe(5);
    });

    it("should work with semantic naming pattern", () => {
      interface Credentials {
        username: string;
        password: string;
      }

      const [loginRequest, login] = signal<Credentials | null>(null).tuple;

      // Initial state
      expect(loginRequest()).toBeNull();

      // Trigger login
      login({ username: "admin", password: "123" });
      expect(loginRequest()).toEqual({ username: "admin", password: "123" });
    });

    it("should preserve full signal capabilities on destructured signal", () => {
      const [count, setCount] = signal(0).tuple;
      const listener = vi.fn();

      // Can still use .on()
      count.on(listener);

      setCount(10);
      expect(listener).toHaveBeenCalled();

      // Can still use .to()
      const doubled = count.to((x) => x * 2);
      expect(doubled()).toBe(20);
    });

    it("should allow reset via signal method", () => {
      const [value, setValue] = signal(42).tuple;

      setValue(100);
      expect(value()).toBe(100);

      // Can still use signal methods
      value.reset();
      expect(value()).toBe(42);
    });

    it("setter should be simple value setter (not reducer)", () => {
      const [count, setCount] = signal(0).tuple;

      // Direct value setting works
      setCount(10);
      expect(count()).toBe(10);

      // For reducer, use signal.set() directly
      count.set((prev) => prev + 5);
      expect(count()).toBe(15);
    });
  });
});
