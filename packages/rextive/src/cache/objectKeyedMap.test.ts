import { describe, it, expect } from "vitest";
import { stableStringify, ObjectKeyedMap } from "./objectKeyedMap";

describe("stableStringify", () => {
  describe("primitives", () => {
    it("should stringify strings", () => {
      expect(stableStringify("hello")).toBe('"hello"');
    });

    it("should stringify numbers", () => {
      expect(stableStringify(42)).toBe("42");
      expect(stableStringify(3.14)).toBe("3.14");
      expect(stableStringify(-10)).toBe("-10");
    });

    it("should stringify booleans", () => {
      expect(stableStringify(true)).toBe("true");
      expect(stableStringify(false)).toBe("false");
    });

    it("should stringify null", () => {
      expect(stableStringify(null)).toBe("null");
    });

    it("should stringify undefined as null", () => {
      // Both null and undefined serialize to "null" to avoid multiple nullish keys
      expect(stableStringify(undefined)).toBe("null");
    });

    it("should treat null and undefined as the same key", () => {
      expect(stableStringify(null)).toBe(stableStringify(undefined));
    });
  });

  describe("arrays", () => {
    it("should stringify arrays", () => {
      expect(stableStringify([1, 2, 3])).toBe("[1,2,3]");
    });

    it("should stringify nested arrays", () => {
      expect(
        stableStringify([
          [1, 2],
          [3, 4],
        ])
      ).toBe("[[1,2],[3,4]]");
    });

    it("should stringify arrays with mixed types", () => {
      expect(stableStringify([1, "a", true, null])).toBe('[1,"a",true,null]');
    });
  });

  describe("objects", () => {
    it("should stringify objects with sorted keys", () => {
      expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    });

    it("should produce same output regardless of key order", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };
      const obj3 = { b: 2, c: 3, a: 1 };

      const result = stableStringify(obj1);
      expect(stableStringify(obj2)).toBe(result);
      expect(stableStringify(obj3)).toBe(result);
    });

    it("should stringify nested objects with sorted keys", () => {
      const obj = { z: { b: 2, a: 1 }, y: 1 };
      expect(stableStringify(obj)).toBe('{"y":1,"z":{"a":1,"b":2}}');
    });

    it("should stringify empty objects", () => {
      expect(stableStringify({})).toBe("{}");
    });

    it("should stringify objects with special characters in keys", () => {
      const obj = { "special key": 1, normal: 2 };
      expect(stableStringify(obj)).toBe('{"normal":2,"special key":1}');
    });
  });

  describe("complex nested structures", () => {
    it("should handle deeply nested objects", () => {
      const obj = { c: { b: { a: 1 } } };
      expect(stableStringify(obj)).toBe('{"c":{"b":{"a":1}}}');
    });

    it("should handle objects containing arrays", () => {
      const obj = { b: [1, 2], a: [3, 4] };
      expect(stableStringify(obj)).toBe('{"a":[3,4],"b":[1,2]}');
    });

    it("should handle arrays containing objects", () => {
      const arr = [
        { b: 2, a: 1 },
        { d: 4, c: 3 },
      ];
      expect(stableStringify(arr)).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
    });
  });

  describe("caching", () => {
    it("should return cached result for same object reference", () => {
      const obj = { b: 2, a: 1 };
      const result1 = stableStringify(obj);
      const result2 = stableStringify(obj);
      expect(result1).toBe(result2);
      expect(result1).toBe('{"a":1,"b":2}');
    });

    it("should produce same string for different objects with same content", () => {
      const obj1 = { id: 1, name: "Alice" };
      const obj2 = { name: "Alice", id: 1 };
      expect(stableStringify(obj1)).toBe(stableStringify(obj2));
    });
  });
});

