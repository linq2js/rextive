import { describe, expect, it, vi } from "vitest";
import { producer } from "./producer";
import { Disposable } from "../types";

describe("producer", () => {
  describe("current()", () => {
    it("should create value on first call", () => {
      const factory = vi.fn(() => ({ value: 42 }));
      const p = producer(factory);

      expect(factory).not.toHaveBeenCalled();

      const result = p.current();
      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ value: 42 });
    });

    it("should return same instance on subsequent calls", () => {
      let counter = 0;
      const factory = () => ({ id: ++counter });
      const p = producer(factory);

      const first = p.current();
      const second = p.current();
      const third = p.current();

      expect(first).toBe(second);
      expect(second).toBe(third);
      expect(first.id).toBe(1);
    });

    it("should recreate after dispose", () => {
      let counter = 0;
      const factory = () => ({ id: ++counter });
      const p = producer(factory);

      const first = p.current();
      expect(first.id).toBe(1);

      p.dispose();

      const second = p.current();
      expect(second.id).toBe(2);
      expect(second).not.toBe(first);
    });
  });

  describe("next()", () => {
    it("should create new value", () => {
      let counter = 0;
      const factory = () => ({ id: ++counter });
      const p = producer(factory);

      const first = p.next();
      const second = p.next();

      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
    });

    it("should dispose previous value before creating new one", () => {
      const disposeOrder: string[] = [];
      const createOrder: string[] = [];

      class TrackedResource implements Disposable {
        constructor(public id: number) {
          createOrder.push(`create-${id}`);
        }
        dispose() {
          disposeOrder.push(`dispose-${this.id}`);
        }
      }

      let counter = 0;
      const p = producer(() => new TrackedResource(++counter));

      p.next(); // Create #1
      expect(createOrder).toEqual(["create-1"]);
      expect(disposeOrder).toEqual([]);

      p.next(); // Dispose #1, Create #2
      expect(disposeOrder).toEqual(["dispose-1"]);
      expect(createOrder).toEqual(["create-1", "create-2"]);

      p.next(); // Dispose #2, Create #3
      expect(disposeOrder).toEqual(["dispose-1", "dispose-2"]);
      expect(createOrder).toEqual(["create-1", "create-2", "create-3"]);
    });

    it("should work without previous value", () => {
      let counter = 0;
      const factory = () => ({ id: ++counter });
      const p = producer(factory);

      // next() without calling current() first
      const result = p.next();
      expect(result.id).toBe(1);
    });
  });

  describe("dispose()", () => {
    it("should dispose current value", () => {
      const dispose = vi.fn();
      const p = producer(() => ({ dispose }));

      p.current();
      expect(dispose).not.toHaveBeenCalled();

      p.dispose();
      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("should do nothing if no current value", () => {
      const factory = vi.fn(() => ({}));
      const p = producer(factory);

      // dispose() without calling current() first
      p.dispose();
      expect(factory).not.toHaveBeenCalled();
    });

    it("should allow multiple dispose calls safely", () => {
      const dispose = vi.fn();
      const p = producer(() => ({ dispose }));

      p.current();
      p.dispose();
      p.dispose();
      p.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("should handle dispose arrays", () => {
      const dispose1 = vi.fn();
      const dispose2 = vi.fn();

      const p = producer(() => ({
        dispose: [{ dispose: dispose1 }, { dispose: dispose2 }],
      }));

      p.current();
      p.dispose();

      expect(dispose1).toHaveBeenCalledTimes(1);
      expect(dispose2).toHaveBeenCalledTimes(1);
    });
  });

  describe("has()", () => {
    it("should return false before creation", () => {
      const p = producer(() => ({}));
      expect(p.has()).toBe(false);
    });

    it("should return true after creation", () => {
      const p = producer(() => ({}));
      p.current();
      expect(p.has()).toBe(true);
    });

    it("should return false after dispose", () => {
      const p = producer(() => ({}));
      p.current();
      expect(p.has()).toBe(true);
      p.dispose();
      expect(p.has()).toBe(false);
    });

    it("should not trigger creation", () => {
      const factory = vi.fn(() => ({}));
      const p = producer(factory);

      p.has();
      p.has();
      p.has();

      expect(factory).not.toHaveBeenCalled();
    });
  });

  describe("peek()", () => {
    it("should return undefined before creation", () => {
      const p = producer(() => ({ value: 42 }));
      expect(p.peek()).toBeUndefined();
    });

    it("should return current value after creation", () => {
      const p = producer(() => ({ value: 42 }));
      p.current();
      expect(p.peek()).toEqual({ value: 42 });
    });

    it("should return undefined after dispose", () => {
      const p = producer(() => ({ value: 42 }));
      p.current();
      expect(p.peek()).toEqual({ value: 42 });
      p.dispose();
      expect(p.peek()).toBeUndefined();
    });

    it("should not trigger creation", () => {
      const factory = vi.fn(() => ({}));
      const p = producer(factory);

      p.peek();
      p.peek();
      p.peek();

      expect(factory).not.toHaveBeenCalled();
    });
  });

  describe("real-world usage", () => {
    it("should work with AbortController", () => {
      const abortProducer = producer(() => new AbortController());

      const controller1 = abortProducer.current();
      expect(controller1.signal.aborted).toBe(false);

      // Simulate calling next() (AbortController doesn't have dispose)
      const controller2 = abortProducer.next();
      expect(controller2).not.toBe(controller1);
      expect(controller2.signal.aborted).toBe(false);
    });

    it("should handle factory that returns primitives", () => {
      let counter = 0;
      const p = producer(() => ++counter);

      expect(p.current()).toBe(1);
      expect(p.current()).toBe(1);
      expect(p.next()).toBe(2);
      expect(p.current()).toBe(2);
    });

    it("should handle factory that returns null/undefined", () => {
      const p = producer(() => null);

      const result = p.current();
      expect(result).toBeNull();
      expect(p.has()).toBe(true);
    });
  });
});

