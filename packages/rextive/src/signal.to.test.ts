/**
 * Tests for signal.to() - single value selector
 */
import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { loadable } from "./utils/loadable";
import { wait } from "./wait";

describe("signal.to() - single selector", () => {
  it("should apply single selector", () => {
    const user = signal({ name: "Alice", age: 30 });
    const name = user.to((u) => u.name);

    expect(name()).toBe("Alice");
  });

  it("should transform number to string", () => {
    const count = signal(42);
    const result = count.to((x) => `Count: ${x}`);

    expect(result()).toBe("Count: 42");
  });

  it("should extract nested property", () => {
    const user = signal({ profile: { name: "Alice", age: 30 } });
    const userName = user.to((u) => u.profile.name);

    expect(userName()).toBe("Alice");
  });

  it("should handle type transformations", () => {
    const count = signal(42);
    const doubled = count.to((x) => x * 2);

    expect(doubled()).toBe(84);
  });

  it("should update when source changes", () => {
    const count = signal(5);
    const doubled = count.to((x) => x * 2);

    expect(doubled()).toBe(10);

    count.set(10);
    expect(doubled()).toBe(20);
  });

  it("should work with array operations", () => {
    const numbers = signal([1, 2, 3, 4, 5]);
    const sum = numbers.to((arr) => arr.reduce((a, b) => a + b, 0));

    expect(sum()).toBe(15);
  });

  it("should work with object transformations", () => {
    const user = signal({ firstName: "Alice", lastName: "Smith", age: 30 });
    const fullName = user.to((u) => `${u.firstName} ${u.lastName}`);

    expect(fullName()).toBe("Alice Smith");
  });

  it("should subscribe to changes", () => {
    const count = signal(5);
    const doubled = count.to((x) => x * 2);

    // Access to trigger initial computation
    expect(doubled()).toBe(10);

    const spy = vi.fn();
    doubled.on(spy);

    count.set(10);

    // The spy should be called once
    expect(spy).toHaveBeenCalledTimes(1);
    // And the doubled value should be updated
    expect(doubled()).toBe(20);
  });

  it("should dispose properly", () => {
    const count = signal(5);
    const result = count.to((x) => x * 2);

    expect(result()).toBe(10);

    const spy = vi.fn();
    result.on(spy);

    result.dispose();

    // After disposal, subscriptions should not fire
    count.set(10);
    expect(spy).not.toHaveBeenCalled();
  });

  it("should work with computed signals", () => {
    const a = signal(5);
    const b = signal(10);
    const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b);

    const result = sum.to((x) => `Result: ${x}`);

    expect(result()).toBe("Result: 15");

    a.set(10);
    expect(result()).toBe("Result: 20");
  });

  it("should handle nullable values", () => {
    const value = signal<string | null>("test");
    const result = value.to((str) => str?.toUpperCase() ?? "default");

    expect(result()).toBe("TEST");

    value.set(null);
    expect(result()).toBe("default");
  });

  it("should handle union types", () => {
    const value = signal<number | string>(42);
    const result = value.to((val) =>
      typeof val === "number" ? val * 2 : val.length
    );

    expect(result()).toBe(84);

    value.set("hello");
    expect(result()).toBe(5);
  });

  it("should work with boolean transformations", () => {
    const count = signal(42);
    const isLarge = count.to((x) => x > 50);

    expect(isLarge()).toBe(false);

    count.set(100);
    expect(isLarge()).toBe(true);
  });

  it("should handle complex nested transformations", () => {
    const data = signal({
      users: [
        { name: "Alice", scores: [85, 90, 95] },
        { name: "Bob", scores: [70, 80, 90] },
      ],
    });

    const topUser = data.to((d) => {
      const usersWithAvg = d.users.map((u) => ({
        name: u.name,
        avg: u.scores.reduce((a, b) => a + b, 0) / u.scores.length,
      }));
      return usersWithAvg.find((u) => u.avg > 85)?.name ?? "None";
    });

    expect(topUser()).toBe("Alice");
  });

  it("should not re-compute unnecessarily", () => {
    let computeCount = 0;
    const count = signal(5);
    const result = count.to((x) => {
      computeCount++;
      return x * 2;
    });

    expect(computeCount).toBe(0); // Lazy

    result(); // First access
    expect(computeCount).toBe(1);

    result(); // Second access (should use cache)
    expect(computeCount).toBe(1);

    count.set(10); // Change source
    result(); // Should recompute
    expect(computeCount).toBe(2);
  });
});

