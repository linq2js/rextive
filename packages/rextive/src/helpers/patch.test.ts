/**
 * Tests for patch() helper
 *
 * patch() is a utility for partial object updates in signal.set()
 */

import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { patch } from "./patch";

interface Person {
  name: string;
  age: number;
  address: {
    city: string;
    country: string;
  };
}

describe("patch", () => {
  describe("patch(partial) - partial object update", () => {
    it("should update single property", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch({ name: "Jane" }));

      expect(person()).toEqual({
        name: "Jane",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });
    });

    it("should update multiple properties", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch({ name: "Jane", age: 25 }));

      expect(person()).toEqual({
        name: "Jane",
        age: 25,
        address: { city: "NYC", country: "USA" },
      });
    });

    it("should replace nested object (shallow merge)", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch({ address: { city: "LA", country: "USA" } }));

      expect(person()).toEqual({
        name: "John",
        age: 30,
        address: { city: "LA", country: "USA" },
      });
    });

    it("should work with empty partial", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch({}));

      expect(person()).toEqual({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });
    });
  });

  describe("patch(key, value) - single property update", () => {
    it("should update single property by key", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch("name", "Jane"));

      expect(person()).toEqual({
        name: "Jane",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });
    });

    it("should update number property", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch("age", 25));

      expect(person()).toEqual({
        name: "John",
        age: 25,
        address: { city: "NYC", country: "USA" },
      });
    });

    it("should update nested object property", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch("address", { city: "LA", country: "USA" }));

      expect(person()).toEqual({
        name: "John",
        age: 30,
        address: { city: "LA", country: "USA" },
      });
    });
  });

  describe("type safety", () => {
    it("should be type-safe with partial objects", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      // This should compile - valid partial
      person.set(patch({ name: "Jane" }));
      person.set(patch({ age: 25 }));
      person.set(patch({ name: "Jane", age: 25 }));

      // Type checking ensures only valid keys are used
      expect(person().name).toBe("Jane");
    });

    it("should be type-safe with key-value syntax", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      // This should compile - valid key
      person.set(patch("name", "Jane"));
      person.set(patch("age", 25));

      expect(person().name).toBe("Jane");
      expect(person().age).toBe(25);
    });
  });

  describe("immutability", () => {
    it("should create new object reference", () => {
      const original = {
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      };
      const person = signal<Person>(original);

      person.set(patch({ name: "Jane" }));

      expect(person()).not.toBe(original);
      expect(original.name).toBe("John"); // Original unchanged
    });

    it("should preserve unmodified nested references", () => {
      const address = { city: "NYC", country: "USA" };
      const person = signal<Person>({
        name: "John",
        age: 30,
        address,
      });

      person.set(patch({ name: "Jane" }));

      // Address reference should be preserved since it wasn't modified
      expect(person().address).toBe(address);
    });
  });

  describe("edge cases", () => {
    it("should work with arrays", () => {
      const state = signal({ items: [1, 2, 3], count: 3 });

      state.set(patch({ items: [4, 5, 6] }));

      expect(state()).toEqual({ items: [4, 5, 6], count: 3 });
    });

    it("should work with null values", () => {
      const state = signal<{ name: string | null; age: number }>({
        name: "John",
        age: 30,
      });

      state.set(patch({ name: null }));

      expect(state()).toEqual({ name: null, age: 30 });
    });

    it("should work with undefined values", () => {
      const state = signal<{ name?: string; age: number }>({
        name: "John",
        age: 30,
      });

      state.set(patch({ name: undefined }));

      expect(state()).toEqual({ name: undefined, age: 30 });
    });
  });

  describe("patch(key, updater) - property update with function", () => {
    it("should update property with updater function", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch("age", (prev) => prev + 1));

      expect(person().age).toBe(31);
    });

    it("should update string property with updater", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(patch("name", (prev) => prev.toUpperCase()));

      expect(person().name).toBe("JOHN");
    });

    it("should update nested object with updater", () => {
      const person = signal<Person>({
        name: "John",
        age: 30,
        address: { city: "NYC", country: "USA" },
      });

      person.set(
        patch("address", (prev) => ({ ...prev, city: "LA" }))
      );

      expect(person().address).toEqual({ city: "LA", country: "USA" });
    });
  });
});

