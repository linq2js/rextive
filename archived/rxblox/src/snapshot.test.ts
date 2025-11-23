import { describe, it, expect } from "vitest";
import { signal } from "./signal";
import { snapshot } from "./snapshot";

describe("snapshot", () => {
  it("should extract signal value at top level", () => {
    const count = signal(42);
    const result = snapshot(count);
    expect(result).toBe(42);
  });

  it("should extract signals from object", () => {
    const name = signal("John");
    const age = signal(30);
    const obj = { name, age };

    const result = snapshot(obj);
    expect(result).toEqual({ name: "John", age: 30 });
  });

  it("should extract signals from array", () => {
    const s1 = signal(1);
    const s2 = signal(2);
    const s3 = signal(3);
    const arr = [s1, s2, s3];

    const result = snapshot(arr);
    expect(result).toEqual([1, 2, 3]);
  });

  it("should handle nested objects", () => {
    const user = {
      name: signal("Alice"),
      profile: {
        email: signal("alice@example.com"),
        age: signal(25),
      },
    };

    const result = snapshot(user);
    expect(result).toEqual({
      name: "Alice",
      profile: {
        email: "alice@example.com",
        age: 25,
      },
    });
  });

  it("should handle nested arrays", () => {
    const matrix = [
      [signal(1), signal(2)],
      [signal(3), signal(4)],
    ];

    const result = snapshot(matrix);
    expect(result).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("should handle mixed signals and plain values", () => {
    const data = {
      id: 1, // plain
      name: signal("Product"),
      price: 99.99, // plain
      tags: [signal("new"), "featured", signal("sale")],
      metadata: {
        created: new Date("2024-01-01"),
        active: signal(true),
      },
    };

    const result = snapshot(data);
    expect(result).toEqual({
      id: 1,
      name: "Product",
      price: 99.99,
      tags: ["new", "featured", "sale"],
      metadata: {
        created: new Date("2024-01-01"),
        active: true,
      },
    });
  });

  it("should handle signal containing object", () => {
    const user = signal({ name: "Bob", age: 40 });
    const result = snapshot(user);
    expect(result).toEqual({ name: "Bob", age: 40 });
  });

  it("should handle signal containing array", () => {
    const todos = signal(["Task 1", "Task 2", "Task 3"]);
    const result = snapshot(todos);
    expect(result).toEqual(["Task 1", "Task 2", "Task 3"]);
  });

  it("should handle deeply nested signals", () => {
    const deeply = {
      level1: {
        level2: {
          level3: {
            value: signal("deep"),
          },
        },
      },
    };

    const result = snapshot(deeply);
    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            value: "deep",
          },
        },
      },
    });
  });

  it("should handle array of objects with signals", () => {
    const todos = [
      { id: 1, text: signal("Buy milk"), completed: signal(false) },
      { id: 2, text: signal("Walk dog"), completed: signal(true) },
    ];

    const result = snapshot(todos);
    expect(result).toEqual([
      { id: 1, text: "Buy milk", completed: false },
      { id: 2, text: "Walk dog", completed: true },
    ]);
  });

  it("should handle signal containing signal", () => {
    const inner = signal(42);
    const outer = signal(inner);
    const result = snapshot(outer);
    expect(result).toBe(42);
  });

  it("should preserve null and undefined", () => {
    const data = {
      nullable: null,
      undef: undefined,
      value: signal(null),
    };

    const result = snapshot(data);
    expect(result).toEqual({
      nullable: null,
      undef: undefined,
      value: null,
    });
  });

  it("should preserve Date objects", () => {
    const date = new Date("2024-01-01");
    const data = { created: date };
    const result = snapshot(data);
    expect(result.created).toBe(date);
  });

  it("should preserve RegExp objects", () => {
    const pattern = /test/gi;
    const data = { pattern };
    const result = snapshot(data);
    expect(result.pattern).toBe(pattern);
  });

  it("should handle empty objects and arrays", () => {
    const data = {
      emptyObj: {},
      emptyArr: [],
      signalWithEmpty: signal({}),
    };

    const result = snapshot(data);
    expect(result).toEqual({
      emptyObj: {},
      emptyArr: [],
      signalWithEmpty: {},
    });
  });

  it("should handle circular references gracefully", () => {
    const obj: any = { name: signal("test") };
    obj.self = obj;

    const result = snapshot(obj);
    expect(result.name).toBe("test");
    expect(result.self).toBe(obj); // Circular reference preserved
  });

  it("should handle primitives directly", () => {
    expect(snapshot(42)).toBe(42);
    expect(snapshot("hello")).toBe("hello");
    expect(snapshot(true)).toBe(true);
    expect(snapshot(null)).toBe(null);
    expect(snapshot(undefined)).toBe(undefined);
  });

  it("should work with real-world API submission scenario", () => {
    const formData = {
      user: {
        name: signal("John Doe"),
        email: signal("john@example.com"),
      },
      todos: signal([
        { id: 1, text: signal("Task 1"), completed: signal(false) },
        { id: 2, text: signal("Task 2"), completed: signal(true) },
      ]),
      filter: signal("all"),
      timestamp: new Date(),
    };

    const payload = snapshot(formData);

    // Should be serializable to JSON
    expect(() => JSON.stringify(payload)).not.toThrow();

    const parsed = JSON.parse(JSON.stringify(payload));
    expect(parsed.user.name).toBe("John Doe");
    expect(parsed.todos[0].text).toBe("Task 1");
    expect(parsed.filter).toBe("all");
  });

  it("should not track signals during extraction", () => {
    const count = signal(0);
    let computeCount = 0;

    const computed = signal(() => {
      computeCount++;
      return count();
    });

    // First call triggers computation
    computed();
    expect(computeCount).toBe(1);

    // snapshot should use peek, not trigger tracking
    snapshot({ computed });
    expect(computeCount).toBe(1); // Still 1, not incremented
  });

  it("should handle signals with complex nested structures", () => {
    const appState = signal({
      users: [
        { id: 1, name: signal("Alice"), active: signal(true) },
        { id: 2, name: signal("Bob"), active: signal(false) },
      ],
      settings: {
        theme: signal("dark"),
        notifications: signal({ email: true, push: false }),
      },
    });

    const result = snapshot(appState);
    expect(result).toEqual({
      users: [
        { id: 1, name: "Alice", active: true },
        { id: 2, name: "Bob", active: false },
      ],
      settings: {
        theme: "dark",
        notifications: { email: true, push: false },
      },
    });
  });
});