describe("ObjectKeyedMap", () => {
  describe("basic operations", () => {
    it("should set and get values with primitive keys", () => {
      const map = new ObjectKeyedMap<string, number>();
      map.set("key", 42);
      expect(map.get("key")).toBe(42);
    });

    it("should set and get values with number keys", () => {
      const map = new ObjectKeyedMap<number, string>();
      map.set(123, "value");
      expect(map.get(123)).toBe("value");
    });

    it("should set and get values with object keys", () => {
      const map = new ObjectKeyedMap<{ id: number }, string>();
      map.set({ id: 1 }, "value1");
      map.set({ id: 2 }, "value2");

      expect(map.get({ id: 1 })).toBe("value1");
      expect(map.get({ id: 2 })).toBe("value2");
    });

    it("should return undefined for missing keys", () => {
      const map = new ObjectKeyedMap<string, number>();
      expect(map.get("missing")).toBeUndefined();
    });
  });

  describe("object key handling", () => {
    it("should treat objects with same content but different order as equal", () => {
      const map = new ObjectKeyedMap<{ a: number; b: number }, string>();
      map.set({ a: 1, b: 2 }, "value");

      expect(map.get({ b: 2, a: 1 })).toBe("value");
    });

    it("should treat objects with same content but different reference as equal", () => {
      const map = new ObjectKeyedMap<{ id: number }, string>();
      map.set({ id: 1 }, "value");

      const differentRef = { id: 1 };
      expect(map.get(differentRef)).toBe("value");
    });

    it("should treat nested objects with different order as equal", () => {
      const map = new ObjectKeyedMap<
        { user: { name: string; age: number } },
        string
      >();
      map.set({ user: { name: "Alice", age: 30 } }, "value");

      expect(map.get({ user: { age: 30, name: "Alice" } })).toBe("value");
    });
  });

  describe("has and delete", () => {
    it("should check existence with has()", () => {
      const map = new ObjectKeyedMap<{ id: number }, string>();
      map.set({ id: 1 }, "value");

      expect(map.has({ id: 1 })).toBe(true);
      expect(map.has({ id: 2 })).toBe(false);
    });

    it("should delete entries", () => {
      const map = new ObjectKeyedMap<{ id: number }, string>();
      map.set({ id: 1 }, "value");

      expect(map.delete({ id: 1 })).toBe(true);
      expect(map.has({ id: 1 })).toBe(false);
      expect(map.delete({ id: 1 })).toBe(false);
    });
  });

  describe("size and clear", () => {
    it("should track size", () => {
      const map = new ObjectKeyedMap<string, number>();
      expect(map.size).toBe(0);

      map.set("a", 1);
      expect(map.size).toBe(1);

      map.set("b", 2);
      expect(map.size).toBe(2);

      map.delete("a");
      expect(map.size).toBe(1);
    });

    it("should clear all entries", () => {
      const map = new ObjectKeyedMap<string, number>();
      map.set("a", 1);
      map.set("b", 2);

      map.clear();
      expect(map.size).toBe(0);
      expect(map.has("a")).toBe(false);
    });
  });

  describe("iteration", () => {
    it("should iterate with forEach", () => {
      const map = new ObjectKeyedMap<string, number>();
      map.set("a", 1);
      map.set("b", 2);

      const entries: Array<[string, number]> = [];
      map.forEach((value, key) => {
        entries.push([key, value]);
      });

      expect(entries).toHaveLength(2);
      expect(entries).toContainEqual(["a", 1]);
      expect(entries).toContainEqual(["b", 2]);
    });

    it("should return keys", () => {
      const map = new ObjectKeyedMap<{ id: number }, string>();
      map.set({ id: 1 }, "a");
      map.set({ id: 2 }, "b");

      const keys = map.keys();
      expect(keys).toHaveLength(2);
    });

    it("should return values", () => {
      const map = new ObjectKeyedMap<string, number>();
      map.set("a", 1);
      map.set("b", 2);

      const values = map.values();
      expect(values).toContain(1);
      expect(values).toContain(2);
    });

    it("should return entries", () => {
      const map = new ObjectKeyedMap<string, number>();
      map.set("a", 1);
      map.set("b", 2);

      const entries = map.entries();
      expect(entries).toHaveLength(2);
      expect(entries).toContainEqual(["a", 1]);
      expect(entries).toContainEqual(["b", 2]);
    });

    it("should be iterable with for...of", () => {
      const map = new ObjectKeyedMap<string, number>();
      map.set("a", 1);
      map.set("b", 2);

      const entries: Array<[string, number]> = [];
      for (const [key, value] of map) {
        entries.push([key, value]);
      }

      expect(entries).toHaveLength(2);
    });
  });

  describe("custom stringify", () => {
    it("should use custom stringify function", () => {
      const map = new ObjectKeyedMap<{ userId: number }, string>({
        stringify: (key) => `user:${key.userId}`,
      });

      map.set({ userId: 1 }, "Alice");
      expect(map.get({ userId: 1 })).toBe("Alice");
    });

    it("should allow different objects to map to same key with custom stringify", () => {
      interface User {
        id: number;
        name: string;
        timestamp: number;
      }

      // Ignore timestamp in key comparison
      const map = new ObjectKeyedMap<User, string>({
        stringify: (key) => `user:${key.id}`,
      });

      map.set({ id: 1, name: "Alice", timestamp: 1000 }, "first");
      map.set({ id: 1, name: "Alice", timestamp: 2000 }, "second");

      // Second set should overwrite first (same stringify key)
      expect(map.size).toBe(1);
      expect(map.get({ id: 1, name: "Alice", timestamp: 3000 })).toBe("second");
    });
  });

  describe("getEntry", () => {
    it("should return entry with original key and value", () => {
      const map = new ObjectKeyedMap<{ id: number }, string>();
      const originalKey = { id: 1 };
      map.set(originalKey, "value");

      const entry = map.getEntry({ id: 1 });
      expect(entry).toBeDefined();
      expect(entry?.key).toBe(originalKey);
      expect(entry?.value).toBe("value");
    });

    it("should return undefined for missing key", () => {
      const map = new ObjectKeyedMap<string, number>();
      expect(map.getEntry("missing")).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should treat null and undefined as the same key", () => {
      const map = new ObjectKeyedMap<null | undefined, string>();
      map.set(null, "null value");
      map.set(undefined, "overwritten by undefined");

      // Both map to the same key
      expect(map.size).toBe(1);
      expect(map.get(null)).toBe("overwritten by undefined");
      expect(map.get(undefined)).toBe("overwritten by undefined");
    });

    it("should handle boolean keys", () => {
      const map = new ObjectKeyedMap<boolean, string>();
      map.set(true, "true value");
      map.set(false, "false value");

      expect(map.get(true)).toBe("true value");
      expect(map.get(false)).toBe("false value");
    });

    it("should handle empty object keys", () => {
      const map = new ObjectKeyedMap<{}, string>();
      map.set({}, "empty object");

      expect(map.get({})).toBe("empty object");
    });

    it("should update value when setting same key", () => {
      const map = new ObjectKeyedMap<{ id: number }, string>();
      map.set({ id: 1 }, "first");
      map.set({ id: 1 }, "second");

      expect(map.size).toBe(1);
      expect(map.get({ id: 1 })).toBe("second");
    });
  });
});
