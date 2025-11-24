/**
 * Test file to verify rextive/op TypeScript types work correctly
 */

import { signal } from "rextive";
import { map, filter, scan } from "rextive/op";
import type { ComputedSignal } from "rextive";

// Test map operator types
const count = signal(5);
const doubled: ComputedSignal<number> = count.to(map((x: number) => x * 2));
const formatted: ComputedSignal<string> = count.to(map((x: number) => `Count: ${x}`));

// Test filter operator types
const positiveOnly: ComputedSignal<number> = count.to(filter((x: number) => x > 0));

// Test scan operator types
const sum: ComputedSignal<number> = count.to(scan((acc: number, x: number) => acc + x, 0));
const history: ComputedSignal<number[]> = count.to(
  scan((acc: number[], x: number) => [...acc, x], [] as number[])
);

// Test type narrowing with filter
const value = signal<string | number>(42);
const numbersOnly: ComputedSignal<number> = value.to(
  filter((x): x is number => typeof x === "number")
);

// Test operator chaining with type inference
const result: ComputedSignal<number> = count.to(
  filter((x: number) => x > 0),
  map((x: number) => x * 2),
  scan((acc: number, x: number) => acc + x, 0)
);

// Test reusable operators
const double = map((x: number) => x * 2);
const addOne = map((x: number) => x + 1);
const positiveFilter = filter((x: number) => x > 0);

const pipeline: ComputedSignal<number> = count.to(positiveFilter, double, addOne);

// Test equality shortcuts
const withShallow: ComputedSignal<number> = count.to(map((x: number) => x * 2, "shallow"));
const withDeep: ComputedSignal<number> = count.to(map((x: number) => x * 2, "deep"));
const withStrict: ComputedSignal<number> = count.to(map((x: number) => x * 2, "strict"));

// Test with options
const withOptions: ComputedSignal<number> = count.to(
  map((x: number) => x * 2, {
    equals: "shallow",
    name: "doubled"
  })
);

console.log("✅ All TypeScript types are correct!");

