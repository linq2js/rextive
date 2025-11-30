# Operators

Operators are composable, reusable functions for transforming signals. Import from `rextive/op`:

```tsx
import { to, filter, scan, focus, lens, debounce, throttle, pace } from "rextive/op";
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

## `focus()` - Bidirectional Lens for Nested Properties

Create a **bidirectional** mutable signal that reads and writes to a nested path.

### Basic Usage

```tsx
const form = signal({
  user: { name: "Alice", age: 30 },
});

// Create focused signal with dot-notation path
const userName = form.pipe(focus("user.name"));

// Read
console.log(userName()); // "Alice"

// Write - updates source immutably
userName.set("Bob");
console.log(form().user.name); // "Bob"

// Sync both ways
form.set({ user: { name: "Charlie", age: 25 } });
console.log(userName()); // "Charlie"
```

### With Fallback (for Optional Properties)

When the path value is `null` or `undefined`, use a fallback:

```tsx
type User = {
  name: string;
  nickname?: string;
  settings?: { theme: string };
};

const user = signal<User>({ name: "Alice" });

// Without fallback - type is `string | undefined`
const nickname = user.pipe(focus("nickname"));
console.log(nickname()); // undefined

// With fallback - type is `string` (guaranteed non-nullable)
const nicknameWithDefault = user.pipe(focus("nickname", () => "Guest"));
console.log(nicknameWithDefault()); // "Guest"

// Set updates the source
nicknameWithDefault.set("Ali");
console.log(user().nickname); // "Ali"
```

**Fallback behaviors:**
- Called only for `null` or `undefined` values
- **Memoized** - factory called only once
- `0`, `""`, `false` are NOT nullish (no fallback used)

### With Options

```tsx
const form = signal({ price: 100 });

const price = form.pipe(
  focus("price", {
    equals: "shallow",     // Equality comparison
    name: "formPrice",     // Debug name

    // Transform on read (applied to both source and fallback)
    get: (value) => value * 1.1,

    // Transform on write
    set: (value, ctx) => Math.round(value / 1.1),

    // Validation
    validate: (value, ctx) => {
      if (value < 0) throw new Error("Cannot be negative");
      return true;
    },

    // Error handling
    onError: (error, ctx) => console.error(error),
  })
);
```

### Combining Fallback with Options

```tsx
// fallback as second arg, options as third
const theme = user.pipe(
  focus("settings.theme", () => "light", {
    get: (v) => v.toUpperCase(),
    name: "userTheme",
  })
);
```

### Overloads

```tsx
// Without fallback - may return undefined
focus(path)
focus(path, options)
// → Mutable<PathValue<T, P>>

// With fallback - guaranteed non-nullable
focus(path, fallback)
focus(path, fallback, options)
// → Mutable<F> where F = ReturnType<fallback>
```

### FocusOptions<T>

| Option | Type | Description |
|--------|------|-------------|
| `equals` | `"strict" \| "shallow" \| "deep" \| EqualsFn<T>` | Equality comparison |
| `name` | `string` | Debug name for devtools |
| `get` | `(value: T) => T` | Transform on read |
| `set` | `(value: T, ctx: FocusContext<T>) => T` | Transform on write |
| `validate` | `(value: T, ctx: FocusContext<T>) => boolean` | Validate before write |
| `onError` | `(error, ctx?) => void` | Error handler |

### Disposal

Focused signals perform **lazy disposal** when source is disposed:

```tsx
const source = signal({ name: "Alice" });
const name = source.pipe(focus("name"));

source.dispose();
// name is not immediately disposed

name();        // throws DisposedError, then disposes itself
name.set("X"); // silently fails, calls onError if provided
```

---

## `focus.lens()` - Lightweight Getter/Setter

Create a lightweight `[getter, setter]` tuple without creating a reactive signal. Perfect for on-demand read/write operations.

### Basic Usage

```tsx
import { focus } from "rextive/op";

const form = signal({
  user: { name: "John", age: 30 },
});

// Create lens - returns [getter, setter] tuple
const [getName, setName] = focus.lens(form, "user.name");

// Read
console.log(getName()); // "John"

// Write
setName("Jane");
console.log(form().user.name); // "Jane"

// Updater function
setName((prev) => prev.toUpperCase());
console.log(getName()); // "JANE"
```

### With Fallback

```tsx
const user = signal<{ nickname?: string }>({});

const [getNickname, setNickname] = focus.lens(
  user,
  "nickname",
  () => "Anonymous"
);

console.log(getNickname()); // "Anonymous"

setNickname("Ali");
console.log(user().nickname); // "Ali"
```

### Composable - Lens from Lens

Lenses can be composed from other lenses:

```tsx
const form = signal({
  contacts: [
    { name: "John", address: { city: "NYC" } },
  ],
});

// Chain of lenses
const contactsLens = focus.lens(form, "contacts");
const firstContactLens = focus.lens(contactsLens, "0");
const addressLens = focus.lens(firstContactLens, "address");
const [getCity, setCity] = focus.lens(addressLens, "city");

console.log(getCity()); // "NYC"
setCity("LA");
console.log(form().contacts[0].address.city); // "LA"
```

### Standalone Import

```tsx
import { lens, type Lens } from "rextive/op";

const [getValue, setValue] = lens(signal, "path");
```

### focus() vs focus.lens()

| Feature | `focus()` | `focus.lens()` |
|---------|-----------|----------------|
| Returns | `Mutable<T>` signal | `[getter, setter]` tuple |
| Reactive | ✅ Auto-updates when source changes | ❌ On-demand only |
| Subscribable | ✅ `.on()` for changes | ❌ No subscriptions |
| Use case | Reactive UI bindings | Form handlers, one-off updates |
| Overhead | Creates signal + subscription | Minimal (just functions) |

**Use `focus()` when:**
- You need reactive updates in UI
- You want to subscribe to changes
- You need a signal to pass around

**Use `focus.lens()` when:**
- You just need to get/set values
- You don't need reactivity
- You want minimal overhead
- In event handlers or callbacks

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
to<T, U>(fn: (value: T) => U, options?): Operator<T, U>

filter<T>(predicate: (value: T) => boolean, options?): Operator<T, T>

scan<T, U>(fn: (acc: U, value: T) => U, initial: U, options?): Operator<T, U>

// focus - creates reactive signal
focus<T, P>(path: P, options?): Operator<Mutable<T>, Mutable<PathValue<T, P>>>
focus<T, P, F>(path: P, fallback: () => F, options?): Operator<Mutable<T>, Mutable<F>>

// focus.lens - lightweight getter/setter (no signal created)
focus.lens<T, P>(source: Mutable<T>, path: P, fallback?): Lens<PathValue<T, P>>
focus.lens<T, P>(source: Lens<T>, path: P, fallback?): Lens<PathValue<T, P>>
// Lens<T> = [() => T, (value: T | ((prev: T) => T)) => void]

debounce<T>(ms: number, options?): Operator<T, T>

throttle<T>(ms: number, options?): Operator<T, T>

pace<T>(ms: number, options?): Operator<T, T>
```

---

## Next Steps

- **[Examples](./EXAMPLES.md)** - Real-world examples using operators
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation

