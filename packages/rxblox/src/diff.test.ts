import { describe, it, expect } from "vitest";
import { signal } from "./signal";
import { snapshot } from "./snapshot";
import { diff } from "./diff";

describe("diff", () => {
  it("should return undefined when values are identical", () => {
    const a = { count: 0, name: "John" };
    const b = { count: 0, name: "John" };

    expect(diff(a, b)).toBeUndefined();
  });

  it("should detect changed properties in objects", () => {
    const before = { count: 0, name: "John", age: 30 };
    const after = { count: 5, name: "John", age: 30 };

    const delta = diff(after, before);
    expect(delta).toEqual({ count: 5 });
  });

  it("should detect new properties", () => {
    const before = { count: 0 };
    const after = { count: 0, name: "John" };

    const delta = diff(after, before);
    expect(delta).toEqual({ name: "John" });
  });

  it("should detect deleted properties", () => {
    const before = { count: 0, name: "John" };
    const after = { count: 0 };

    const delta = diff(after, before);
    expect(delta).toEqual({ name: undefined });
  });

  it("should handle nested object changes", () => {
    const before = {
      user: { name: "John", age: 30 },
      count: 5,
    };
    const after = {
      user: { name: "Jane", age: 30 },
      count: 5,
    };

    const delta = diff(after, before);
    expect(delta).toEqual({
      user: { name: "Jane" },
    });
  });

  it("should return entire array if any element changes", () => {
    const before = { items: [1, 2, 3] };
    const after = { items: [1, 2, 4] };

    const delta = diff(after, before);
    expect(delta).toEqual({ items: [1, 2, 4] });
  });

  it("should return entire array if length changes", () => {
    const before = { items: [1, 2, 3] };
    const after = { items: [1, 2] };

    const delta = diff(after, before);
    expect(delta).toEqual({ items: [1, 2] });
  });

  it("should handle primitive value changes", () => {
    const before = 42;
    const after = 100;

    const delta = diff(after, before);
    expect(delta).toBe(100);
  });

  it("should handle null and undefined", () => {
    const snap1: unknown = { value: null };
    const snap2: unknown = { value: "hello" };

    const delta = diff(snap2, snap1);
    expect(delta).toEqual({ value: "hello" });
  });

  it("should return undefined for identical primitives", () => {
    expect(diff(42, 42)).toBeUndefined();
    expect(diff("hello", "hello")).toBeUndefined();
    expect(diff(true, true)).toBeUndefined();
    expect(diff(null, null)).toBeUndefined();
  });

  it("should handle deep nested changes", () => {
    const before = {
      level1: {
        level2: {
          level3: {
            value: "old",
            keep: true,
          },
        },
      },
    };
    const after = {
      level1: {
        level2: {
          level3: {
            value: "new",
            keep: true,
          },
        },
      },
    };

    const delta = diff(after, before);
    expect(delta).toEqual({
      level1: {
        level2: {
          level3: {
            value: "new",
          },
        },
      },
    });
  });

  it("should work with signal.snapshot for change tracking", () => {
    const formData = {
      name: signal("John"),
      email: signal("john@example.com"),
      age: signal(30),
    };

    const before = snapshot(formData);

    // Update form
    formData.name.set("Jane");
    formData.age.set(31);

    const after = snapshot(formData);
    const changes = diff(after, before);

    expect(changes).toEqual({
      name: "Jane",
      age: 31,
    });
  });

  it("should handle array of objects", () => {
    const before = {
      todos: [
        { id: 1, text: "Task 1" },
        { id: 2, text: "Task 2" },
      ],
    };
    const after = {
      todos: [
        { id: 1, text: "Task 1 Updated" },
        { id: 2, text: "Task 2" },
      ],
    };

    const delta = diff(after, before);
    // Entire array is returned when any element changes
    expect(delta).toEqual({ todos: after.todos });
  });

  it("should handle Date objects", () => {
    const date1 = new Date("2024-01-01");
    const date2 = new Date("2024-01-02");

    const before = { created: date1 };
    const after = { created: date2 };

    const delta = diff(after, before);
    expect(delta).toEqual({ created: date2 });
  });

  it("should handle identical Date objects", () => {
    const date1 = new Date("2024-01-01");
    const date2 = new Date("2024-01-01"); // Same value, different instance

    const before = { created: date1 };
    const after = { created: date2 };

    const delta = diff(after, before);
    expect(delta).toBeUndefined();
  });

  it("should handle RegExp objects", () => {
    const pattern1 = /test/gi;
    const pattern2 = /other/gi;

    const before = { pattern: pattern1 };
    const after = { pattern: pattern2 };

    const delta = diff(after, before);
    expect(delta).toEqual({ pattern: pattern2 });
  });

  it("should handle identical RegExp objects", () => {
    const pattern1 = /test/gi;
    const pattern2 = /test/gi; // Same pattern, different instance

    const before = { pattern: pattern1 };
    const after = { pattern: pattern2 };

    const delta = diff(after, before);
    expect(delta).toBeUndefined();
  });

  it("should handle same reference returns undefined", () => {
    const obj = { count: 0, name: "John" };

    expect(diff(obj, obj)).toBeUndefined();
  });

  it("should handle mixed changes", () => {
    const before = {
      string: "old",
      number: 10,
      bool: true,
      obj: { nested: "value" },
      arr: [1, 2, 3],
    };
    const after = {
      string: "new",
      number: 10,
      bool: false,
      obj: { nested: "value" },
      arr: [1, 2, 3],
    };

    const delta = diff(after, before);
    expect(delta).toEqual({
      string: "new",
      bool: false,
    });
  });

  it("should handle empty objects", () => {
    const before = {};
    const after = { name: "John" };

    const delta = diff(after, before);
    expect(delta).toEqual({ name: "John" });
  });

  it("should handle all properties deleted", () => {
    const before = { name: "John", age: 30 };
    const after = {};

    const delta = diff(after, before);
    expect(delta).toEqual({ name: undefined, age: undefined });
  });
});
