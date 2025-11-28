/**
 * Tests for explicit overloads of pipe() and to()
 * This file verifies that type inference works correctly with the new overloads
 */
import { describe, it, expect } from "vitest";
import { signal } from "./signal";
import { to } from "./operators";

describe("pipe() explicit overloads", () => {
  it("should infer types correctly with 1 operator", () => {
    const count = signal(5);
    const doubled = count.pipe(to((x) => x * 2));

    expect(doubled()).toBe(10);

    // Type check: result should be ComputedSignal<number>
    const value: number = doubled();
    expect(typeof value).toBe("number");
  });

  it("should infer types correctly with 3 operators", () => {
    const count = signal(5);
    const result = count.pipe(
      to((x) => x * 2), // number -> number
      to((x) => x + 1), // number -> number
      to((x) => `Value: ${x}`) // number -> string
    );

    expect(result()).toBe("Value: 11");

    // Type check: result should be ComputedSignal<string>
    const value: string = result();
    expect(typeof value).toBe("string");
  });

  it("should infer types correctly with complex transformations", () => {
    const user = signal({ name: "Alice", age: 30 });
    const result = user.pipe(
      to((u) => u.name), // { name, age } -> string
      to((name) => name.length), // string -> number
      to((len) => len > 5) // number -> boolean
    );

    expect(result()).toBe(false); // "Alice".length = 5, which is NOT > 5

    // Type check: result should be ComputedSignal<boolean>
    const value: boolean = result();
    expect(typeof value).toBe("boolean");
  });
});

describe("to() explicit overloads", () => {
  it("should infer types correctly with 1 selector", () => {
    const user = signal({ name: "Alice", age: 30 });
    const name = user.to((u) => u.name);

    expect(name()).toBe("Alice");

    // Type check: result should be ComputedSignal<string>
    const value: string = name();
    expect(typeof value).toBe("string");
  });

  it("should infer types correctly with 3 selectors", () => {
    const user = signal({ name: "Alice", age: 30 });
    const greeting = user.pipe(
      to((u) => u.name), // string
      to((name) => name.toUpperCase()), // string
      to((name) => `Hello, ${name}!`) // string
    );

    expect(greeting()).toBe("Hello, ALICE!");

    // Type check: result should be ComputedSignal<string>
    const value: string = greeting();
    expect(typeof value).toBe("string");
  });

  it("should infer types correctly with type transformations", () => {
    const count = signal(42);
    const result = count.pipe(
      to((x) => x * 2), // number -> number
      to((x) => x.toString()), // number -> string
      to((str) => str.length), // string -> number
      to((len) => len > 1) // number -> boolean
    );

    expect(result()).toBe(true);

    // Type check: result should be ComputedSignal<boolean>
    const value: boolean = result();
    expect(typeof value).toBe("boolean");
  });

  it("should infer types correctly with arrays", () => {
    const numbers = signal([1, 2, 3, 4, 5]);
    const result = numbers.pipe(
      to((arr) => arr.filter((x) => x > 2)), // number[] -> number[] = [3, 4, 5]
      to((arr) => arr.map((x) => x * 2)), // number[] -> number[] = [6, 8, 10]
      to((arr) => arr.reduce((a, b) => a + b, 0)) // number[] -> number = 24
    );

    expect(result()).toBe(24); // (3 * 2) + (4 * 2) + (5 * 2) = 6 + 8 + 10 = 24

    // Type check: result should be ComputedSignal<number>
    const value: number = result();
    expect(typeof value).toBe("number");
  });
});

describe("Combined pipe() and to()", () => {
  it("should work together correctly", () => {
    const count = signal(5);

    // Use pipe() to transform the signal
    const doubled = count.pipe(to((x) => x * 2));

    // Use to() for simple single transformation
    const result = doubled.to((x) => `Result: ${x}`);

    expect(result()).toBe("Result: 10");

    // Type check
    const value: string = result();
    expect(typeof value).toBe("string");
  });
});
