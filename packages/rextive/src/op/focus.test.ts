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

        expect(focused.displayName.includes("user.name")).toBeTruthy();
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

      it("should use fallback silently when path returns nullish (no onError)", () => {
        const onError = vi.fn();
        const form = signal<{ user?: { name: string } }>({ user: undefined });
        const userName = form.pipe(
          focus("user.name" as any, () => "fallback", { onError })
        );

        // Nullish values trigger fallback silently (not an error)
        expect(userName()).toBe("fallback");
        expect(onError).not.toHaveBeenCalled();
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
      it("should use fallback factory when path access fails", () => {
        const form = signal<{ user?: { name: string } }>({ user: undefined });
        const userName = form.pipe(focus("user.name" as any, () => "default"));

        // Should use fallback because user is undefined
        expect(userName()).toBe("default");
      });

      it("should use fallback with options", () => {
        const form = signal<{ user?: { name: string } }>({ user: undefined });
        const userName = form.pipe(
          focus("user.name" as any, () => "fallback-value", {
            name: "userName",
          })
        );

        // Should use fallback because user is undefined
        expect(userName()).toBe("fallback-value");
        expect(userName.displayName).toMatch(/userName/);
      });

      it("should apply get transform to fallback value", () => {
        const form = signal<{ user?: { name: string } }>({ user: undefined });
        const userName = form.pipe(
          focus("user.name" as any, () => "guest", {
            get: (v) => v.toUpperCase(),
          })
        );

        // Should use fallback with get transform applied
        expect(userName()).toBe("GUEST");
      });

      it("should apply get transform to both source and fallback", () => {
        const form = signal<{ user?: { name: string } }>({
          user: { name: "alice" },
        });
        const userName = form.pipe(
          focus("user.name", () => "guest", {
            get: (v) => v.toUpperCase(),
          })
        );

        // Source value with transform
        expect(userName()).toBe("ALICE");

        // Remove user to trigger fallback
        form.set({ user: undefined } as any);

        // Fallback value with same transform
        expect(userName()).toBe("GUEST");
      });

      it("should memoize fallback value (called only once)", () => {
        const fallbackFactory = vi.fn(() => "memoized");
        const form = signal<{ name?: string }>({ name: undefined });
        const name = form.pipe(focus("name", fallbackFactory));

        // First read - should call fallback
        expect(name()).toBe("memoized");
        expect(fallbackFactory).toHaveBeenCalledTimes(1);

        // Second read - should use cached fallback
        expect(name()).toBe("memoized");
        expect(fallbackFactory).toHaveBeenCalledTimes(1);

        // Third read - still cached
        expect(name()).toBe("memoized");
        expect(fallbackFactory).toHaveBeenCalledTimes(1);
      });

      it("should use fallback when value is null", () => {
        const form = signal<{ name: string | null }>({ name: null });
        const name = form.pipe(focus("name", () => "fallback"));

        expect(name()).toBe("fallback");
      });

      it("should use fallback when value is undefined", () => {
        const form = signal<{ name?: string }>({ name: undefined });
        const name = form.pipe(focus("name", () => "fallback"));

        expect(name()).toBe("fallback");
      });

      it("should NOT use fallback when value is empty string", () => {
        const form = signal({ name: "" });
        const name = form.pipe(focus("name", () => "fallback"));

        // Empty string is NOT nullish, so no fallback
        expect(name()).toBe("");
      });

      it("should NOT use fallback when value is 0", () => {
        const form = signal({ count: 0 });
        const count = form.pipe(focus("count", () => 999));

        // 0 is NOT nullish, so no fallback
        expect(count()).toBe(0);
      });

      it("should NOT use fallback when value is false", () => {
        const form = signal({ enabled: false });
        const enabled = form.pipe(focus("enabled", () => true));

        // false is NOT nullish, so no fallback
        expect(enabled()).toBe(false);
      });

      it("should switch between source and fallback when value changes", () => {
        const form = signal<{ name: string | null }>({ name: "Alice" });
        const name = form.pipe(focus("name", () => "Guest"));

        // Has value - use source
        expect(name()).toBe("Alice");

        // Set to null - use fallback
        form.set({ name: null });
        expect(name()).toBe("Guest");

        // Set back to value - use source again
        form.set({ name: "Bob" });
        expect(name()).toBe("Bob");
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

      // @ts-expect-error - Computed signal is not mutable
      expect(() => computed.pipe(focus("doubled" as any))).toThrow(
        "focus() requires a mutable signal"
      );
    });
  });

  describe("disposal", () => {
    it("should lazy-dispose focus signal when source is disposed and focus is accessed", () => {
      const form = signal({ name: "Alice" });
      const name = form.pipe(focus("name"));

      expect(name()).toBe("Alice");
      expect(name.disposed()).toBe(false);

      // Dispose source
      form.dispose();

      // Focus is not immediately disposed (lazy disposal)
      // But trying to set will trigger disposal check
      name.set("Bob");

      // Now focus should be disposed
      expect(name.disposed()).toBe(true);
    });

    it("should silently fail set after source disposal", () => {
      const form = signal({ name: "Alice" });
      const name = form.pipe(focus("name"));

      expect(name()).toBe("Alice");

      // Dispose source
      form.dispose();

      // Set should not throw, just no-op and dispose
      expect(() => name.set("Bob")).not.toThrow();

      // Focus should be disposed after attempted set
      expect(name.disposed()).toBe(true);

      // Value should still be readable (last known value)
      expect(name()).toBe("Alice");
    });

    it("should dispose focus but keep source when focus is disposed directly", () => {
      const form = signal({ name: "Alice" });
      const name = form.pipe(focus("name"));

      // Dispose focus only
      name.dispose();

      // Source should still work
      expect(form.disposed()).toBe(false);
      expect(form()).toEqual({ name: "Alice" });

      // Focus is disposed
      expect(name.disposed()).toBe(true);
    });

    it("should not sync from disposed source", () => {
      const form = signal({ name: "Alice" });
      const name = form.pipe(focus("name"));

      expect(name()).toBe("Alice");

      // Dispose source
      form.dispose();

      // Even if we could change source (we can't), focus should not sync
      // This test verifies the subscription cleanup path
      expect(name()).toBe("Alice"); // Still has last value
    });
  });

  describe("optional and nullable properties", () => {
    it("should handle optional parent property", () => {
      type FormWithOptional = {
        user?: { name: string };
      };

      const form = signal<FormWithOptional>({ user: { name: "Alice" } });
      const userName = form.pipe(focus("user.name"));

      expect(userName()).toBe("Alice");

      // Update through focused signal
      userName.set("Bob");
      expect(form().user?.name).toBe("Bob");
    });

    it("should handle optional parent when undefined", () => {
      type FormWithOptional = {
        user?: { name: string };
      };

      const form = signal<FormWithOptional>({});
      const userName = form.pipe(focus("user.name"));

      // Should return undefined when parent is missing
      expect(userName()).toBeUndefined();
    });

    it("should create path when setting value on nullish parent object", () => {
      type FormWithOptional = {
        user?: { name: string };
      };

      const form = signal<FormWithOptional>({});
      const userName = form.pipe(focus("user.name"));

      // Should create intermediate object when setting
      userName.set("Alice");

      expect(userName()).toBe("Alice");
      expect(form()).toEqual({ user: { name: "Alice" } });
    });

    it("should create path when setting value on deeply nested nullish object", () => {
      type DeepOptional = {
        a?: {
          b?: {
            c?: string;
          };
        };
      };

      const data = signal<DeepOptional>({});
      const deepValue = data.pipe(focus("a.b.c"));

      // Should create all intermediate objects
      deepValue.set("created");

      expect(deepValue()).toBe("created");
      expect(data()).toEqual({ a: { b: { c: "created" } } });
    });

    it("should handle nullable array items", () => {
      type ListWithNullable = {
        items: [{ name?: string } | undefined | null];
      };

      const list = signal<ListWithNullable>({
        items: [{ name: "first" }],
      });
      const firstName = list.pipe(focus("items.0.name"));

      expect(firstName()).toBe("first");

      // Update through focused signal
      firstName.set("updated");
      expect(list().items[0]?.name).toBe("updated");
    });

    it("should handle nullable array item when null", () => {
      type ListWithNullable = {
        items: [{ name?: string } | undefined | null];
      };

      const list = signal<ListWithNullable>({
        items: [null],
      });
      const firstName = list.pipe(focus("items.0.name"));

      // Should return undefined when item is null
      expect(firstName()).toBeUndefined();
    });

    it("should create object in array when setting value on null item", () => {
      type ListWithNullable = {
        items: ({ name: string } | null)[];
      };

      const list = signal<ListWithNullable>({
        items: [null],
      });
      const firstName = list.pipe(focus("items.0.name"));

      // Should create object in array when setting
      firstName.set("created");

      expect(firstName()).toBe("created");
      expect(list().items[0]).toEqual({ name: "created" });
    });

    it("should create array and object when setting value on nullish array", () => {
      type WithOptionalArray = {
        items?: { name: string }[];
      };

      const data = signal<WithOptionalArray>({});
      const firstName = data.pipe(focus("items.0.name"));

      // Should create array and object
      firstName.set("created");

      expect(firstName()).toBe("created");
      expect(data().items).toBeDefined();
      expect(data().items![0]).toEqual({ name: "created" });
    });

    it("should handle deeply nested optional properties", () => {
      type DeepOptional = {
        a?: {
          b?: {
            c?: string;
          };
        };
      };

      const data = signal<DeepOptional>({
        a: { b: { c: "deep" } },
      });
      const deepValue = data.pipe(focus("a.b.c"));

      expect(deepValue()).toBe("deep");

      deepValue.set("updated");
      expect(data().a?.b?.c).toBe("updated");
    });

    it("should return undefined for missing intermediate property", () => {
      type DeepOptional = {
        a?: {
          b?: {
            c?: string;
          };
        };
      };

      const data = signal<DeepOptional>({
        a: { b: undefined },
      });
      const deepValue = data.pipe(focus("a.b.c"));

      expect(deepValue()).toBeUndefined();
    });

    it("should use fallback for optional property", () => {
      type FormWithOptional = {
        nickname?: string;
      };

      const form = signal<FormWithOptional>({});
      const nickname = form.pipe(focus("nickname", () => "Anonymous"));

      // Should return fallback when value is undefined
      expect(nickname()).toBe("Anonymous");

      // After setting a value, should return the actual value
      nickname.set("Alice");
      expect(nickname()).toBe("Alice");
    });

    it("should use fallback for nullable array item property", () => {
      type ListWithNullable = {
        items: [{ name?: string } | null];
      };

      const list = signal<ListWithNullable>({
        items: [null],
      });
      const firstName = list.pipe(focus("items.0.name", () => "default"));

      expect(firstName()).toBe("default");
    });
  });
});

