/**
 * Tests for focus operator - bidirectional lens into nested signal data
 */
import { describe, it, expect, vi } from "vitest";
import { signal } from "../signal";
import { focus } from "./focus";

describe("focus operator", () => {
  describe("basic functionality", () => {
    it("should read value at path", () => {
      const form = signal({ user: { name: "Alice", age: 30 } });
      const userName = form.pipe(focus("user.name"));

      expect(userName()).toBe("Alice");
    });

    it("should read nested value at deep path", () => {
      const data = signal({
        level1: { level2: { level3: { value: 42 } } },
      });
      const deepValue = data.pipe(focus("level1.level2.level3.value"));

      expect(deepValue()).toBe(42);
    });

    it("should update source when focused signal changes", () => {
      const form = signal({ user: { name: "Alice", age: 30 } });
      const userName = form.pipe(focus("user.name"));

      userName.set("Bob");

      expect(userName()).toBe("Bob");
      expect(form().user.name).toBe("Bob");
      // Other properties unchanged
      expect(form().user.age).toBe(30);
    });

    it("should update focused signal when source changes", () => {
      const form = signal({ user: { name: "Alice", age: 30 } });
      const userName = form.pipe(focus("user.name"));

      form.set({ user: { name: "Charlie", age: 25 } });

      expect(userName()).toBe("Charlie");
    });

    it("should work with array indices", () => {
      const list = signal({ items: [{ id: 1 }, { id: 2 }, { id: 3 }] });
      const firstItem = list.pipe(focus("items.0"));

      expect(firstItem()).toEqual({ id: 1 });

      firstItem.set({ id: 100 });
      expect(list().items[0]).toEqual({ id: 100 });
    });

    it("should work with array item property", () => {
      const list = signal({ items: [{ id: 1, name: "first" }] });
      const firstName = list.pipe(focus("items.0.name"));

      expect(firstName()).toBe("first");

      firstName.set("updated");
      expect(list().items[0].name).toBe("updated");
    });
  });

  describe("circular update prevention", () => {
    it("should not cause infinite loop when source and focused update each other", () => {
      const form = signal({ value: 0 });
      const focused = form.pipe(focus("value"));

      const sourceSpy = vi.fn();
      const focusedSpy = vi.fn();

      form.on(sourceSpy);
      focused.on(focusedSpy);

      focused.set(1);

      // Each should only be called once
      expect(sourceSpy).toHaveBeenCalledTimes(1);
      expect(focusedSpy).toHaveBeenCalledTimes(1);
      expect(form().value).toBe(1);
      expect(focused()).toBe(1);
    });

    it("should handle rapid updates without loops", () => {
      const form = signal({ count: 0 });
      const count = form.pipe(focus("count"));

      for (let i = 1; i <= 10; i++) {
        count.set(i);
      }

      expect(count()).toBe(10);
      expect(form().count).toBe(10);
    });
  });

  describe("disposal handling", () => {
    it("should check disposed() method on signal", () => {
      const form = signal({ value: 0 });

      expect(form.disposed()).toBe(false);

      form.dispose();

      expect(form.disposed()).toBe(true);
    });

    it("should keep last value when source is disposed", () => {
      const form = signal({ value: "test" });
      const focused = form.pipe(focus("value"));

      form.dispose();

      // Should return last known value (inner signal caches it)
      expect(focused()).toBe("test");
    });

    it("should not update source when source is disposed", () => {
      const form = signal({ value: "test" });
      const onError = vi.fn();
      const focused = form.pipe(
        focus("value", {
          onError,
        })
      );

      form.dispose();

      // Should not throw, but should not update disposed source
      focused.set("new value");

      // Should call onError
      expect(onError).toHaveBeenCalled();

      // Focused should still have original value (update was rejected)
      expect(focused()).toBe("test");
    });

    it("should clean up subscription when focused signal disposed", () => {
      const form = signal({ value: 0 });
      const focused = form.pipe(focus("value"));

      const spy = vi.fn();
      focused.on(spy);

      focused.dispose();

      // Changing source should not trigger disposed focused
      form.set({ value: 100 });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("options", () => {
    describe("equals", () => {
      it("should use shallow equality for objects", () => {
        const form = signal({ data: { a: 1, b: 2 } });
        const data = form.pipe(focus("data", { equals: "shallow" }));

        const spy = vi.fn();
        data.on(spy);

        // Same content, should not trigger
        form.set({ data: { a: 1, b: 2 } });
        expect(spy).not.toHaveBeenCalled();

        // Different content, should trigger
        form.set({ data: { a: 1, b: 3 } });
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });

    describe("name", () => {
      it("should set displayName", () => {
        const form = signal({ value: 0 });
        const focused = form.pipe(focus("value", { name: "myValue" }));

        expect(focused.displayName).toBe("myValue");
      });

      it("should have default name based on path", () => {
        const form = signal({ user: { name: "Alice" } });
        const focused = form.pipe(focus("user.name"));

        expect(focused.displayName).toBe("focus(user.name)");
      });
    });

    describe("get transform", () => {
      it("should transform value when reading", () => {
        const form = signal({ name: "alice" });
        const name = form.pipe(
          focus("name", {
            get: (v) => v.toUpperCase(),
          })
        );

        expect(name()).toBe("ALICE");
      });
    });

    describe("set transform", () => {
      it("should transform value when writing", () => {
        const form = signal({ name: "" });
        const name = form.pipe(
          focus("name", {
            set: (v) => v.trim().toLowerCase(),
          })
        );

        name.set("  HELLO WORLD  ");

        expect(form().name).toBe("hello world");
      });

      it("should receive previous value in set transform via context", () => {
        const form = signal({ count: 0 });
        const count = form.pipe(
          focus("count", {
            set: (next, ctx) => Math.max(next, ctx.prev),
          })
        );

        count.set(5);
        expect(form().count).toBe(5);

        count.set(3); // Should not decrease
        expect(form().count).toBe(5);

        count.set(10);
        expect(form().count).toBe(10);
      });
    });

    describe("validate", () => {
      it("should skip update when validation returns false", () => {
        const form = signal({ age: 25 });
        const age = form.pipe(
          focus("age", {
            validate: (v) => v >= 0 && v <= 150,
          })
        );

        age.set(30);
        expect(form().age).toBe(30);

        age.set(-5); // Invalid, should skip
        expect(form().age).toBe(30);

        age.set(200); // Invalid, should skip
        expect(form().age).toBe(30);
      });

      it("should skip update when validation throws", () => {
        const form = signal({ email: "" });
        const email = form.pipe(
          focus("email", {
            validate: (v) => {
              if (!v.includes("@")) {
                throw new Error("Invalid email");
              }
            },
          })
        );

        email.set("test@example.com");
        expect(form().email).toBe("test@example.com");

        email.set("invalid"); // Should skip
        expect(form().email).toBe("test@example.com");
      });
    });

    describe("onError", () => {
      it("should call onError when validation fails", () => {
        const onError = vi.fn();
        const form = signal({ value: 0 });
        const value = form.pipe(
          focus("value", {
            validate: (v) => v > 0,
            onError,
          })
        );

        value.set(-1);

        expect(onError).toHaveBeenCalledTimes(1);
        expect(form().value).toBe(0); // Unchanged
      });

      it("should call onError when path access fails", () => {
        const onError = vi.fn();
        const form = signal<{ user?: { name: string } }>({ user: undefined });
        const userName = form.pipe(
          focus("user.name" as any, {
            fallback: () => "fallback",
            onError,
          })
        );

        expect(userName()).toBe("fallback");
        expect(onError).toHaveBeenCalled();
      });

      it("should call onError when set fails due to disposed source", () => {
        const onError = vi.fn();
        const form = signal({ value: "test" });
        const focused = form.pipe(
          focus("value", {
            onError,
          })
        );

        form.dispose();

        // Try to set - should call onError
        focused.set("new value");
        expect(onError).toHaveBeenCalled();
      });
    });

    describe("fallback", () => {
      it("should use fallback when path access fails", () => {
        const form = signal<{ user?: { name: string } }>({ user: undefined });
        const userName = form.pipe(
          focus("user.name" as any, {
            fallback: () => "default",
          })
        );

        // Should use fallback because user is undefined
        expect(userName()).toBe("default");
      });
    });
  });

  describe("updater function", () => {
    it("should support updater function in set", () => {
      const form = signal({ count: 5 });
      const count = form.pipe(focus("count"));

      count.set((prev) => prev + 1);

      expect(count()).toBe(6);
      expect(form().count).toBe(6);
    });

    it("should use current focused value for updater", () => {
      const form = signal({ values: [1, 2, 3] });
      const values = form.pipe(focus("values"));

      values.set((prev) => [...prev, 4]);

      expect(values()).toEqual([1, 2, 3, 4]);
    });
  });

  describe("subscription", () => {
    it("should notify subscribers when focused value changes", () => {
      const form = signal({ value: 0 });
      const focused = form.pipe(focus("value"));

      const spy = vi.fn();
      focused.on(spy);

      focused.set(1);
      expect(spy).toHaveBeenCalledTimes(1);

      form.set({ value: 2 });
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("immutability", () => {
    it("should not mutate source object", () => {
      const original = { user: { name: "Alice", age: 30 } };
      const form = signal(original);
      const userName = form.pipe(focus("user.name"));

      userName.set("Bob");

      // Original object should be unchanged
      expect(original.user.name).toBe("Alice");
      // Form should have new reference
      expect(form().user.name).toBe("Bob");
      expect(form()).not.toBe(original);
    });
  });

  describe("error handling", () => {
    it("should throw when used with computed signal", () => {
      const source = signal({ value: 0 });
      const computed = signal({ source }, ({ deps }) => ({
        doubled: deps.source.value * 2,
      }));

      expect(() => computed.pipe(focus("doubled" as any))).toThrow(
        "focus() requires a mutable signal"
      );
    });
  });
});
