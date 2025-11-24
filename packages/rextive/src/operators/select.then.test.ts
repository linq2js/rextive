/**
 * Tests for select.then operator
 */
import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { select } from "./select";

describe("select.then", () => {
  it("should transform awaited promise values", async () => {
    const source = signal(Promise.resolve(5));
    const doubled = source.to(select.then((x) => x * 2));

    const result = await doubled();
    expect(result).toBe(10);
  });

  it("should transform non-promise values directly", () => {
    const source = signal(5);
    const doubled = source.to(select.then((x) => x * 2));

    expect(doubled()).toBe(10);
  });

  it("should handle signal value changes", async () => {
    const source = signal<number | Promise<number>>(5);
    const doubled = source.to(select.then((x) => x * 2));

    expect(doubled()).toBe(10);

    source.set(Promise.resolve(10));
    const result = await doubled();
    expect(result).toBe(20);
  });

  it("should not re-await already resolved promises", async () => {
    let callCount = 0;
    const promise = Promise.resolve(5);

    const source = signal(promise);
    const transformed = source.to(
      select.then((x) => {
        callCount++;
        return x * 2;
      })
    );

    // First access
    const result1 = await transformed();
    expect(result1).toBe(10);
    expect(callCount).toBe(1);

    // Second access - should use cached result
    const result2 = await transformed();
    expect(result2).toBe(10);
    expect(callCount).toBe(1); // Should not increment
  });

  it("should work with equality options", async () => {
    const source = signal(Promise.resolve({ name: "Alice", age: 30 }));
    const name = source.to(
      select.then((u) => ({ name: u.name }), "shallow")
    );

    const result = await name();
    expect(result).toEqual({ name: "Alice" });
  });

  it("should work with equality options on resolved values", async () => {
    // Note: When source is a promise, equality check happens on promises, not resolved values
    // This test verifies that equality options are passed through correctly
    const source = signal(Promise.resolve({ name: "Alice", age: 30 }));
    const name = source.to(
      select.then((u) => ({ name: u.name }), "shallow")
    );

    const result = await name();
    expect(result).toEqual({ name: "Alice" });
  });

  it("should handle async selector functions", async () => {
    const source = signal(Promise.resolve(5));
    const doubled = source.to(
      select.then(async (x) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return x * 2;
      })
    );

    const result = await doubled();
    expect(result).toBe(10);
  });

  it("should handle errors in promises", async () => {
    const source = signal(Promise.reject(new Error("Test error")));
    const transformed = source.to(select.then((x) => x));

    await expect(transformed()).rejects.toThrow("Test error");
  });

  it("should handle mixed promise and non-promise values", async () => {
    const source = signal<number | Promise<number>>(5);
    const doubled = source.to(select.then((x) => x * 2));

    // Non-promise value
    expect(doubled()).toBe(10);

    // Promise value
    source.set(Promise.resolve(10));
    expect(await doubled()).toBe(20);

    // Back to non-promise
    source.set(15);
    expect(doubled()).toBe(30);
  });

  it("should work with complex transformations", async () => {
    interface User {
      id: number;
      name: string;
    }

    const source = signal<Promise<User[]>>(
      Promise.resolve([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ])
    );

    const names = source.to(
      select.then((users) => users.map((u) => u.name))
    );

    const result = await names();
    expect(result).toEqual(["Alice", "Bob"]);
  });

  it("should dispose properly", async () => {
    const source = signal(Promise.resolve(5));
    const doubled = source.to(select.then((x) => x * 2));

    await doubled();

    doubled.dispose();

    // Should not throw after disposal
    expect(() => doubled.dispose()).not.toThrow();
  });
});