describe("focus.lens", () => {
  describe("basic functionality", () => {
    it("should read value at path", () => {
      const form = signal({ user: { name: "Alice", age: 30 } });
      const [getName] = focus.lens(form, "user.name");

      expect(getName()).toBe("Alice");
    });

    it("should write value at path", () => {
      const form = signal({ user: { name: "Alice", age: 30 } });
      const [getName, setName] = focus.lens(form, "user.name");

      setName("Bob");

      expect(getName()).toBe("Bob");
      expect(form().user.name).toBe("Bob");
      expect(form().user.age).toBe(30); // Other properties unchanged
    });

    it("should work with array indices", () => {
      const list = signal({ items: ["a", "b", "c"] });
      const [getFirst, setFirst] = focus.lens(list, "items.0");

      expect(getFirst()).toBe("a");

      setFirst("x");
      expect(getFirst()).toBe("x");
      expect(list().items).toEqual(["x", "b", "c"]);
    });

    it("should use fallback for undefined values", () => {
      const form = signal<{ nickname?: string }>({});
      const [getNickname, setNickname] = focus.lens(
        form,
        "nickname",
        () => "Anonymous"
      );

      expect(getNickname()).toBe("Anonymous");

      setNickname("Alice");
      expect(getNickname()).toBe("Alice");
    });
  });

  describe("lens from lens (composable)", () => {
    it("should create lens from another lens", () => {
      const form = signal({
        contacts: [{ firstName: "John", lastName: "Doe" }],
      });

      const contactsLens = focus.lens(form, "contacts");
      const firstContactLens = focus.lens(contactsLens, "0");
      const [getFirstName, setFirstName] = focus.lens(
        firstContactLens,
        "firstName"
      );

      expect(getFirstName()).toBe("John");

      setFirstName("Jane");
      expect(getFirstName()).toBe("Jane");
      expect(form().contacts[0].firstName).toBe("Jane");
    });
  });

  describe("map method", () => {
    it("should transform setter with function shorthand", () => {
      const form = signal({ email: "" });
      const [getEmail, setEmail] = focus
        .lens(form, "email")
        .map((e: { currentTarget: { value: string } }) => e.currentTarget.value);

      // Simulate input event
      const mockEvent = { currentTarget: { value: "test@example.com" } };
      setEmail(mockEvent);

      expect(getEmail()).toBe("test@example.com");
      expect(form().email).toBe("test@example.com");
    });

    it("should transform both getter and setter with options", () => {
      // Store price in cents, display as dollars
      const product = signal({ price: 1999 }); // $19.99

      const [getPrice, setPrice] = focus.lens(product, "price").map({
        get: (cents) => (cents / 100).toFixed(2),
        set: (dollars: string) => Math.round(parseFloat(dollars) * 100),
      });

      expect(getPrice()).toBe("19.99");

      setPrice("25.50");
      expect(getPrice()).toBe("25.50");
      expect(product().price).toBe(2550);
    });

    it("should transform only getter when set is not provided", () => {
      const data = signal({ count: 5 });

      const [getDoubled, setCount] = focus.lens(data, "count").map({
        get: (n) => n * 2,
      });

      expect(getDoubled()).toBe(10);

      setCount(3);
      expect(getDoubled()).toBe(6);
      expect(data().count).toBe(3);
    });

    it("should transform only setter when get is not provided", () => {
      const form = signal({ active: false });

      const [getActive, setActive] = focus.lens(form, "active").map({
        set: (e: { currentTarget: { checked: boolean } }) =>
          e.currentTarget.checked,
      });

      expect(getActive()).toBe(false);

      setActive({ currentTarget: { checked: true } });
      expect(getActive()).toBe(true);
      expect(form().active).toBe(true);
    });

    it("should chain multiple map calls", () => {
      const form = signal({ value: "hello" });

      const [getValue, setValue] = focus
        .lens(form, "value")
        .map({
          get: (s) => s.toUpperCase(),
        })
        .map({
          set: (s: string) => s.toLowerCase(),
        });

      expect(getValue()).toBe("HELLO");

      setValue("WORLD");
      expect(form().value).toBe("world");
      expect(getValue()).toBe("WORLD");
    });

    it("should work with numeric input transformation", () => {
      const settings = signal({ volume: 50 });

      const [getVolume, setVolume] = focus
        .lens(settings, "volume")
        .map((e: { currentTarget: { value: string } }) =>
          parseInt(e.currentTarget.value, 10)
        );

      expect(getVolume()).toBe(50);

      setVolume({ currentTarget: { value: "75" } });
      expect(getVolume()).toBe(75);
      expect(settings().volume).toBe(75);
    });
  });
});