describe("signal.to() - multiple selectors", () => {
  it("should chain 2 selectors", () => {
    const user = signal({ name: "alice", age: 30 });
    const result = user.to(
      (u) => u.name,
      (name) => name.toUpperCase()
    );

    expect(result()).toBe("ALICE");
  });

  it("should chain 3 selectors", () => {
    const user = signal({ name: "alice", age: 30 });
    const result = user.to(
      (u) => u.name,
      (name) => name.toUpperCase(),
      (name) => `Hello, ${name}!`
    );

    expect(result()).toBe("Hello, ALICE!");
  });

  it("should chain 4 selectors with type transformations", () => {
    const count = signal(5);
    const result = count.to(
      (x) => x * 2, // 10
      (x) => x + 1, // 11
      (x) => `${x}`, // "11"
      (s) => s.length // 2
    );

    expect(result()).toBe(2);
  });

  it("should chain 5 selectors", () => {
    const data = signal({ value: 10 });
    const result = data.to(
      (d) => d.value, // 10
      (x) => x * 2, // 20
      (x) => x + 5, // 25
      (x) => Math.sqrt(x), // 5
      (x) => x.toFixed(1) // "5.0"
    );

    expect(result()).toBe("5.0");
  });

  it("should chain 6 selectors", () => {
    const items = signal([1, 2, 3, 4, 5]);
    const result = items.to(
      (arr) => arr.filter((x) => x > 2), // [3, 4, 5]
      (arr) => arr.map((x) => x * 2), // [6, 8, 10]
      (arr) => arr.reduce((a, b) => a + b, 0), // 24
      (x) => x / 3, // 8
      (x) => x.toString(), // "8"
      (s) => `Total: ${s}` // "Total: 8"
    );

    expect(result()).toBe("Total: 8");
  });

  it("should chain 7 selectors", () => {
    const count = signal(2);
    const result = count.to(
      (x) => x + 1, // 3
      (x) => x * 2, // 6
      (x) => x + 4, // 10
      (x) => x / 2, // 5
      (x) => x ** 2, // 25
      (x) => Math.sqrt(x), // 5
      (x) => `Result: ${x}` // "Result: 5"
    );

    expect(result()).toBe("Result: 5");
  });

  it("should chain 8 selectors", () => {
    const str = signal("hello");
    const result = str.to(
      (s) => s.toUpperCase(), // "HELLO"
      (s) => s.split(""), // ["H", "E", "L", "L", "O"]
      (arr) => arr.reverse(), // ["O", "L", "L", "E", "H"]
      (arr) => arr.join(""), // "OLLEH"
      (s) => s.toLowerCase(), // "olleh"
      (s) => s.charAt(0), // "o"
      (c) => c.charCodeAt(0), // 111
      (n) => n > 100 // true
    );

    expect(result()).toBe(true);
  });

  it("should chain 9 selectors", () => {
    const num = signal(1);
    const result = num.to(
      (x) => x + 1, // 2
      (x) => x * 2, // 4
      (x) => x + 1, // 5
      (x) => x * 2, // 10
      (x) => x + 1, // 11
      (x) => x * 2, // 22
      (x) => x + 1, // 23
      (x) => x * 2, // 46
      (x) => `Final: ${x}` // "Final: 46"
    );

    expect(result()).toBe("Final: 46");
  });

  it("should chain 10 selectors", () => {
    const num = signal(0);
    const result = num.to(
      (x) => x + 1, // 1
      (x) => x + 1, // 2
      (x) => x + 1, // 3
      (x) => x + 1, // 4
      (x) => x + 1, // 5
      (x) => x + 1, // 6
      (x) => x + 1, // 7
      (x) => x + 1, // 8
      (x) => x + 1, // 9
      (x) => x + 1 // 10
    );

    expect(result()).toBe(10);
  });

  it("should update when source changes with multiple selectors", () => {
    const user = signal({ name: "alice", age: 30 });
    const greeting = user.to(
      (u) => u.name,
      (name) => name.toUpperCase(),
      (name) => `Hello, ${name}!`
    );

    expect(greeting()).toBe("Hello, ALICE!");

    user.set({ name: "bob", age: 25 });
    expect(greeting()).toBe("Hello, BOB!");
  });

  it("should subscribe to changes with multiple selectors", () => {
    const count = signal(5);
    const result = count.to(
      (x) => x * 2,
      (x) => x + 1,
      (x) => `Value: ${x}`
    );

    expect(result()).toBe("Value: 11");

    const spy = vi.fn();
    result.on(spy);

    count.set(10);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result()).toBe("Value: 21");
  });

  it("should work with computed signals as source", () => {
    const a = signal(5);
    const b = signal(10);
    const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b);

    const result = sum.to(
      (x) => x * 2,
      (x) => `Sum doubled: ${x}`
    );

    expect(result()).toBe("Sum doubled: 30");

    a.set(10);
    expect(result()).toBe("Sum doubled: 40");
  });

  it("should handle complex object transformations", () => {
    const data = signal({
      users: [
        { name: "Alice", scores: [85, 90, 95] },
        { name: "Bob", scores: [70, 80, 90] },
      ],
    });

    const topPerformer = data.to(
      (d) => d.users,
      (users) =>
        users.map((u) => ({
          name: u.name,
          avg: u.scores.reduce((a, b) => a + b, 0) / u.scores.length,
        })),
      (usersWithAvg) => usersWithAvg.sort((a, b) => b.avg - a.avg)[0],
      (top) => `${top.name}: ${top.avg.toFixed(1)}`
    );

    expect(topPerformer()).toBe("Alice: 90.0");
  });

  it("should be lazy with multiple selectors", () => {
    let count1 = 0;
    let count2 = 0;
    let count3 = 0;

    const num = signal(5);
    const result = num.to(
      (x) => {
        count1++;
        return x * 2;
      },
      (x) => {
        count2++;
        return x + 1;
      },
      (x) => {
        count3++;
        return `Value: ${x}`;
      }
    );

    // Should be lazy - no computation yet
    expect(count1).toBe(0);
    expect(count2).toBe(0);
    expect(count3).toBe(0);

    // First access triggers computation
    expect(result()).toBe("Value: 11");
    expect(count1).toBe(1);
    expect(count2).toBe(1);
    expect(count3).toBe(1);

    // Second access uses cache
    expect(result()).toBe("Value: 11");
    expect(count1).toBe(1);
    expect(count2).toBe(1);
    expect(count3).toBe(1);
  });

  it("should dispose properly with multiple selectors", () => {
    const count = signal(5);
    const result = count.to(
      (x) => x * 2,
      (x) => x + 1
    );

    expect(result()).toBe(11);

    const spy = vi.fn();
    result.on(spy);

    result.dispose();

    count.set(10);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("signal.to() - with options", () => {
  it("should accept equality string as last parameter", () => {
    const user = signal({ name: "Alice", age: 30 });
    const profile = user.to((u) => ({ name: u.name }), "shallow");

    expect(profile()).toEqual({ name: "Alice" });

    // Same content, different reference - should NOT update with shallow equality
    const spy = vi.fn();
    profile.on(spy);

    user.set({ name: "Alice", age: 31 }); // name same, age different
    expect(spy).not.toHaveBeenCalled(); // No update because { name: "Alice" } is shallow equal
  });

  it("should accept options object as last parameter", () => {
    const count = signal(5);
    const result = count.to((x) => x * 2, { name: "doubled" });

    expect(result()).toBe(10);
    expect(result.displayName).toBe("doubled");
  });

  it("should work with multiple selectors and equality string", () => {
    const data = signal({ value: 10 });
    const result = data.to(
      (d) => d.value,
      (v) => ({ doubled: v * 2 }),
      "shallow"
    );

    expect(result()).toEqual({ doubled: 20 });
  });

  it("should work with multiple selectors and options object", () => {
    const count = signal(5);
    const result = count.to(
      (x) => x * 2,
      (x) => x + 1,
      (x) => `Value: ${x}`,
      { name: "formatted" }
    );

    expect(result()).toBe("Value: 11");
    expect(result.displayName).toBe("formatted");
  });

  it("should work with deep equality", () => {
    const source = signal({ nested: { value: 1 } });
    const result = source.to(
      (s) => ({ nested: { value: s.nested.value } }),
      "deep"
    );

    expect(result()).toEqual({ nested: { value: 1 } });

    const spy = vi.fn();
    result.on(spy);

    // Same deep structure - should NOT update
    source.set({ nested: { value: 1 } });
    expect(spy).not.toHaveBeenCalled();

    // Different deep value - should update
    source.set({ nested: { value: 2 } });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should work on computed signals with options", () => {
    const a = signal(5);
    const b = signal(10);
    const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b);

    const result = sum.to((x) => ({ total: x }), "shallow");

    expect(result()).toEqual({ total: 15 });
  });
});
