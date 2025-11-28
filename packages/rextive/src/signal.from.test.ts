/**
 * Tests for signal.from() - combine multiple signals into one
 */
import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";

describe("signal.from()", () => {
  describe("record overload - signal.from({ a, b, c })", () => {
    it("should create a computed signal from a record of signals", () => {
      const a = signal(1);
      const b = signal("hello");
      const c = signal(true);

      const combined = signal.from({ a, b, c });

      expect(combined()).toEqual({ a: 1, b: "hello", c: true });
    });

    it("should update when any dependency changes", () => {
      const x = signal(10);
      const y = signal(20);

      const combined = signal.from({ x, y });

      expect(combined()).toEqual({ x: 10, y: 20 });

      x.set(100);
      expect(combined()).toEqual({ x: 100, y: 20 });

      y.set(200);
      expect(combined()).toEqual({ x: 100, y: 200 });
    });

    it("should notify listeners when any dependency changes", () => {
      const a = signal(1);
      const b = signal(2);

      const combined = signal.from({ a, b });
      const listener = vi.fn();

      combined.on(listener);

      a.set(10);
      expect(listener).toHaveBeenCalledTimes(1);

      b.set(20);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should work with computed signals as inputs", () => {
      const count = signal(5);
      const doubled = signal({ count }, ({ deps }) => deps.count * 2);

      const combined = signal.from({ count, doubled });

      expect(combined()).toEqual({ count: 5, doubled: 10 });

      count.set(10);
      expect(combined()).toEqual({ count: 10, doubled: 20 });
    });

    it("should be a read-only computed signal", () => {
      const a = signal(1);
      const combined = signal.from({ a });

      // Should not have set method
      expect((combined as any).set).toBeUndefined();

      // Should have computed signal methods
      expect(typeof combined.pause).toBe("function");
      expect(typeof combined.resume).toBe("function");
    });

    it("should handle empty record", () => {
      const combined = signal.from({});
      expect(combined()).toEqual({});
    });

    it("should handle single signal record", () => {
      const value = signal(42);
      const combined = signal.from({ value });
      expect(combined()).toEqual({ value: 42 });
    });

    it("should preserve signal value types", () => {
      const num = signal(42);
      const str = signal("test");
      const arr = signal([1, 2, 3]);
      const obj = signal({ nested: true });

      const combined = signal.from({ num, str, arr, obj });
      const result = combined();

      expect(result.num).toBe(42);
      expect(result.str).toBe("test");
      expect(result.arr).toEqual([1, 2, 3]);
      expect(result.obj).toEqual({ nested: true });
    });
  });

  describe("tuple overload - signal.from([a, b, c])", () => {
    it("should create a computed signal from a tuple of signals", () => {
      const a = signal(1);
      const b = signal("hello");
      const c = signal(true);

      const combined = signal.from([a, b, c]);

      expect(combined()).toEqual([1, "hello", true]);
    });

    it("should update when any dependency changes", () => {
      const x = signal(10);
      const y = signal(20);

      const combined = signal.from([x, y]);

      expect(combined()).toEqual([10, 20]);

      x.set(100);
      expect(combined()).toEqual([100, 20]);

      y.set(200);
      expect(combined()).toEqual([100, 200]);
    });

    it("should notify listeners when any dependency changes", () => {
      const a = signal(1);
      const b = signal(2);

      const combined = signal.from([a, b]);
      const listener = vi.fn();

      combined.on(listener);

      a.set(10);
      expect(listener).toHaveBeenCalledTimes(1);

      b.set(20);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should work with computed signals as inputs", () => {
      const count = signal(5);
      const doubled = signal({ count }, ({ deps }) => deps.count * 2);

      const combined = signal.from([count, doubled]);

      expect(combined()).toEqual([5, 10]);

      count.set(10);
      expect(combined()).toEqual([10, 20]);
    });

    it("should be a read-only computed signal", () => {
      const a = signal(1);
      const combined = signal.from([a]);

      // Should not have set method
      expect((combined as any).set).toBeUndefined();

      // Should have computed signal methods
      expect(typeof combined.pause).toBe("function");
      expect(typeof combined.resume).toBe("function");
    });

    it("should handle empty tuple", () => {
      const combined = signal.from([]);
      expect(combined()).toEqual([]);
    });

    it("should handle single signal tuple", () => {
      const value = signal(42);
      const combined = signal.from([value]);
      expect(combined()).toEqual([42]);
    });

    it("should preserve tuple order", () => {
      const a = signal("first");
      const b = signal("second");
      const c = signal("third");

      const combined = signal.from([a, b, c]);
      const [first, second, third] = combined();

      expect(first).toBe("first");
      expect(second).toBe("second");
      expect(third).toBe("third");
    });

    it("should work with 2 signals", () => {
      const a = signal(1);
      const b = signal(2);

      const combined = signal.from([a, b]);
      expect(combined()).toEqual([1, 2]);
    });

    it("should work with 3 signals", () => {
      const a = signal(1);
      const b = signal(2);
      const c = signal(3);

      const combined = signal.from([a, b, c]);
      expect(combined()).toEqual([1, 2, 3]);
    });

    it("should work with many signals", () => {
      const signals = [
        signal(1),
        signal(2),
        signal(3),
        signal(4),
        signal(5),
      ];

      const combined = signal.from(signals);
      expect(combined()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("disposal", () => {
    it("should be disposable for record form", () => {
      const a = signal(1);
      const combined = signal.from({ a });

      expect(() => combined.dispose()).not.toThrow();
    });

    it("should be disposable for tuple form", () => {
      const a = signal(1);
      const combined = signal.from([a]);

      expect(() => combined.dispose()).not.toThrow();
    });
  });
});

