import { stableEquals, StateFunction } from "./stableEquals";

describe("stableEquals", () => {
  describe("primitives", () => {
    it("should return true for same primitive values", () => {
      expect(stableEquals(1, 1)).toEqual([true, 1]);
      expect(stableEquals("hello", "hello")).toEqual([true, "hello"]);
      expect(stableEquals(true, true)).toEqual([true, true]);
      expect(stableEquals(null, null)).toEqual([true, null]);
    });

    it("should return false for different primitive values", () => {
      expect(stableEquals(1, 2)).toEqual([false, 2]);
      expect(stableEquals("hello", "world")).toEqual([false, "world"]);
      expect(stableEquals(true, false)).toEqual([false, false]);
    });

    it("should handle undefined prev", () => {
      expect(stableEquals(undefined, 42)).toEqual([false, 42]);
      expect(stableEquals(undefined, "test")).toEqual([false, "test"]);
    });
  });

  describe("objects with strict equality (default)", () => {
    it("should return true for same object reference", () => {
      const obj = { a: 1 };
      expect(stableEquals(obj, obj)).toEqual([true, obj]);
    });

    it("should return false for different object references with same content", () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 1 };
      const [isEqual, stable] = stableEquals(obj1, obj2);
      expect(isEqual).toBe(false);
      expect(stable).toBe(obj2);
    });
  });

  describe("objects with shallow equality", () => {
    it("should return true for shallowly equal objects", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      const [isEqual, stable] = stableEquals(obj1, obj2, "shallow");
      expect(isEqual).toBe(true);
      expect(stable).toBe(obj1); // Returns prev when equal
    });

    it("should return false for shallowly different objects", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };
      const [isEqual, stable] = stableEquals(obj1, obj2, "shallow");
      expect(isEqual).toBe(false);
      expect(stable).toBe(obj2);
    });

    it("should return true for shallowly equal arrays", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      const [isEqual, stable] = stableEquals(arr1, arr2, "shallow");
      expect(isEqual).toBe(true);
      expect(stable).toBe(arr1);
    });
  });

  describe("objects with deep equality", () => {
    it("should return true for deeply equal nested objects", () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 1 } } };
      const [isEqual, stable] = stableEquals(obj1, obj2, "deep");
      expect(isEqual).toBe(true);
      expect(stable).toBe(obj1);
    });

    it("should return false for deeply different nested objects", () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 2 } } };
      const [isEqual, stable] = stableEquals(obj1, obj2, "deep");
      expect(isEqual).toBe(false);
      expect(stable).toBe(obj2);
    });
  });

  describe("objects with custom equality function", () => {
    it("should use custom equality function", () => {
      const obj1 = { id: 1, name: "Alice" };
      const obj2 = { id: 1, name: "Bob" };
      const byId = (a: typeof obj1, b: typeof obj2) => a.id === b.id;

      const [isEqual, stable] = stableEquals(obj1, obj2, byId);
      expect(isEqual).toBe(true);
      expect(stable).toBe(obj1);
    });
  });

  describe("Date handling", () => {
    it("should return true for dates with same timestamp", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-01");
      const [isEqual, stable] = stableEquals(date1, date2);
      expect(isEqual).toBe(true);
      expect(stable).toBe(date1); // Returns prev when equal
    });

    it("should return false for dates with different timestamps", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-02");
      const [isEqual, stable] = stableEquals(date1, date2);
      expect(isEqual).toBe(false);
      expect(stable).toBe(date2);
    });

    it("should return false when prev is not a Date", () => {
      const date = new Date("2024-01-01");
      const [isEqual, stable] = stableEquals("not a date", date);
      expect(isEqual).toBe(false);
      expect(stable).toBe(date);
    });

    it("should return false when prev is undefined", () => {
      const date = new Date("2024-01-01");
      const [isEqual, stable] = stableEquals(undefined, date);
      expect(isEqual).toBe(false);
      expect(stable).toBe(date);
    });
  });

  describe("function stability", () => {
    it("should wrap function in stable reference on first call", () => {
      const fn = () => "v1";
      const [isEqual, stable] = stableEquals(undefined, fn);

      expect(isEqual).toBe(false);
      expect(typeof stable).toBe("function");
      expect(stable()).toBe("v1");
    });

    it("should update existing wrapper and return same reference", () => {
      const fn1 = () => "v1";
      const fn2 = () => "v2";

      // First call: create wrapper
      const [, wrapper1] = stableEquals(undefined, fn1);

      // Second call: update wrapper
      const [isEqual, wrapper2] = stableEquals(wrapper1, fn2);

      expect(isEqual).toBe(true);
      expect(wrapper1).toBe(wrapper2); // Same reference
      expect(wrapper2()).toBe("v2"); // Uses new implementation
    });

    it("should preserve function arguments", () => {
      const fn1 = (a: number, b: number) => a + b;
      const fn2 = (a: number, b: number) => a * b;

      const [, wrapper] = stableEquals(undefined, fn1);
      expect(wrapper(2, 3)).toBe(5);

      stableEquals(wrapper, fn2);
      expect(wrapper(2, 3)).toBe(6);
    });

    it("should handle functions with different signatures across updates", () => {
      const fn1 = () => "no args";
      const [, wrapper] = stableEquals(undefined, fn1);
      expect(wrapper()).toBe("no args");

      const fn2 = (x: string) => `with arg: ${x}`;
      stableEquals(wrapper, fn2);
      expect((wrapper as any)("test")).toBe("with arg: test");
    });

    it("should create new wrapper when prev is a regular function", () => {
      const regularFn = () => "regular";
      const newFn = () => "new";

      const [isEqual, stable] = stableEquals(regularFn, newFn);

      expect(isEqual).toBe(false);
      expect(stable).not.toBe(regularFn);
      expect(stable).not.toBe(newFn);
      expect(stable()).toBe("new");
    });
  });

  describe("StateFunction type", () => {
    it("should have update method on wrapped function", () => {
      const fn = () => "initial";
      const [, wrapper] = stableEquals<() => string>(undefined, fn);

      // Type assertion to access StateFunction methods
      const stateFunc = wrapper as StateFunction<typeof fn>;
      expect(typeof stateFunc.update).toBe("function");

      stateFunc.update(() => "updated");
      expect(wrapper()).toBe("updated");
    });
  });

  describe("edge cases", () => {
    it("should handle null values", () => {
      expect(stableEquals(null, null)).toEqual([true, null]);
      expect(stableEquals(null, "value")).toEqual([false, "value"]);
      expect(stableEquals("value", null)).toEqual([false, null]);
    });

    it("should handle NaN with strict equality", () => {
      // Object.is(NaN, NaN) returns true
      expect(stableEquals(NaN, NaN)).toEqual([true, NaN]);
    });

    it("should treat +0 and -0 as equal (fast path uses ===)", () => {
      // The fast path uses `===` which treats 0 and -0 as equal
      // Note: Object.is(+0, -0) returns false, but we use === for performance
      expect(stableEquals(0, -0)).toEqual([true, -0]);
    });

    it("should handle empty objects with shallow equality", () => {
      const [isEqual] = stableEquals({}, {}, "shallow");
      expect(isEqual).toBe(true);
    });

    it("should handle empty arrays with shallow equality", () => {
      const [isEqual] = stableEquals([], [], "shallow");
      expect(isEqual).toBe(true);
    });
  });
});

