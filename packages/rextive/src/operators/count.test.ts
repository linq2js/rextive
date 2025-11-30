import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { count } from "./count";

describe("count", () => {
  it("should count emissions from the source", () => {
    const source = signal(0);
    const counted = count<number>()(source);

    expect(counted()).toBe(0); // No emissions yet

    source.set(1);
    expect(counted()).toBe(1);

    source.set(2);
    expect(counted()).toBe(2);

    source.set(3);
    expect(counted()).toBe(3);
  });

  it("should count with predicate", () => {
    const source = signal(0);
    const evenCount = count<number>({ predicate: (x) => x % 2 === 0 })(source);

    expect(evenCount()).toBe(0);

    source.set(1); // odd, not counted
    expect(evenCount()).toBe(0);

    source.set(2); // even, counted
    expect(evenCount()).toBe(1);

    source.set(3); // odd, not counted
    expect(evenCount()).toBe(1);

    source.set(4); // even, counted
    expect(evenCount()).toBe(2);
  });

  it("should pass index to predicate", () => {
    const source = signal("a");
    const indices: number[] = [];

    const counted = count<string>({
      predicate: (_, index) => {
        indices.push(index);
        return true;
      },
    })(source);

    source.set("b");
    source.set("c");
    source.set("d");

    expect(indices).toEqual([0, 1, 2]);
    expect(counted()).toBe(3);
  });

  it("should handle rapid emissions", () => {
    const source = signal(0);
    const counted = count<number>()(source);

    for (let i = 1; i <= 100; i++) {
      source.set(i);
    }

    expect(counted()).toBe(100);
  });

  it("should clean up on dispose", () => {
    const source = signal(0);
    const counted = count<number>()(source);

    expect(counted()).toBe(0);

    counted.dispose();

    // After dispose, just verify no errors during dispose
  });

  it("should use custom name", () => {
    const source = signal(0);
    const counted = count<number>({ name: "myCounter" })(source);

    expect(counted.displayName).toMatch(/^#myCounter-\d+$/);
  });
});