describe("patch for arrays", () => {
  describe("patch(index, value) - array index update", () => {
    it("should update item at index", () => {
      const items = signal([1, 2, 3, 4, 5]);

      items.set(patch(2, 100));

      expect(items()).toEqual([1, 2, 100, 4, 5]);
    });

    it("should update first item", () => {
      const items = signal(["a", "b", "c"]);

      items.set(patch(0, "x"));

      expect(items()).toEqual(["x", "b", "c"]);
    });

    it("should update last item with negative index", () => {
      const items = signal([1, 2, 3]);

      items.set(patch(-1, 100));

      expect(items()).toEqual([1, 2, 100]);
    });
  });

  describe("patch(index, updater) - array index update with function", () => {
    it("should update item at index with updater", () => {
      const items = signal([1, 2, 3, 4, 5]);

      items.set(patch(2, (prev) => prev * 10));

      expect(items()).toEqual([1, 2, 30, 4, 5]);
    });

    it("should update string item at index with updater", () => {
      const items = signal(["hello", "world"]);

      items.set(patch(0, (prev) => prev.toUpperCase()));

      expect(items()).toEqual(["HELLO", "world"]);
    });

    it("should update with negative index", () => {
      const items = signal([10, 20, 30]);

      items.set(patch(-1, (prev) => prev + 5));

      expect(items()).toEqual([10, 20, 35]);
    });
  });

  describe("patch('.push', ...values) - array push", () => {
    it("should push single value", () => {
      const items = signal([1, 2, 3]);

      items.set(patch(".push", 4));

      expect(items()).toEqual([1, 2, 3, 4]);
    });

    it("should push multiple values", () => {
      const items = signal([1, 2]);

      items.set(patch(".push", 3, 4, 5));

      expect(items()).toEqual([1, 2, 3, 4, 5]);
    });

    it("should push to empty array", () => {
      const items = signal<number[]>([]);

      items.set(patch(".push", 1, 2));

      expect(items()).toEqual([1, 2]);
    });
  });

  describe("patch('.pop') - array pop", () => {
    it("should remove last item", () => {
      const items = signal([1, 2, 3]);

      items.set(patch(".pop"));

      expect(items()).toEqual([1, 2]);
    });

    it("should handle single item array", () => {
      const items = signal([1]);

      items.set(patch(".pop"));

      expect(items()).toEqual([]);
    });

    it("should handle empty array", () => {
      const items = signal<number[]>([]);

      items.set(patch(".pop"));

      expect(items()).toEqual([]);
    });
  });

  describe("patch('.shift') - array shift", () => {
    it("should remove first item", () => {
      const items = signal([1, 2, 3]);

      items.set(patch(".shift"));

      expect(items()).toEqual([2, 3]);
    });

    it("should handle single item array", () => {
      const items = signal([1]);

      items.set(patch(".shift"));

      expect(items()).toEqual([]);
    });

    it("should handle empty array", () => {
      const items = signal<number[]>([]);

      items.set(patch(".shift"));

      expect(items()).toEqual([]);
    });
  });

  describe("patch('.unshift', ...values) - array unshift", () => {
    it("should add single value at start", () => {
      const items = signal([2, 3]);

      items.set(patch(".unshift", 1));

      expect(items()).toEqual([1, 2, 3]);
    });

    it("should add multiple values at start", () => {
      const items = signal([4, 5]);

      items.set(patch(".unshift", 1, 2, 3));

      expect(items()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("patch('.splice', start, deleteCount, ...items) - array splice", () => {
    it("should remove items", () => {
      const items = signal([1, 2, 3, 4, 5]);

      items.set(patch(".splice", 1, 2));

      expect(items()).toEqual([1, 4, 5]);
    });

    it("should insert items", () => {
      const items = signal([1, 4, 5]);

      items.set(patch(".splice", 1, 0, 2, 3));

      expect(items()).toEqual([1, 2, 3, 4, 5]);
    });

    it("should replace items", () => {
      const items = signal([1, 2, 3]);

      items.set(patch(".splice", 1, 1, 20, 30));

      expect(items()).toEqual([1, 20, 30, 3]);
    });

    it("should work with negative start", () => {
      const items = signal([1, 2, 3, 4, 5]);

      items.set(patch(".splice", -2, 2));

      expect(items()).toEqual([1, 2, 3]);
    });
  });

  describe("patch('.reverse') - array reverse", () => {
    it("should reverse array", () => {
      const items = signal([1, 2, 3]);

      items.set(patch(".reverse"));

      expect(items()).toEqual([3, 2, 1]);
    });
  });

  describe("patch('.sort') - array sort", () => {
    it("should sort array with default comparator", () => {
      const items = signal([3, 1, 2]);

      items.set(patch(".sort"));

      expect(items()).toEqual([1, 2, 3]);
    });

    it("should sort array with custom comparator", () => {
      const items = signal([3, 1, 2]);

      items.set(patch(".sort", (a, b) => b - a));

      expect(items()).toEqual([3, 2, 1]);
    });
  });

  describe("patch('.fill', value, start?, end?) - array fill", () => {
    it("should fill entire array", () => {
      const items = signal([1, 2, 3]);

      items.set(patch(".fill", 0));

      expect(items()).toEqual([0, 0, 0]);
    });

    it("should fill from start index", () => {
      const items = signal([1, 2, 3, 4]);

      items.set(patch(".fill", 0, 2));

      expect(items()).toEqual([1, 2, 0, 0]);
    });

    it("should fill range", () => {
      const items = signal([1, 2, 3, 4, 5]);

      items.set(patch(".fill", 0, 1, 4));

      expect(items()).toEqual([1, 0, 0, 0, 5]);
    });
  });

  describe("patch('.filter', predicate) - array filter", () => {
    it("should filter array", () => {
      const items = signal([1, 2, 3, 4, 5]);

      items.set(patch(".filter", (x) => x % 2 === 0));

      expect(items()).toEqual([2, 4]);
    });

    it("should handle empty result", () => {
      const items = signal([1, 3, 5]);

      items.set(patch(".filter", (x) => x % 2 === 0));

      expect(items()).toEqual([]);
    });
  });

  describe("patch('.map', mapper) - array map", () => {
    it("should map array", () => {
      const items = signal([1, 2, 3]);

      items.set(patch(".map", (x) => x * 2));

      expect(items()).toEqual([2, 4, 6]);
    });
  });

  describe("immutability for arrays", () => {
    it("should create new array reference", () => {
      const original = [1, 2, 3];
      const items = signal(original);

      items.set(patch(0, 100));

      expect(items()).not.toBe(original);
      expect(original).toEqual([1, 2, 3]); // Original unchanged
    });
  });
});

