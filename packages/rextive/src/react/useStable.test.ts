import { describe, it, expect } from "vitest";
import { UseStableController } from "./useStable";

describe("UseStableController", () => {
  describe("functions", () => {
    it("should return stable function reference", () => {
      const value1 = { onClick: () => "first" };
      const controller = new UseStableController(value1);

      const fn1 = controller.proxy.onClick;

      // Update with new function
      const value2 = { onClick: () => "second" };
      controller.onRender(value2, {});

      const fn2 = controller.proxy.onClick;

      // Same reference
      expect(fn1).toBe(fn2);
    });

    it("should call the latest function implementation", () => {
      let callCount = 0;
      const value1 = {
        increment: () => {
          callCount += 1;
        },
      };
      const controller = new UseStableController(value1);

      controller.proxy.increment();
      expect(callCount).toBe(1);

      // Update with new implementation
      const value2 = {
        increment: () => {
          callCount += 10;
        },
      };
      controller.onRender(value2, {});

      // Should call the NEW implementation
      controller.proxy.increment();
      expect(callCount).toBe(11);
    });

    it("should preserve function arguments and return value", () => {
      const value = {
        add: (a: number, b: number) => a + b,
      };
      const controller = new UseStableController(value);

      expect(controller.proxy.add(2, 3)).toBe(5);
    });

    it("should bind this correctly for methods", () => {
      const value = {
        count: 10,
        getCount() {
          return this.count;
        },
      };
      const controller = new UseStableController(value);

      expect(controller.proxy.getCount()).toBe(10);

      // Update count
      controller.onRender({ count: 20, getCount: value.getCount }, {});
      expect(controller.proxy.getCount()).toBe(20);
    });
  });

  describe("arrays", () => {
    it("should return cached array if shallowly equal", () => {
      const value1 = { items: [1, 2, 3] };
      const controller = new UseStableController(value1);

      const arr1 = controller.proxy.items;

      // Update with shallowly equal array
      const value2 = { items: [1, 2, 3] };
      controller.onRender(value2, {});

      const arr2 = controller.proxy.items;

      // Same reference (cached)
      expect(arr1).toBe(arr2);
    });

    it("should return new array if not shallowly equal", () => {
      const value1 = { items: [1, 2, 3] };
      const controller = new UseStableController(value1);

      const arr1 = controller.proxy.items;

      // Update with different array
      const value2 = { items: [1, 2, 4] };
      controller.onRender(value2, {});

      const arr2 = controller.proxy.items;

      // Different reference
      expect(arr1).not.toBe(arr2);
      expect(arr2).toEqual([1, 2, 4]);
    });

    it("should detect array length changes", () => {
      const value1 = { items: [1, 2, 3] };
      const controller = new UseStableController(value1);

      const arr1 = controller.proxy.items;

      // Update with different length
      const value2 = { items: [1, 2] };
      controller.onRender(value2, {});

      const arr2 = controller.proxy.items;

      expect(arr1).not.toBe(arr2);
    });
  });

  describe("objects", () => {
    it("should return cached object if shallowly equal", () => {
      const value1 = { config: { theme: "dark", size: 12 } };
      const controller = new UseStableController(value1);

      const obj1 = controller.proxy.config;

      // Update with shallowly equal object
      const value2 = { config: { theme: "dark", size: 12 } };
      controller.onRender(value2, {});

      const obj2 = controller.proxy.config;

      // Same reference (cached)
      expect(obj1).toBe(obj2);
    });

    it("should return new object if not shallowly equal", () => {
      const value1 = { config: { theme: "dark" } };
      const controller = new UseStableController(value1);

      const obj1 = controller.proxy.config;

      // Update with different object
      const value2 = { config: { theme: "light" } };
      controller.onRender(value2, {});

      const obj2 = controller.proxy.config;

      expect(obj1).not.toBe(obj2);
      expect(obj2).toEqual({ theme: "light" });
    });

    it("should detect object key changes", () => {
      const value1 = { config: { a: 1 } };
      const controller = new UseStableController(value1);

      const obj1 = controller.proxy.config;

      // Update with different keys
      const value2 = { config: { a: 1, b: 2 } };
      controller.onRender(value2, {});

      const obj2 = controller.proxy.config;

      expect(obj1).not.toBe(obj2);
    });
  });

  describe("dates", () => {
    it("should return cached Date if same timestamp", () => {
      const date1 = new Date("2024-01-01");
      const value1 = { date: date1 };
      const controller = new UseStableController(value1);

      const d1 = controller.proxy.date;

      // Update with same timestamp
      const date2 = new Date("2024-01-01");
      const value2 = { date: date2 };
      controller.onRender(value2, {});

      const d2 = controller.proxy.date;

      // Same reference (cached)
      expect(d1).toBe(d2);
    });

    it("should return new Date if different timestamp", () => {
      const value1 = { date: new Date("2024-01-01") };
      const controller = new UseStableController(value1);

      const d1 = controller.proxy.date;

      // Update with different timestamp
      const value2 = { date: new Date("2024-06-15") };
      controller.onRender(value2, {});

      const d2 = controller.proxy.date;

      expect(d1).not.toBe(d2);
      expect(d2.toISOString()).toBe(new Date("2024-06-15").toISOString());
    });
  });

  describe("sets", () => {
    it("should return cached Set if same elements", () => {
      const value1 = { ids: new Set([1, 2, 3]) };
      const controller = new UseStableController(value1);

      const set1 = controller.proxy.ids;

      // Update with same elements (different reference)
      const value2 = { ids: new Set([1, 2, 3]) };
      controller.onRender(value2, {});

      const set2 = controller.proxy.ids;

      // Same reference (cached)
      expect(set1).toBe(set2);
    });

    it("should return new Set if different elements", () => {
      const value1 = { ids: new Set([1, 2, 3]) };
      const controller = new UseStableController(value1);

      const set1 = controller.proxy.ids;

      // Update with different elements
      const value2 = { ids: new Set([1, 2, 4]) };
      controller.onRender(value2, {});

      const set2 = controller.proxy.ids;

      expect(set1).not.toBe(set2);
      expect(set2).toEqual(new Set([1, 2, 4]));
    });

    it("should detect Set size changes", () => {
      const value1 = { ids: new Set([1, 2, 3]) };
      const controller = new UseStableController(value1);

      const set1 = controller.proxy.ids;

      // Update with different size
      const value2 = { ids: new Set([1, 2]) };
      controller.onRender(value2, {});

      const set2 = controller.proxy.ids;

      expect(set1).not.toBe(set2);
    });

    it("should handle Set with object elements (by reference)", () => {
      const obj = { id: 1 };
      const value1 = { items: new Set([obj]) };
      const controller = new UseStableController(value1);

      const set1 = controller.proxy.items;

      // Same object reference in Set
      const value2 = { items: new Set([obj]) };
      controller.onRender(value2, {});

      const set2 = controller.proxy.items;

      // Same reference because Set.has uses reference equality
      expect(set1).toBe(set2);
    });

    it("should detect different object references in Set", () => {
      const value1 = { items: new Set([{ id: 1 }]) };
      const controller = new UseStableController(value1);

      const set1 = controller.proxy.items;

      // Different object reference (even if equal content)
      const value2 = { items: new Set([{ id: 1 }]) };
      controller.onRender(value2, {});

      const set2 = controller.proxy.items;

      // Different because Set.has uses reference equality
      expect(set1).not.toBe(set2);
    });
  });

  describe("maps", () => {
    it("should return cached Map if same key-value pairs", () => {
      const value1 = {
        data: new Map([
          ["a", 1],
          ["b", 2],
        ]),
      };
      const controller = new UseStableController(value1);

      const map1 = controller.proxy.data;

      // Update with same key-value pairs (different reference)
      const value2 = {
        data: new Map([
          ["a", 1],
          ["b", 2],
        ]),
      };
      controller.onRender(value2, {});

      const map2 = controller.proxy.data;

      // Same reference (cached)
      expect(map1).toBe(map2);
    });

    it("should return new Map if different values", () => {
      const value1 = { data: new Map([["a", 1]]) };
      const controller = new UseStableController(value1);

      const map1 = controller.proxy.data;

      // Update with different value
      const value2 = { data: new Map([["a", 2]]) };
      controller.onRender(value2, {});

      const map2 = controller.proxy.data;

      expect(map1).not.toBe(map2);
      expect(map2.get("a")).toBe(2);
    });

    it("should return new Map if different keys", () => {
      const value1 = { data: new Map([["a", 1]]) };
      const controller = new UseStableController(value1);

      const map1 = controller.proxy.data;

      // Update with different key
      const value2 = { data: new Map([["b", 1]]) };
      controller.onRender(value2, {});

      const map2 = controller.proxy.data;

      expect(map1).not.toBe(map2);
    });

    it("should detect Map size changes", () => {
      const value1 = {
        data: new Map([
          ["a", 1],
          ["b", 2],
        ]),
      };
      const controller = new UseStableController(value1);

      const map1 = controller.proxy.data;

      // Update with different size
      const value2 = { data: new Map([["a", 1]]) };
      controller.onRender(value2, {});

      const map2 = controller.proxy.data;

      expect(map1).not.toBe(map2);
    });

    it("should handle Map with object keys (by reference)", () => {
      const key = { id: 1 };
      const value1 = { data: new Map([[key, "value"]]) };
      const controller = new UseStableController(value1);

      const map1 = controller.proxy.data;

      // Same object key reference
      const value2 = { data: new Map([[key, "value"]]) };
      controller.onRender(value2, {});

      const map2 = controller.proxy.data;

      // Same reference because Map.has uses reference equality for keys
      expect(map1).toBe(map2);
    });

    it("should use Object.is for value comparison", () => {
      const value1 = { data: new Map([["a", NaN]]) };
      const controller = new UseStableController(value1);

      const map1 = controller.proxy.data;

      // NaN === NaN is false, but Object.is(NaN, NaN) is true
      const value2 = { data: new Map([["a", NaN]]) };
      controller.onRender(value2, {});

      const map2 = controller.proxy.data;

      // Same reference because Object.is handles NaN correctly
      expect(map1).toBe(map2);
    });
  });

  describe("primitives", () => {
    it("should return primitives directly", () => {
      const value = {
        count: 42,
        name: "test",
        active: true,
        empty: null,
        missing: undefined,
      };
      const controller = new UseStableController(value);

      expect(controller.proxy.count).toBe(42);
      expect(controller.proxy.name).toBe("test");
      expect(controller.proxy.active).toBe(true);
      expect(controller.proxy.empty).toBe(null);
      expect(controller.proxy.missing).toBe(undefined);
    });

    it("should reflect updated primitive values", () => {
      const value1 = { count: 1 };
      const controller = new UseStableController(value1);

      expect(controller.proxy.count).toBe(1);

      controller.onRender({ count: 2 }, {});
      expect(controller.proxy.count).toBe(2);
    });
  });

  describe("custom equals", () => {
    it("should use custom equals function", () => {
      const value1 = { items: [1.001, 2.002] };
      const controller = new UseStableController(value1, {
        // Consider numbers equal if difference < 0.01
        equals: (a, b) =>
          typeof a === "number" && typeof b === "number"
            ? Math.abs(a - b) < 0.01
            : Object.is(a, b),
      });

      const arr1 = controller.proxy.items;

      // Update with slightly different numbers
      const value2 = { items: [1.005, 2.008] };
      controller.onRender(value2, {
        equals: (a, b) =>
          typeof a === "number" && typeof b === "number"
            ? Math.abs(a - b) < 0.01
            : Object.is(a, b),
      });

      const arr2 = controller.proxy.items;

      // Same reference because custom equals considers them equal
      expect(arr1).toBe(arr2);
    });
  });

  describe("proxy traps", () => {
    it("should support Object.keys()", () => {
      const value = { a: 1, b: 2, c: 3 };
      const controller = new UseStableController(value);

      expect(Object.keys(controller.proxy)).toEqual(["a", "b", "c"]);
    });

    it("should support Object.entries()", () => {
      const value = { a: 1, b: 2 };
      const controller = new UseStableController(value);

      expect(Object.entries(controller.proxy)).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });

    it("should support 'in' operator", () => {
      const value = { exists: true };
      const controller = new UseStableController(value);

      expect("exists" in controller.proxy).toBe(true);
      expect("missing" in controller.proxy).toBe(false);
    });

    it("should reflect key changes after onRender", () => {
      const value1 = { a: 1 };
      const controller = new UseStableController(value1);

      expect(Object.keys(controller.proxy)).toEqual(["a"]);

      // @ts-expect-error - b is not in the value
      controller.onRender({ a: 1, b: 2 }, {});
      expect(Object.keys(controller.proxy)).toEqual(["a", "b"]);
    });

    it("should support for...in loop", () => {
      const value = { x: 1, y: 2 };
      const controller = new UseStableController(value);

      const keys: string[] = [];
      for (const key in controller.proxy) {
        keys.push(key);
      }

      expect(keys).toEqual(["x", "y"]);
    });
  });

  describe("mixed scenarios", () => {
    it("should handle object with multiple property types", () => {
      const value = {
        name: "test",
        count: 42,
        items: [1, 2, 3],
        config: { theme: "dark" },
        onClick: () => "clicked",
        date: new Date("2024-01-01"),
      };
      const controller = new UseStableController(value);

      // Access all properties
      const fn = controller.proxy.onClick;
      const arr = controller.proxy.items;
      const obj = controller.proxy.config;
      const date = controller.proxy.date;

      // Update with same values (different references)
      controller.onRender(
        {
          name: "test",
          count: 42,
          items: [1, 2, 3],
          config: { theme: "dark" },
          onClick: () => "new clicked",
          date: new Date("2024-01-01"),
        },
        {}
      );

      // Functions, arrays, objects, dates should be cached
      expect(controller.proxy.onClick).toBe(fn);
      expect(controller.proxy.items).toBe(arr);
      expect(controller.proxy.config).toBe(obj);
      expect(controller.proxy.date).toBe(date);

      // Primitives should reflect current value
      expect(controller.proxy.name).toBe("test");
      expect(controller.proxy.count).toBe(42);
    });
  });
});
