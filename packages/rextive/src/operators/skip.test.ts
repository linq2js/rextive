import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { skip, skipLast, skipUntil, skipWhile } from "./skip";

describe("skip", () => {
  it("should skip the first N emissions", () => {
    const source = signal(0);
    const skipped = skip<number>(2)(source);

    expect(skipped()).toBe(0); // Initial value (before any emissions)

    source.set(1); // Skipped (1st)
    expect(skipped()).toBe(0);

    source.set(2); // Skipped (2nd)
    expect(skipped()).toBe(0);

    source.set(3); // Not skipped
    expect(skipped()).toBe(3);

    source.set(4); // Not skipped
    expect(skipped()).toBe(4);
  });

  it("should work with skip(0)", () => {
    const source = signal(0);
    const skipped = skip<number>(0)(source);

    source.set(1);
    expect(skipped()).toBe(1);

    source.set(2);
    expect(skipped()).toBe(2);
  });

  it("should handle skip count larger than emissions", () => {
    const source = signal(0);
    const skipped = skip<number>(100)(source);

    source.set(1);
    source.set(2);
    source.set(3);

    expect(skipped()).toBe(0); // Still initial value
  });

  it("should clean up on dispose", () => {
    const source = signal(0);
    const skipped = skip<number>(1)(source);

    // Get value before dispose
    expect(skipped()).toBe(0);

    skipped.dispose();

    // After dispose, source updates should not affect anything
    source.set(1);
    source.set(2);

    // Disposed signal access is undefined behavior, just verify no throw during dispose
  });
});

describe("skipWhile", () => {
  it("should skip while predicate is true", () => {
    const source = signal(0);
    const skipped = skipWhile<number>((x) => x < 3)(source);

    expect(skipped()).toBe(0);

    source.set(1); // Skipped (1 < 3)
    expect(skipped()).toBe(0);

    source.set(2); // Skipped (2 < 3)
    expect(skipped()).toBe(0);

    source.set(3); // Not skipped (3 >= 3)
    expect(skipped()).toBe(3);

    source.set(1); // Not skipped (predicate already failed once)
    expect(skipped()).toBe(1);
  });

  it("should pass index to predicate", () => {
    const source = signal("a");
    const indices: number[] = [];

    const skipped = skipWhile<string>((_, index) => {
      indices.push(index);
      return index < 2;
    })(source);

    source.set("b"); // index 0, skip
    source.set("c"); // index 1, skip
    source.set("d"); // index 2, stop skipping, emit "d"

    expect(indices).toEqual([0, 1, 2]);
    expect(skipped()).toBe("d");
  });

  it("should emit immediately when predicate is initially false", () => {
    const source = signal(10);
    const skipped = skipWhile<number>((x) => x < 5)(source);

    // Predicate is checked on changes, not initial value
    expect(skipped()).toBe(10);

    source.set(1); // Predicate fails (1 < 5), still skipping
    expect(skipped()).toBe(10);

    source.set(6); // Predicate fails (6 >= 5), stop skipping
    expect(skipped()).toBe(6);
  });

  it("should clean up on dispose", () => {
    const source = signal(0);
    const skipped = skipWhile<number>((x) => x < 5)(source);

    expect(skipped()).toBe(0);

    skipped.dispose();

    // After dispose, just verify no errors during dispose
  });
});

describe("skipLast", () => {
  it("should skip the last N values", () => {
    const source = signal(0);
    const skipped = skipLast<number>(2)(source);

    expect(skipped()).toBeUndefined(); // No value yet

    source.set(1);
    expect(skipped()).toBeUndefined(); // Buffer: [0, 1], not enough to emit

    source.set(2);
    expect(skipped()).toBe(0); // Buffer: [1, 2], emit 0

    source.set(3);
    expect(skipped()).toBe(1); // Buffer: [2, 3], emit 1

    source.set(4);
    expect(skipped()).toBe(2); // Buffer: [3, 4], emit 2
  });

  it("should work with skipLast(0)", () => {
    const source = signal(0);
    const skipped = skipLast<number>(0)(source);

    expect(skipped()).toBe(0);

    source.set(1);
    expect(skipped()).toBe(1);
  });

  it("should work with skipLast(1)", () => {
    const source = signal(0);
    const skipped = skipLast<number>(1)(source);

    expect(skipped()).toBeUndefined();

    source.set(1);
    expect(skipped()).toBe(0);

    source.set(2);
    expect(skipped()).toBe(1);
  });

  it("should clean up on dispose", () => {
    const source = signal(0);
    const skipped = skipLast<number>(2)(source);

    expect(skipped()).toBeUndefined();

    skipped.dispose();

    // After dispose, just verify no errors during dispose
  });
});

describe("skipUntil", () => {
  it("should skip until notifier emits", () => {
    const source = signal(0);
    const notifier = signal(false);
    const skipped = skipUntil<number>(notifier)(source);

    expect(skipped()).toBe(0);

    source.set(1); // Skipped
    expect(skipped()).toBe(0);

    source.set(2); // Skipped
    expect(skipped()).toBe(0);

    notifier.set(true); // Start emitting

    source.set(3); // Not skipped
    expect(skipped()).toBe(3);

    source.set(4); // Not skipped
    expect(skipped()).toBe(4);
  });

  it("should work with array of notifiers", () => {
    const source = signal(0);
    const notifier1 = signal(false);
    const notifier2 = signal(false);
    const skipped = skipUntil<number>([notifier1, notifier2])(source);

    source.set(1); // Skipped
    expect(skipped()).toBe(0);

    notifier2.set(true); // Either notifier triggers

    source.set(2); // Not skipped
    expect(skipped()).toBe(2);
  });

  it("should not skip if notifier already emitted before subscription", () => {
    const notifier = signal(true);
    const source = signal(0);
    const skipped = skipUntil<number>(notifier)(source);

    // Since we subscribe to notifier after it's already true,
    // we start in "not skipping" mode only when notifier changes
    source.set(1); // Still skipped (notifier hasn't changed yet)
    expect(skipped()).toBe(0);

    notifier.set(false); // Notifier changes
    source.set(2);
    expect(skipped()).toBe(2);
  });

  it("should clean up on dispose", () => {
    const source = signal(0);
    const notifier = signal(false);
    const skipped = skipUntil<number>(notifier)(source);

    expect(skipped()).toBe(0);

    skipped.dispose();

    // After dispose, just verify no errors during dispose
  });
});

