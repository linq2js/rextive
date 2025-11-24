/**
 * Tests for signal.to() - value selector chaining
 */
import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";

describe("signal.to() - value selector chaining", () => {
  it("should chain single selector", () => {
    const user = signal({ name: "Alice", age: 30 });
    const name = user.to((u) => u.name);

    expect(name()).toBe("Alice");
  });

  it("should chain two selectors", () => {
    const user = signal({ name: "Alice", age: 30 });
    const greeting = user.to(
      (u) => u.name,
      (name) => `Hello, ${name}!`
    );

    expect(greeting()).toBe("Hello, Alice!");
  });

  it("should chain three selectors", () => {
    const user = signal({ name: "Alice", age: 30 });
    const result = user.to(
      (u) => u.name,
      (name) => name.toUpperCase(),
      (name) => `Hello, ${name}!`
    );

    expect(result()).toBe("Hello, ALICE!");
  });

  it("should handle type transformations", () => {
    const count = signal(42);
    const result = count.to(
      (x) => x * 2,           // 84
      (x) => x + 10,          // 94
      (x) => `Count: ${x}`    // "Count: 94"
    );

    expect(result()).toBe("Count: 94");
  });

  it("should update when source changes", () => {
    const count = signal(5);
    const result = count.to(
      (x) => x * 2,
      (x) => x + 1
    );

    expect(result()).toBe(11); // (5 * 2) + 1

    count.set(10);
    expect(result()).toBe(21); // (10 * 2) + 1
  });

  it("should work with array operations", () => {
    const numbers = signal([1, 2, 3, 4, 5]);
    const sum = numbers.to(
      (arr) => arr.filter((x) => x > 2),
      (arr) => arr.map((x) => x * 2),
      (arr) => arr.reduce((a, b) => a + b, 0)
    );

    expect(sum()).toBe(24); // (3 + 4 + 5) * 2 = 24
  });

  it("should work with object transformations", () => {
    const user = signal({ firstName: "Alice", lastName: "Smith", age: 30 });
    const result = user.to(
      (u) => ({ fullName: `${u.firstName} ${u.lastName}`, age: u.age }),
      (u) => u.fullName,
      (name) => name.split(" "),
      (parts) => parts[0]
    );

    expect(result()).toBe("Alice");
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
    const result = count.to(
      (x) => x * 2,
      (x) => x + 1
    );

    expect(result()).toBe(11);

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

    const result = sum.to(
      (x) => x * 2,
      (x) => `Result: ${x}`
    );

    expect(result()).toBe("Result: 30");

    a.set(10);
    expect(result()).toBe("Result: 40");
  });

  it("should handle nullable values", () => {
    const value = signal<string | null>("test");
    const result = value.to(
      (str) => str?.toUpperCase(),
      (str) => str ?? "default"
    );

    expect(result()).toBe("TEST");

    value.set(null);
    expect(result()).toBe("default");
  });

  it("should handle union types", () => {
    const value = signal<number | string>(42);
    const result = value.to(
      (val) => typeof val === "number" ? val * 2 : val.length,
      (num) => `Value: ${num}`
    );

    expect(result()).toBe("Value: 84");

    value.set("hello");
    expect(result()).toBe("Value: 5");
  });

  it("should work with boolean transformations", () => {
    const count = signal(42);
    const result = count.to(
      (x) => x > 50,
      (bool) => !bool,
      (bool) => bool ? "yes" : "no"
    );

    expect(result()).toBe("yes");

    count.set(100);
    expect(result()).toBe("no");
  });

  it("should handle complex nested transformations", () => {
    const data = signal({
      users: [
        { name: "Alice", scores: [85, 90, 95] },
        { name: "Bob", scores: [70, 80, 90] }
      ]
    });

    const result = data.to(
      (d) => d.users,
      (users) => users.map((u) => ({
        name: u.name,
        avg: u.scores.reduce((a, b) => a + b, 0) / u.scores.length
      })),
      (users) => users.find((u) => u.avg > 85),
      (user) => user?.name ?? "None"
    );

    expect(result()).toBe("Alice");
  });

  it("should not re-compute unnecessarily", () => {
    let computeCount = 0;
    const count = signal(5);
    const result = count.to(
      (x) => {
        computeCount++;
        return x * 2;
      }
    );

    expect(computeCount).toBe(0); // Lazy

    result(); // First access
    expect(computeCount).toBe(1);

    result(); // Second access (should use cache)
    expect(computeCount).toBe(1);

    count.set(10); // Change source
    result(); // Should recompute
    expect(computeCount).toBe(2);
  });

  it("should work with empty selector list", () => {
    const count = signal(42);
    const result = count.to();

    expect(result()).toBe(42);
  });
});

