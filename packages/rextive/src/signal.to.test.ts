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

  it("should access context parameter", () => {
    const count = signal(5);
    const result = count.to((x, ctx) => {
      // Context should be available
      expect(ctx).toBeDefined();
      expect(ctx.abortSignal).toBeDefined();
      return x * 2;
    });

    expect(result()).toBe(10);
  });

  it("to: loadable", async () => {
    const loading = signal(Promise.resolve(42)).to(loadable);
    expect(loading().status).toBe("loading");
    await wait.delay(10);
    expect(loading().status).toBe("success");
    expect(loading().value).toBe(42);
  });
});
