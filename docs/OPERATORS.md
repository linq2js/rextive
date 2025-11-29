# Operators

Operators are composable, reusable functions for transforming signals. Import from `rextive/op`:

```tsx
import { to, filter, scan, focus, debounce, throttle, pace } from "rextive/op";
```

---

## `to()` - Transform Values

Like `Array.map()` for signals:

```tsx
const count = signal(5);

// Basic transformation
const doubled = count.pipe(to((x) => x * 2));
console.log(doubled()); // 10

// Transform objects
const user = signal({ firstName: "John", lastName: "Doe" });
const fullName = user.pipe(to((u) => `${u.firstName} ${u.lastName}`));

// With equality check
const userName = user.pipe(to((u) => ({ name: u.firstName }), "shallow"));

// Async transformation
const userData = userId.pipe(to(async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}));

// Chain multiple transformations
const result = count.pipe(
  to((x) => x * 2),
  to((x) => x + 1),
  to((x) => `Result: ${x}`)
);
```

---

## `filter()` - Filter Values

Only emit values that pass a test:

```tsx
const count = signal(1);

const positiveOnly = count.pipe(filter((x) => x > 0));

count.set(5);  // positiveOnly = 5 (passed)
count.set(-3); // positiveOnly = 5 (filtered, keeps previous)
count.set(10); // positiveOnly = 10 (passed)

// Type narrowing with type guard
const value = signal<string | number>(1);
const numbersOnly = value.pipe(
  filter((x): x is number => typeof x === "number")
);
// Type: Signal<number> (narrowed!)

// Complex conditions
const validCount = count.pipe(
  filter((x) => x >= 0 && x <= 100)
);
```

**Note:** First value is always emitted, even if it doesn't pass the filter.

---

## `scan()` - Accumulate Values

Like `Array.reduce()` for signals:

```tsx
const count = signal(1);

// Running total
const total = count.pipe(scan((acc, curr) => acc + curr, 0));

count.set(2); // total = 3 (1 + 2)
count.set(3); // total = 6 (3 + 3)

// Keep history
const history = count.pipe(
  scan((acc, curr) => [...acc, curr], [] as number[])
);

// Build statistics
const stats = count.pipe(
  scan((acc, curr) => ({
    sum: acc.sum + curr,
    count: acc.count + 1,
    avg: (acc.sum + curr) / (acc.count + 1),
  }), { sum: 0, count: 0, avg: 0 }, "shallow")
);

// Sliding window (last N values)
const lastThree = count.pipe(
  scan((acc, curr) => {
    const next = [...acc, curr];
    return next.length > 3 ? next.slice(1) : next;
  }, [] as number[])
);
```

---

## `focus()` - Deep Object Access

Safely access deeply nested properties:

```tsx
const user = signal({
  profile: {
    name: { first: "John", last: "Doe" },
    address: { city: "NYC" },
  },
});

// Access nested properties
const firstName = user.pipe(focus("profile", "name", "first"));
console.log(firstName()); // "John"

// Updates when source changes
user.set({
  profile: {
    name: { first: "Jane", last: "Doe" },
    address: { city: "LA" },
  },
});
console.log(firstName()); // "Jane"

// Deep nesting
const city = user.pipe(focus("profile", "address", "city"));
```

---

## `debounce()` - Debounce Updates

Wait for a pause before emitting:

```tsx
const searchInput = signal("");

// Wait 300ms after last change
const debouncedSearch = searchInput.pipe(debounce(300));

// User types quickly
searchInput.set("h");
searchInput.set("he");
searchInput.set("hel");
searchInput.set("hell");
searchInput.set("hello");
// After 300ms pause → debouncedSearch = "hello"

// Use with async search
const searchResults = signal(
  { debouncedSearch },
  async ({ deps }) => fetchResults(deps.debouncedSearch)
);
```

---

## `throttle()` - Throttle Updates

Emit at most once per interval:

```tsx
const mousePosition = signal({ x: 0, y: 0 });

// At most once per 100ms
const throttledPosition = mousePosition.pipe(throttle(100));

// Rapid updates
mousePosition.set({ x: 10, y: 10 }); // Emitted
mousePosition.set({ x: 20, y: 20 }); // Ignored (within 100ms)
mousePosition.set({ x: 30, y: 30 }); // Ignored
// After 100ms
mousePosition.set({ x: 40, y: 40 }); // Emitted
```

---

## `pace()` - Rate Limit Updates

Emit at regular intervals:

```tsx
const fastData = signal(0);

// Emit at most every 1000ms
const pacedData = fastData.pipe(pace(1000));

// Rapid updates
fastData.set(1); // Emitted (first)
fastData.set(2); // Queued
fastData.set(3); // Queued (replaces 2)
// After 1000ms → 3 emitted
fastData.set(4); // Queued
fastData.set(5); // Queued (replaces 4)
// After 1000ms → 5 emitted
```

---

## Chaining Operators

Operators can be chained together:

```tsx
const count = signal(1);

const result = count.pipe(
  filter((x) => x > 0),      // Step 1: Only positive
  to((x) => x * 2),          // Step 2: Double
  scan((acc, x) => acc + x, 0) // Step 3: Running sum
);

count.set(5);  // result = 10 (5 * 2)
count.set(3);  // result = 16 (10 + 3 * 2)
count.set(-1); // result = 16 (filtered out)
```

---

## Reusable Operators

Create reusable operator pipelines:

```tsx
// Define reusable operators
const positiveOnly = filter((x: number) => x > 0);
const double = to((x: number) => x * 2);
const runningSum = scan((acc: number, x: number) => acc + x, 0);

// Apply to multiple signals
const result1 = signal1.pipe(positiveOnly, double, runningSum);
const result2 = signal2.pipe(positiveOnly, double, runningSum);

// Or create a factory
const createPositiveDoubleSum = (source: Signal<number>) => {
  return source.pipe(positiveOnly, double, runningSum);
};
```

---

## Operator Signatures

```tsx
to<T, U>(fn: (value: T) => U, equals?): Operator<T, U>

filter<T>(predicate: (value: T) => boolean, equals?): Operator<T, T>

scan<T, U>(fn: (acc: U, value: T) => U, initial: U, equals?): Operator<T, U>

focus<T, K1, K2, ...>(...keys: [K1, K2, ...]): Operator<T, DeepValue>

debounce<T>(ms: number): Operator<T, T>

throttle<T>(ms: number): Operator<T, T>

pace<T>(ms: number): Operator<T, T>
```

---

## Next Steps

- **[Examples](./EXAMPLES.md)** - Real-world examples using operators
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation


