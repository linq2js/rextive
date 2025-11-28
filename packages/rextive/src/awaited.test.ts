/**
 * Tests for awaited() helper
 */
import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { awaited } from "./awaited";

describe("awaited() helper", () => {
  it("should work with non-promise values (sync)", () => {
    const data = signal(5);
    const doubled = data.to(awaited((x) => x * 2));

    expect(doubled()).toBe(10);
  });

  it("should work with promise values (async)", async () => {
    const data = signal(Promise.resolve(5));
    const doubled = data.to(awaited((x) => x * 2));

    const result = doubled();
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(10);
  });

  it("should update when source changes (sync)", () => {
    const data = signal(5);
    const doubled = data.to(awaited((x) => x * 2));

    expect(doubled()).toBe(10);

    data.set(10);
    expect(doubled()).toBe(20);
  });

  it("should update when source changes (async)", async () => {
    const data = signal(Promise.resolve(5));
    const doubled = data.to(awaited((x) => x * 2));

    expect(await doubled()).toBe(10);

    data.set(Promise.resolve(10));
    expect(await doubled()).toBe(20);
  });

  it("should work with mixed promise/non-promise values", async () => {
    const data = signal<number | Promise<number>>(5);
    const doubled = data.to(awaited((x) => x * 2));

    // Sync value
    expect(doubled()).toBe(10);

    // Promise value
    data.set(Promise.resolve(10));
    expect(await doubled()).toBe(20);

    // Back to sync
    data.set(15);
    expect(doubled()).toBe(30);
  });

  it("should work with array transformations", async () => {
    const todos = signal(
      Promise.resolve([
        { id: 1, title: "Buy milk", done: false },
        { id: 2, title: "Walk dog", done: true },
      ])
    );

    const titles = todos.to(awaited((items) => items.map((t) => t.title)));

    expect(await titles()).toEqual(["Buy milk", "Walk dog"]);
  });

  it("should work with object transformations", async () => {
    const user = signal(
      Promise.resolve({
        id: 1,
        name: "Alice",
        age: 30,
        email: "alice@example.com",
      })
    );

    const name = user.to(awaited((u) => u.name));

    expect(await name()).toBe("Alice");
  });

  it("should chain multiple selectors within awaited()", async () => {
    const data = signal(Promise.resolve(5));

    const result = data.to(
      awaited(
        (x) => x * 2, // 10
        (x) => x + 1, // 11
        (x) => `Value: ${x}` // "Value: 11"
      )
    );

    expect(await result()).toBe("Value: 11");
  });

  it("should chain multiple selectors with non-promise values", () => {
    const data = signal(5);

    const result = data.to(
      awaited(
        (x) => x * 2, // 10
        (x) => x + 1, // 11
        (x) => `Value: ${x}` // "Value: 11"
      )
    );

    expect(result()).toBe("Value: 11");
  });

  it("should work with .pipe() and to operator", async () => {
    const { to } = await import("./operators");

    const data = signal(Promise.resolve(5));
    const doubled = data.pipe(to(awaited((x) => x * 2)));

    expect(await doubled()).toBe(10);
  });

  it("should handle async selector functions", async () => {
    const data = signal(5);

    const result = data.to(
      awaited(async (x) => {
        await new Promise((r) => setTimeout(r, 10));
        return x * 2;
      })
    );

    expect(await result()).toBe(10);
  });

  it("should handle promise rejection", async () => {
    const data = signal(Promise.reject(new Error("Failed")));
    const result = data.to(awaited((x) => x * 2));

    await expect(result()).rejects.toThrow("Failed");
  });

  it("should subscribe to changes", async () => {
    const data = signal(Promise.resolve(5));
    const doubled = data.to(awaited((x) => x * 2));

    // Wait for initial value
    await doubled();

    const spy = vi.fn();
    doubled.on(spy);

    data.set(Promise.resolve(10));

    // Wait for update
    await new Promise((r) => setTimeout(r, 10));

    expect(spy).toHaveBeenCalled();
  });

  it("should work with complex nested transformations", async () => {
    const data = signal(
      Promise.resolve({
        users: [
          { name: "Alice", scores: [85, 90, 95] },
          { name: "Bob", scores: [70, 80, 90] },
        ],
      })
    );

    const result = data.to(
      awaited(
        (d) => d.users,
        (users) =>
          users.map((u) => ({
            name: u.name,
            avg: u.scores.reduce((a, b) => a + b, 0) / u.scores.length,
          })),
        (users) => users.find((u) => u.avg > 85),
        (user) => user?.name ?? "None"
      )
    );

    expect(await result()).toBe("Alice");
  });

  it("should not re-await non-promise values", () => {
    let computeCount = 0;

    const data = signal(5);
    const doubled = data.to(
      awaited((x) => {
        computeCount++;
        return x * 2;
      })
    );

    expect(computeCount).toBe(0); // Lazy

    doubled(); // First access
    expect(computeCount).toBe(1);

    doubled(); // Second access (should use cache)
    expect(computeCount).toBe(1);

    data.set(10); // Change source
    doubled(); // Should recompute
    expect(computeCount).toBe(2);
  });
});
