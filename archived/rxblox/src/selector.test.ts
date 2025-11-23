import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { effect } from "./effect";
import { disposable } from "./disposableDispatcher";
import { Selector } from "./types";

describe("selector", () => {
  describe("property key selector", () => {
    it("should select a property from an object", () => {
      const todo = signal({ title: "Hello", completed: false });
      const title = todo.select("title");

      expect(title()).toBe("Hello");
    });

    it("should update when selected property changes", () => {
      const todo = signal({ title: "Hello", completed: false });
      const title = todo.select("title");

      const listener = vi.fn();
      title.on(listener);

      todo.set({ title: "World", completed: false });

      expect(title()).toBe("World");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not update when other properties change", () => {
      const todo = signal({ title: "Hello", completed: false });
      const title = todo.select("title");

      const listener = vi.fn();
      title.on(listener);

      // Change only completed, not title
      todo.set({ title: "Hello", completed: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should work with peek()", () => {
      const todo = signal({ title: "Hello", completed: false });
      const title = todo.select("title");

      expect(title.peek()).toBe("Hello");

      todo.set({ title: "World", completed: false });
      expect(title.peek()).toBe("World");
    });
  });

  describe("function selector", () => {
    it("should select and transform a value", () => {
      const user = signal({ firstName: "John", lastName: "Doe" });
      const fullName = user.select((u) => `${u.firstName} ${u.lastName}`);

      expect(fullName()).toBe("John Doe");
    });

    it("should update when dependencies change", () => {
      const user = signal({ firstName: "John", lastName: "Doe" });
      const fullName = user.select((u) => `${u.firstName} ${u.lastName}`);

      const listener = vi.fn();
      fullName.on(listener);

      user.set({ firstName: "Jane", lastName: "Doe" });

      expect(fullName()).toBe("Jane Doe");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not update when result is the same", () => {
      const state = signal({ count: 0, name: "test" });
      const count = state.select((s) => s.count);

      const listener = vi.fn();
      count.on(listener);

      // Change name, but count stays the same
      state.set({ count: 0, name: "updated" });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("custom equality", () => {
    it("should use custom equality function", () => {
      const state = signal({ items: [1, 2, 3] });

      // Custom equality that checks array length only
      const itemCount = state.select(
        (s) => s.items,
        (a, b) => a.length === b.length
      );

      const listener = vi.fn();
      itemCount.on(listener);

      // Same length, should not notify
      state.set({ items: [4, 5, 6] });
      expect(listener).not.toHaveBeenCalled();

      // Different length, should notify
      state.set({ items: [1, 2] });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("reactivity integration", () => {
    it("should work with effects", () => {
      const todo = signal({ title: "Hello", completed: false });
      const title = todo.select("title");

      const effectFn = vi.fn();
      effect(() => {
        effectFn(title());
      });

      expect(effectFn).toHaveBeenCalledWith("Hello");
      expect(effectFn).toHaveBeenCalledTimes(1);

      todo.set({ title: "World", completed: false });

      expect(effectFn).toHaveBeenCalledWith("World");
      expect(effectFn).toHaveBeenCalledTimes(2);
    });

    it("should not trigger effect when selected value unchanged", () => {
      const todo = signal({ title: "Hello", completed: false });
      const title = todo.select("title");

      const effectFn = vi.fn();
      effect(() => {
        effectFn(title());
      });

      effectFn.mockClear();

      // Change completed, not title
      todo.set({ title: "Hello", completed: true });

      expect(effectFn).not.toHaveBeenCalled();
    });

    it("should work with computed signals", () => {
      const state = signal({ count: 5 });
      const count = state.select("count");
      const doubled = signal(() => count() * 2);

      expect(doubled()).toBe(10);

      state.set({ count: 10 });
      expect(doubled()).toBe(20);
    });
  });

  describe("error handling", () => {
    it("should cache and throw errors from selector", () => {
      const state = signal({ value: null as any });
      const prop = state.select((s) => s.value.nonexistent);

      expect(() => prop()).toThrow();
      expect(() => prop()).toThrow(); // Should throw cached error
    });

    it("should throw error with peek()", () => {
      const state = signal({ value: null as any });
      const prop = state.select((s) => s.value.nonexistent);

      expect(() => prop.peek()).toThrow();
    });

    it("should update error when selector succeeds after failure", () => {
      const state = signal({ value: null as any });
      const prop = state.select((s) => s.value.toString());

      expect(() => prop()).toThrow();

      // Fix the value
      state.set({ value: "works" });

      expect(prop()).toBe("works");
    });

    it("should still be readable after disposal (graceful degradation)", () => {
      const state = signal({ value: 42 });
      let selected: any;

      disposable(() => {
        selected = state.select("value");
      });

      // Selector remains readable with last value after disposal
      expect(selected()).toBe(42);
      expect(selected.peek()).toBe(42);
    });
  });

  describe("promise detection (dev mode)", () => {
    it("should throw error if selector returns promise-like", () => {
      const state = signal({ async: Promise.resolve(42) });
      const asyncValue = state.select("async");

      expect(() => asyncValue()).toThrow(/Selector/);
    });
  });

  describe("cleanup", () => {
    it("should resubscribe to parent when accessed after cleanup", () => {
      const state = signal({ value: 42 });
      let selected: any;

      disposable(() => {
        selected = state.select("value");
      });

      expect(selected()).toBe(42); // Still readable with cached value

      // After disposal, parent updates, then we access selector
      state.set({ value: 100 });

      // Selector resubscribes on access and gets new value
      expect(selected()).toBe(100);

      // And continues tracking
      state.set({ value: 200 });
      expect(selected()).toBe(200);
    });

    it("should cleanup subscriptions but remain usable (graceful degradation)", () => {
      const state = signal({ value: 42 });
      let selected: any;

      disposable(() => {
        selected = state.select("value");
        const listener = vi.fn();
        selected.on(listener);
      });

      // After cleanup, selector resubscribes on first access (graceful degradation)
      expect(selected()).toBe(42);

      // State changes are now tracked again
      state.set({ value: 100 });
      expect(selected()).toBe(100);

      // New listeners work normally
      const newListener = vi.fn();
      selected.on(newListener);
      state.set({ value: 200 });
      expect(selected()).toBe(200);
      expect(newListener).toHaveBeenCalled();
    });

    it("should remain readable after parent disposal", () => {
      let state: any;
      let selected: any;

      disposable(() => {
        state = signal({ value: 42 });
        selected = state.select("value");
      });

      // Selector retains last cached value even after parent disposed
      expect(selected()).toBe(42);
      expect(selected.peek()).toBe(42);
    });

    it("should handle multiple cleanup cycles gracefully", () => {
      const state = signal({ value: 1 });
      let selected: any;

      // First lifecycle
      disposable(() => {
        selected = state.select("value");
      });
      expect(selected()).toBe(1);

      // Update and resubscribe
      state.set({ value: 2 });
      expect(selected()).toBe(2);

      // Second cleanup
      disposable(() => {
        const listener = vi.fn();
        selected.on(listener);
      });

      // Still works after second cleanup
      state.set({ value: 3 });
      expect(selected()).toBe(3);
    });
  });

  describe("cascading selectors", () => {
    it("should support creating selectors from selectors", () => {
      const count = signal(1);
      const countX2 = count.select((x) => x * 2);
      const countX6 = countX2.select((x) => x * 3);

      expect(countX6()).toBe(6);

      count.set(2);
      expect(countX6()).toBe(12);
    });

    it("should cascade with property selection", () => {
      const user = signal({ profile: { name: "Alice", age: 30 } });
      const profile = user.select("profile");
      const name = profile.select("name");

      expect(name()).toBe("Alice");

      user.set({ profile: { name: "Bob", age: 25 } });
      expect(name()).toBe("Bob");
    });

    it("should handle multiple levels of cascading", () => {
      const base = signal(2);
      const level1 = base.select((x) => x * 2); // 4
      const level2 = level1.select((x) => x + 10); // 14
      const level3 = level2.select((x) => x / 2); // 7

      expect(level3()).toBe(7);

      base.set(3);
      expect(level3()).toBe(8); // ((3 * 2) + 10) / 2 = 16 / 2 = 8
    });

    it("should properly cleanup cascaded selectors", () => {
      const count = signal(1);
      let countX2: Selector<number>;
      let countX6: Selector<number>;

      disposable(() => {
        countX2 = count.select((x) => x * 2);
        countX6 = countX2.select((x: any) => x * 3);
      });

      // After cleanup, cascaded selectors still work (graceful degradation)
      expect(countX6!()).toBe(6);

      count.set(2);
      expect(countX6!()).toBe(12);
    });
  });

  describe("multiple selectors", () => {
    it("should create independent selectors for different properties", () => {
      const todo = signal({ title: "Hello", completed: false, priority: 1 });

      const title = todo.select("title");
      const completed = todo.select("completed");
      const priority = todo.select("priority");

      const titleListener = vi.fn();
      const completedListener = vi.fn();
      const priorityListener = vi.fn();

      title.on(titleListener);
      completed.on(completedListener);
      priority.on(priorityListener);

      // Update only title
      todo.set({ title: "World", completed: false, priority: 1 });

      expect(titleListener).toHaveBeenCalledTimes(1);
      expect(completedListener).not.toHaveBeenCalled();
      expect(priorityListener).not.toHaveBeenCalled();
    });

    it("should allow selecting the same property multiple times", () => {
      const state = signal({ count: 0 });

      const count1 = state.select("count");
      const count2 = state.select("count");

      expect(count1).not.toBe(count2); // Different selector instances
      expect(count1()).toBe(0);
      expect(count2()).toBe(0);

      state.set({ count: 5 });

      expect(count1()).toBe(5);
      expect(count2()).toBe(5);
    });
  });

  describe("nested selections", () => {
    it("should select nested properties directly", () => {
      const state = signal({
        user: { profile: { name: "John", age: 30 } },
      });

      // Select nested property directly
      const name = state.select((s) => s.user.profile.name);

      expect(name()).toBe("John");

      state.set({
        user: { profile: { name: "Jane", age: 30 } },
      });

      expect(name()).toBe("Jane");
    });

    it("should allow multiple levels of selection via signals", () => {
      const state = signal({
        user: { profile: { name: "John", age: 30 } },
      });

      // First level: select profile as signal
      const profileSignal = signal(() => state().user.profile);

      // Second level: select name from profile signal
      const name = profileSignal.select((p) => p.name);

      expect(name()).toBe("John");

      state.set({
        user: { profile: { name: "Jane", age: 30 } },
      });

      expect(name()).toBe("Jane");
    });
  });

  describe("performance", () => {
    it("should not recompute selector when parent updates with same value", () => {
      const state = signal({ count: 0 });
      let computeCount = 0;

      const doubled = state.select((s) => {
        computeCount++;
        return s.count * 2;
      });

      expect(doubled()).toBe(0);
      expect(computeCount).toBe(1);

      // Set same value
      state.set({ count: 0 });

      // Selector should recompute (to check equality)
      expect(computeCount).toBe(2);

      // But reading again shouldn't recompute
      expect(doubled()).toBe(0);
      expect(computeCount).toBe(2);
    });
  });
});
