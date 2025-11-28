import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { max, min } from "./minmax";

describe("max", () => {
  it("should emit the maximum value seen so far", () => {
    const source = signal(5);
    const maximum = max<number>()(source);

    expect(maximum()).toBe(5);

    source.set(3);
    expect(maximum()).toBe(5); // 5 is still max

    source.set(7);
    expect(maximum()).toBe(7); // 7 is new max

    source.set(6);
    expect(maximum()).toBe(7); // 7 is still max

    source.set(10);
    expect(maximum()).toBe(10); // 10 is new max
  });

  it("should work with custom comparer", () => {
    const source = signal({ value: 5 });
    const maximum = max<{ value: number }>((a, b) => a.value - b.value)(source);

    expect(maximum().value).toBe(5);

    source.set({ value: 3 });
    expect(maximum().value).toBe(5);

    source.set({ value: 8 });
    expect(maximum().value).toBe(8);
  });

  it("should work with negative numbers", () => {
    const source = signal(-10);
    const maximum = max<number>()(source);

    expect(maximum()).toBe(-10);

    source.set(-20);
    expect(maximum()).toBe(-10);

    source.set(-5);
    expect(maximum()).toBe(-5);
  });

  it("should work with strings (lexicographic)", () => {
    const source = signal("banana");
    const maximum = max<string>()(source);

    expect(maximum()).toBe("banana");

    source.set("apple");
    expect(maximum()).toBe("banana");

    source.set("cherry");
    expect(maximum()).toBe("cherry");
  });

  it("should clean up on dispose", () => {
    const source = signal(5);
    const maximum = max<number>()(source);

    expect(maximum()).toBe(5);

    maximum.dispose();

    // After dispose, just verify no errors during dispose
  });
});

describe("min", () => {
  it("should emit the minimum value seen so far", () => {
    const source = signal(5);
    const minimum = min<number>()(source);

    expect(minimum()).toBe(5);

    source.set(7);
    expect(minimum()).toBe(5); // 5 is still min

    source.set(3);
    expect(minimum()).toBe(3); // 3 is new min

    source.set(4);
    expect(minimum()).toBe(3); // 3 is still min

    source.set(1);
    expect(minimum()).toBe(1); // 1 is new min
  });

  it("should work with custom comparer", () => {
    const source = signal({ value: 5 });
    const minimum = min<{ value: number }>((a, b) => a.value - b.value)(source);

    expect(minimum().value).toBe(5);

    source.set({ value: 8 });
    expect(minimum().value).toBe(5);

    source.set({ value: 2 });
    expect(minimum().value).toBe(2);
  });

  it("should work with negative numbers", () => {
    const source = signal(-10);
    const minimum = min<number>()(source);

    expect(minimum()).toBe(-10);

    source.set(-5);
    expect(minimum()).toBe(-10);

    source.set(-20);
    expect(minimum()).toBe(-20);
  });

  it("should work with strings (lexicographic)", () => {
    const source = signal("banana");
    const minimum = min<string>()(source);

    expect(minimum()).toBe("banana");

    source.set("cherry");
    expect(minimum()).toBe("banana");

    source.set("apple");
    expect(minimum()).toBe("apple");
  });

  it("should clean up on dispose", () => {
    const source = signal(5);
    const minimum = min<number>()(source);

    expect(minimum()).toBe(5);

    minimum.dispose();

    // After dispose, just verify no errors during dispose
  });
});

