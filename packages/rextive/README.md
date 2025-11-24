# Rextive ⚡

> **The simplest way to manage reactive state.** One concept. Zero complexity. Pure power.

```bash
npm install rextive
```

[![npm version](https://img.shields.io/npm/v/rextive.svg)](https://www.npmjs.com/package/rextive)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Why Rextive?

```tsx
// ❌ Other libraries
const [count, setCount] = useState(0);
const doubled = useMemo(() => count * 2, [count]);
useEffect(() => {
  /* sync */
}, [count]);

// ✅ Rextive - One concept for everything
import { signal } from "rextive";
import { select } from "rextive/op";
// Or use $ for concise code: import { $ } from "rextive";

const count = signal(0);
const doubled = count.pipe(select((x) => x * 2));
```

**Rextive replaces:**

- ✅ `useState` + `useMemo` + `useEffect` → Just `signal`
- ✅ Redux + Redux Toolkit → Just `signal`
- ✅ React Query + SWR → Just `signal`
- ✅ Zustand + Jotai + Recoil → Just `signal`

**One API. Infinite possibilities.**

---

## 🚀 Quick Start

### React in 30 seconds

```tsx
import { signal, rx } from "rextive/react";

const count = signal(0); // create signal
const increment = () => count.set((x) => x + 1); // mutate signal
const Counter = <h1 onClick={increment}>{rx(count)}</h1>; // Counter UI
```

**That's it.** No providers. No hooks. No boilerplate.

> **💡 React Tip:** Import everything from `rextive/react` for convenience:
>
> ```tsx
> import { signal, rx, useScope, wait, loadable } from "rextive/react";
> ```
>
> No need to mix `rextive` and `rextive/react` imports!

### 💡 Shorthand: `$()` instead of `signal()`

For more concise code, use `$` as an alias:

```tsx
import { $ } from "rextive";

const count = $(0);
const doubled = $({ count }, ({ deps }) => deps.count * 2);
```

Both are identical - use whichever you prefer! The rest of the docs use `signal()` for clarity.

### Vanilla JavaScript in 30 seconds

```js
import { signal } from "rextive";

const count = signal(0);

// Create reactive effect
signal(
  { count },
  ({ deps }) => {
    document.querySelector("#counter").textContent = deps.count;
  },
  { lazy: false }
);

// Update
count.set((x) => x + 1);
```

---

## 📖 Core Concepts

### Single Dependency: Use Operators

For simple transformations of a single signal, use operators from `rextive/op`:

```tsx
import { select } from "rextive/op";

const count = signal(0);
const doubled = count.pipe(select((x) => x * 2));
const formatted = count.pipe(select((x) => `Count: ${x}`));

// With custom equality (string shortcuts or functions)
const user = signal({ name: "John", age: 30 });
const name = user.pipe(select((u) => u.name, "shallow"));
const data = user.pipe(select((u) => u.data, "deep"));
```

### Custom Equality: Optimize Re-renders

By default, signals use `Object.is` for equality. For objects/arrays, use custom equality to prevent unnecessary updates:

```tsx
import { signal, shallowEquals } from "rextive";

// ✅ String shortcuts (most convenient)
const user = signal({ name: "John", age: 30 }, "shallow");
const data = signal(complexObj, "deep");
const ref = signal(obj, "is"); // Same as default Object.is

// ✅ Also works: Pass equals as second argument
const user = signal({ name: "John", age: 30 }, shallowEquals);

// ✅ Or: Pass in options object
const user = signal({ name: "John", age: 30 }, { equals: "shallow" });

// Custom equality function
const customEquals = (a, b) => a.id === b.id;
const item = signal({ id: 1, name: "Item" }, customEquals);

// Now setting same content doesn't trigger updates
user.set({ name: "John", age: 30 }); // ✅ No update (content unchanged)
user.set({ name: "Jane", age: 30 }); // ✅ Updates (name changed)
```

**Built-in equality strategies:**

- `'strict'` (default) - Reference equality using `Object.is`
- `'shallow'` - Shallow comparison (compares object keys/array elements)
- `'deep'` - Deep comparison using lodash `isEqual` (recursive)

**When to use custom equality:**

- ✅ Object/array props from parent components
- ✅ Computed values that return new objects
- ✅ Preventing unnecessary re-renders

### Multiple Dependencies: Use `signal({ deps }, fn)`

When you need to combine multiple signals, use the dependency pattern:

```tsx
const firstName = signal("John");
const lastName = signal("Doe");

// ✅ Combine multiple signals
const fullName = signal(
  { firstName, lastName },
  ({ deps }) => `${deps.firstName} ${deps.lastName}`
);

const count = signal(0);
const multiplier = signal(2);

// ✅ Reactive calculations
const result = signal(
  { count, multiplier },
  ({ deps }) => deps.count * deps.multiplier
);
```

**How it works:**

1. **Define dependencies** - Pass an object with signals as the first argument
2. **Access via `deps`** - The compute function receives `{ deps }` containing current values
3. **Auto-tracking** - Updates whenever any dependency changes
4. **Type-safe** - Full TypeScript inference for all dependencies

**With custom equality:**

```tsx
// String shortcut as third argument
const fullName = signal(
  { firstName, lastName },
  ({ deps }) => ({ full: `${deps.firstName} ${deps.lastName}` }),
  "shallow" // Shallow comparison
);

// Custom function
const result = signal(
  { a, b },
  ({ deps }) => ({ sum: deps.a + deps.b, extra: Math.random() }),
  (x, y) => x.sum === y.sum // Only compare sum property
);

// Full options object
const data = signal({ userId }, ({ deps }) => fetchUser(deps.userId), {
  equals: "deep",
  name: "userData",
});
```

### Async with Dependencies

Dependencies work seamlessly with async operations:

```tsx
const userId = signal(1);

// ✅ Automatically re-fetches when userId changes
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  const response = await fetch(`/users/${deps.userId}`, {
    signal: abortSignal, // Auto-cancels previous request
  });
  return response.json();
});

userId.set(2); // Cancels previous fetch, starts new one
```

### When to Use Which?

| Pattern                      | Use When                         | Example                                           |
| ---------------------------- | -------------------------------- | ------------------------------------------------- |
| `.pipe(select(...))`           | Single dependency transformation | `count.pipe(select(x => x * 2))`                    |
| `signal(value, equals)`      | Custom equality for objects      | `signal({ name: 'John' }, shallowEquals)`         |
| `signal({ deps }, fn)`       | Multiple dependencies            | `signal({ a, b }, ({ deps }) => deps.a + deps.b)` |
| `signal({ deps }, async fn)` | Async with dependencies          | `signal({ id }, async ({ deps }) => fetch(...))`  |

---

## ✨ What Makes Rextive Different?

### 🎯 **Lazy Tracking** - Only subscribe to what you actually use

```tsx
// Other libraries force you to subscribe to everything upfront
const { user, posts, comments } = useStore((state) => ({
  user: state.user,
  posts: state.posts,
  comments: state.comments, // ❌ Subscribed even if unused!
}));

// Rextive subscribes only when accessed
import { rx } from "rextive/react";

rx({ user, posts, comments }, (value) => {
  return <div>{value.user.name}</div>; // ✅ Only user subscribed!
});
```

### ⚡ **Unified Sync/Async** - No special handling needed

```tsx
import { signal, rx } from "rextive/react";
import { select } from "rextive/op";

const user = signal(async () => fetchUser()); // Async
const count = signal(0); // Sync
const doubled = count.pipe(select((x) => x * 2)); // Computed (transformation)

// Use them exactly the same way!
rx({ user, count, doubled }, (value) => (
  <div>
    {value.user.name} - {value.doubled}
  </div>
));
```

### 🧠 **Smart** - Automatic request cancellation

```tsx
import { signal } from "rextive";

const searchTerm = signal("react");

const results = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  return fetch(`/search?q=${deps.searchTerm}`, {
    signal: abortSignal, // ✅ Auto-cancels when searchTerm changes!
  });
});

searchTerm.set("vue"); // Previous fetch automatically cancelled
```

### 🎨 **Framework Agnostic** - Use anywhere

```tsx
// ✅ Core library - works anywhere
import { signal } from "rextive";

// ✅ React integration
import { rx, useScope } from "rextive/react";

// ✅ Same signal API everywhere (Vanilla JS, Vue, Svelte, Angular)
```

---

## 🔥 Core Features

| Feature                  | Rextive                | Others                                          |
| ------------------------ | ---------------------- | ----------------------------------------------- |
| **Learning Curve**       | One concept (`signal`) | Multiple APIs (atoms, stores, hooks, providers) |
| **Lazy Tracking**        | ✅ Automatic           | ❌ Manual selectors                             |
| **Async Built-in**       | ✅ Native support      | ⚠️ Separate libraries                           |
| **Request Cancellation** | ✅ Automatic           | ⚠️ Manual setup                                 |
| **Component Scope**      | ✅ `useScope`          | ❌ Complex teardown                             |
| **Global State**         | ✅ Just export         | ⚠️ Providers needed                             |
| **Works Outside React**  | ✅ Full support        | ❌ React-only                                   |
| **Bundle Size**          | ⚡ Tiny                | 📦 Larger                                       |

---

## 📖 Learn by Example

### Counter - The Simplest Example

```tsx
import { signal, rx } from "rextive/react";
import { select } from "rextive/op";

const count = signal(0);
const doubled = count.pipe(select((x) => x * 2));

function Counter() {
  return (
    <div>
      <h1>Count: {rx(count)}</h1>
      <h2>Doubled: {rx(doubled)}</h2>
      <button onClick={() => count.set((x) => x + 1)}>+1</button>
      <button onClick={() => count.reset()}>Reset</button>
    </div>
  );
}
```

### Async Data Fetching with Auto-Cancel

```tsx
import { signal } from "rextive";
import { Suspense } from "react";

const userId = signal(1);

const user = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal, // ✅ Cancels when userId changes
  });
  return res.json();
});

function Profile() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {rx(user, (u) => u.name)}
    </Suspense>
  );
}

// Change user - previous fetch cancelled automatically!
userId.set(2);
```

### Advanced: Combining AbortSignals

Use `AbortSignal.any()` and `AbortSignal.timeout()` with the context's `abortSignal` for advanced cancellation patterns:

```tsx
import { signal } from "rextive";

const userId = signal(1);

// Example 1: Add timeout to auto-cancel signal
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  // Combine dependency cancellation + 5 second timeout
  const combinedSignal = AbortSignal.any([
    abortSignal,
    AbortSignal.timeout(5000),
  ]);

  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: combinedSignal,
  });
  return res.json();
});

// Example 2: Manual cancellation + auto-cancel
const controller = new AbortController();
const search = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  // Combine auto-cancel + manual cancel + timeout
  const combinedSignal = AbortSignal.any([
    abortSignal, // Auto-cancel when searchTerm changes
    controller.signal, // Manual cancel via controller
    AbortSignal.timeout(10000), // 10 second timeout
  ]);

  const res = await fetch(`/search?q=${deps.searchTerm}`, {
    signal: combinedSignal,
  });
  return res.json();
});

// Manually cancel all pending searches
controller.abort();

// Example 3: Timeout-only (no dependencies)
const data = signal(async ({ abortSignal }) => {
  // 3 second timeout
  const timeoutSignal = AbortSignal.any([
    abortSignal,
    AbortSignal.timeout(3000),
  ]);

  const res = await fetch("/api/slow-endpoint", {
    signal: timeoutSignal,
  });
  return res.json();
});
```

**Benefits:**

- ✅ **Automatic cancellation** - When dependencies change
- ✅ **Timeout protection** - Prevent hanging requests
- ✅ **Manual control** - Cancel via external controller
- ✅ **Composable** - Combine multiple abort signals

### Component-Scoped State (Auto-Cleanup)

```tsx
import { signal, disposable, rx, useScope } from "rextive/react";

function TodoList() {
  const { todos, filter } = useScope(() => {
    const todos = signal([]);
    const filter = signal("all");

    // ✅ disposable() helper automatically adds dispose property
    return disposable({ todos, filter });
  });

  return (
    <div>
      <input onChange={(e) => filter.set(e.target.value)} />
      {rx({ todos, filter }, (value) =>
        value.todos
          .filter((t) => t.status === value.filter)
          .map((t) => <Todo key={t.id} todo={t} />)
      )}
    </div>
  );
}
```

### React Query-like Patterns

```tsx
import { signal, disposable, rx, useScope } from "rextive/react";

function createQuery(endpoint) {
  const params = signal(); // No initial value needed!

  const data = signal({ params }, async ({ deps, abortSignal }) => {
    if (!deps.params) return null;

    const res = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(deps.params),
      signal: abortSignal, // ✅ Auto-cancel on params change
    });

    return res.json();
  });

  // ✅ Shorter: disposable() automatically adds dispose property
  return disposable({ params, data });

  // Or explicit (equivalent):
  // return { params, data, dispose: [params, data] };
}

// Use it
function UserProfile() {
  const { params, data } = useScope(() => createQuery("/api/user"));

  // Trigger query
  params.set({ id: 123 });

  return rx({ data }, (_value, loadable) => {
    if (loadable.data.status === "loading") return <Spinner />;
    if (loadable.data.status === "error") return <Error />;
    return <div>{loadable.data.value.name}</div>;
  });
}
```

### Form Validation

```tsx
import { signal, disposable, rx, useScope } from "rextive/react";

function ContactForm() {
  const { form, errors, isValid } = useScope(() => {
    const form = signal({ name: "", email: "", message: "" });

    const errors = signal({ form }, ({ deps }) => {
      const errs = {};
      if (!deps.form.name) errs.name = "Required";
      if (!deps.form.email.includes("@")) errs.email = "Invalid";
      return errs;
    });

    const isValid = signal(
      { errors },
      ({ deps }) => Object.keys(deps.errors).length === 0
    );

    return disposable({ form, errors, isValid });
  });

  return rx({ form, errors, isValid }, (value) => (
    <form>
      <input
        value={value.form.name}
        onChange={(e) => form.set({ ...form(), name: e.target.value })}
      />
      {value.errors.name && <span>{value.errors.name}</span>}

      <button disabled={!value.isValid}>Submit</button>
    </form>
  ));
}
```

### Debounced Search

```tsx
import { signal, useScope } from "rextive/react";

function SearchBox() {
  const { searchTerm, results } = useScope(() => {
    const searchTerm = signal("");

    const results = signal({ searchTerm }, async ({ deps, abortSignal }) => {
      if (!deps.searchTerm) return [];

      await new Promise((r) => setTimeout(r, 300)); // Debounce
      if (abortSignal?.aborted) return []; // Cancelled?

      const res = await fetch(`/search?q=${deps.searchTerm}`, {
        signal: abortSignal,
      });
      return res.json();
    });

    return disposable({ searchTerm, results });
  });

  return (
    <div>
      {rx("input", {
        value: searchTerm,
        onChange: (e: any) => searchTerm.set(e.target.value),
      })}
      {rx(results, (items) =>
        items.map((item) => <div key={item.id}>{item.name}</div>)
      )}
    </div>
  );
}
```

### Batch Updates for Performance

```tsx
import { signal } from "rextive";

const firstName = signal("John");
const lastName = signal("Doe");
const email = signal("john@example.com");

// Without batch: 3 separate notifications
firstName.set("Jane");
lastName.set("Smith");
email.set("jane@example.com");

// With batch: Single notification ⚡
signal.batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
  email.set("jane@example.com");
});
```

### Persist to LocalStorage

```tsx
import { signal } from "rextive";

const { signals } = signal.persist(
  {
    theme: signal("dark"),
    settings: signal({}),
  },
  {
    load: () => JSON.parse(localStorage.getItem("app") || "{}"),
    save: (values) => localStorage.setItem("app", JSON.stringify(values)),
  }
);

// ✅ Automatically loaded and saved!
signals.theme.set("light");
```

---

## 🎯 Advanced Patterns

### Advanced Transformations with Operators

For complex transformations like filtering, accumulation, or composition, use operators from `rextive/op`:

```tsx
import { signal } from "rextive";
import { select, filter, scan } from "rextive/op";

const count = signal(1);

// Single operator
const doubled = count.pipe(select((x) => x * 2));

// Chain multiple operators
const result = count.pipe(
  filter((x) => x > 0), // Only positive numbers
  select((x) => x * 2), // Double the value
  scan((acc, x) => acc + x, 0) // Running total
);

// Reusable operators
const positiveOnly = filter((x: number) => x > 0);
const double = select((x: number) => x * 2);
const sum = scan((acc: number, x: number) => acc + x, 0);

const pipeline = count.pipe(positiveOnly, double, sum);
```

**Available Operators:**

- **`select(fn, equals?)`** - Transform each value
- **`filter(predicate, equals?)`** - Only emit values that pass the test
- **`scan(fn, initial, equals?)`** - Accumulate values with state (like Array.reduce)

See [Operators](#operators) section for detailed documentation.

### Group Signals with Tags

```tsx
import { signal } from "rextive";

const formTag = signal.tag();

const name = signal("", { tags: [formTag] });
const email = signal("", { tags: [formTag] });
const message = signal("", { tags: [formTag] });

// Reset all form fields at once
const resetForm = () => {
  formTag.forEach((s) => s.reset());
};
```

### Fine-Grained Lifecycle Control

```tsx
import { useScope } from "rextive/react";

function Component() {
  // Component lifecycle mode
  useScope({
    init: () => console.log("Before first render"),
    mount: () => console.log("After first paint"),
    render: () => console.log("Every render"),
    cleanup: () => console.log("React cleanup (may run 2-3x in StrictMode)"),
    dispose: () => console.log("True unmount (runs exactly once)"),
  });

  return <div>Hello</div>;
}
```

---

## 📚 Complete API Reference

### `signal(value)` or `$(value)`

Create reactive state. Use `signal` or its shorthand `$` - they're identical.

```tsx
// Mutable signal
const count = signal(0);
count.set(1);
count.set((x) => x + 1);
count.reset();

// Signal with no initial value
const user = signal<User>(); // get() returns User | undefined
user.set({ name: "Alice" }); // set() requires User (not undefined)

// Computed signal (transformation)
const doubled = count.pipe(select((x) => x * 2));

// Async signal
const data = signal(async () => fetchData());

// With dependencies and abort signal
const result = signal({ query }, async ({ deps, abortSignal }) => {
  return fetch(`/api?q=${deps.query}`, { signal: abortSignal });
});
```

**Signal Instance API:**

```tsx
const count = signal(0); // Create signal

// Reading and writing
count(); // Read current value
count.set(5); // Update value
count.set((x) => x + 1); // Update with function
count.reset(); // Reset to initial value

// Subscriptions
count.on((value) => console.log(value)); // Subscribe to changes
count.dispose(); // Cleanup and stop reactivity

// Transformations with operators
import { select, scan } from "rextive/op";

// Transform object/array values with equality checks
const user = signal({ name: "Alice", age: 30 });
user.pipe(select((u) => ({ name: u.name }), "shallow")); // Shallow equality on result

// Accumulate with deep equality
count.pipe(scan((sum, x) => sum + x, 0)); // Stateful operation
```

**Options:**

```tsx
signal(value, {
  name: "mySignal", // For debugging
  lazy: true, // Compute only when accessed
  equals: "shallow", // String shortcut: 'strict' | 'shallow' | 'deep' | custom function
  fallback: (error) => value, // Error fallback value
  onChange: (value) => {}, // Change callback
  onError: (error) => {}, // Error callback
  tags: [myTag], // Group with tags
});

// Equals option accepts:
// - 'strict' (default): Object.is (reference equality)
// - 'shallow': Shallow comparison (object keys/array elements)
// - 'deep': Deep comparison (lodash isEqual)
// - Custom function: (a, b) => boolean
```

**Context Object (for computed/async signals):**

```tsx
signal({ deps }, ({ deps, abortSignal }) => {
  // deps: Resolved values of dependencies
  // abortSignal: Automatically aborted when:
  //   - Dependencies change
  //   - Signal is disposed
  //   - Computation is cancelled

  // Use with fetch
  fetch("/api/data", { signal: abortSignal });

  // Combine with timeout
  const timeoutSignal = AbortSignal.any([
    abortSignal,
    AbortSignal.timeout(5000),
  ]);

  // Combine with manual controller
  const controller = new AbortController();
  const combinedSignal = AbortSignal.any([abortSignal, controller.signal]);
});
```

**Style Comparison:**

```tsx
// Explicit style - great for teams and learning
import { signal } from "rextive";
const count = signal(0);
const name = signal("Alice");

// Concise style - great for experienced developers
import { $ } from "rextive";
const count = $(0);
const name = $("Alice");
```

---

### Signal Instance Methods

#### `.set(value)` or `.set(updater)`

Update signal value. Accepts a value or updater function.

```tsx
const count = signal(0);

count.set(5); // Direct value
count.set((x) => x + 1); // Updater function
```

#### `.reset()`

Reset signal to its initial value.

```tsx
const count = signal(0);
count.set(5);
count.reset(); // Back to 0
```

#### `.on(callback)` → `unsubscribe`

Subscribe to value changes. Returns unsubscribe function.

```tsx
const count = signal(0);

const unsubscribe = count.on((value) => {
  console.log("Count changed:", value);
});

count.set(1); // Logs: "Count changed: 1"
unsubscribe(); // Stop listening
```

#### `.dispose()`

Cleanup and stop all reactivity. **⚠️ Using disposed signals will throw errors.**

```tsx
const count = signal(0);
count.dispose();

// ❌ Error: Attempting to use disposed signal
count(); // Throws error
count.set(1); // Throws error
count.on(() => {}); // Throws error
```

**When to use:**

- Manual cleanup when signal is no longer needed
- Component unmounting (or use `useScope` for auto-cleanup)
- Preventing memory leaks in long-lived applications

#### `.pipe(...operators)` → `Signal`

Chain multiple transformations in a readable, left-to-right manner. Each operator is a function that takes a signal and returns a transformed signal.

```tsx
import { select } from "rextive/op";

const count = signal(5);

// Single transformation
const doubled = count.pipe(select((x) => x * 2));

// Chain multiple operators (linear, easy to read)
const result = count.pipe(
  select((x) => x * 2),
  select((x) => x + 1),
  select((x) => `Value: ${x}`)
);

// Reusable operators
const double = <T extends number>(s: Signal<T>) => s.pipe(select((x) => x * 2));
const addOne = <T extends number>(s: Signal<T>) => s.pipe(select((x) => x + 1));
const format = <T,>(s: Signal<T>) => s.pipe(select((x) => `Value: ${x}`));

const result = count.pipe(double, addOne, format);
// result() === "Value: 11"
```

**Benefits:**

- **Composability**: Build complex transformations from simple, reusable operators
- **Readability**: Linear flow from left to right, easier to understand than nested calls
- **Type Safety**: Full TypeScript support with proper type inference through the chain
- **Automatic Cleanup**: When you dispose the result, all intermediate signals are automatically disposed

**Memory Management:**

```tsx
import { select } from "rextive/op";

const result = count.pipe(
  select((x) => x * 2), // intermediate1
  select((x) => x + 1), // intermediate2
  select((x) => `Value: ${x}`) // result
);

// Dispose the result
result.dispose();
// ✅ Automatically disposes intermediate1 and intermediate2
// No memory leaks!
```

---

### `signal.batch(fn)` or `$.batch(fn)`

Batch multiple updates into a single notification.

```tsx
signal.batch(() => {
  count.set(1);
  name.set("Alice");
  age.set(25);
}); // Single notification after all updates
```

### `signal.persist(signals, options)` or `$.persist(...)`

Persist signals to storage.

```tsx
const { signals, pause, resume, status, start, cancel } = signal.persist(
  { count: signal(0), name: signal("") },
  {
    load: () => JSON.parse(localStorage.getItem("state") || "{}"),
    save: (values) => localStorage.setItem("state", JSON.stringify(values)),
    onError: (error, type) => console.error(`${type} failed:`, error),
    autoStart: true,
  }
);
```

### `signal.tag()` or `$.tag()`

Group related signals.

```tsx
const myTag = signal.tag();
const sig1 = signal(1, { tags: [myTag] });
const sig2 = signal(2, { tags: [myTag] });

myTag.forEach((s) => s.reset()); // Reset all
```

### `awaited(...selectors)` - Work with Promise Values

Helper to create selectors that work with both promise and non-promise values. Accepts multiple selectors that will be chained together, where each selector receives the awaited result of the previous one.

```tsx
import { signal, awaited } from "rextive";

// Single selector
const todoList = signal(fetchTodos()); // Signal<Promise<Todo[]>>
const titles = todoList.to(awaited((todos) => todos.map((t) => t.title)));
// titles() returns Promise<string[]>

// Multiple selectors (chained within awaited)
const result = todoList.to(
  awaited(
    (todos) => todos.filter((t) => !t.done), // Filter incomplete
    (todos) => todos.map((t) => t.title), // Extract titles
    (titles) => titles.join(", ") // Join into string
  )
);
// result() returns Promise<string>

// With non-promise values (works the same!)
const todoList = signal([{ title: "Buy milk", done: false }]); // Signal<Todo[]>
const titles = todoList.to(awaited((todos) => todos.map((t) => t.title)));
// titles() returns string[] (sync, no promise!)

// Use with .pipe() and select operator
import { select } from "rextive/op";

const titles = todoList.pipe(
  select(awaited((todos) => todos.map((t) => t.title)))
);

// Mixed promise/non-promise values
const data = signal<number | Promise<number>>(5);
const doubled = data.to(awaited((x) => x * 2));

doubled(); // 10 (sync)
data.set(Promise.resolve(10));
await doubled(); // 20 (async)
```

**Benefits:**

- ✅ Works with both promise and non-promise values
- ✅ Type-safe: TypeScript infers `Awaited<T>` correctly
- ✅ Composable: Chain with other selectors
- ✅ Flexible: Use with `.to()` or inside `.pipe(select(...))`

### `rx()` - React Reactive Rendering

```tsx
// Single signal - convenient shorthand
rx(count); // Renders: <div>42</div>

// Component with reactive props
rx("div", {
  children: count, // Signal prop - reactive
  className: className, // Signal prop - reactive
  id: "counter", // Static prop
});

// Custom component with reactive props
rx(UserCard, {
  user: user, // Signal prop
  theme: "dark", // Static prop
});

// With render function
rx({ user, posts }, (value, loadable) => (
  <div>
    <div>{value.user.name}</div>
    {loadable.posts.status === "loading" && <Spinner />}
  </div>
));
```

> **⚠️ Common Mistake: Don't use `rx()` in element attributes!**
>
> ```tsx
> // ❌ WRONG - Not reactive, renders once
> <input value={rx(signal)} />
> <div className={rx(theme)} />
>
> // ✅ CORRECT - Use one of these patterns:
> {rx("input", { value: signal })}
> {rx({ signal }, (value) => <input value={value.signal} />)}
> ```
>
> **Why?** `rx()` returns a React component. When used in attributes, it's evaluated once and won't update. Always wrap the entire element or use the component overload.

### `useScope()` - Three Modes

Unified hook for lifecycle management and scoped services.

**Mode 1: Factory mode** - Create scoped signals/services

```tsx
const { count, doubled } = useScope(
  () => {
    const count = signal(0);
    const doubled = count.pipe(select((x) => x * 2));

    return {
      count,
      doubled,
      dispose: [count, doubled], // Automatically disposed on unmount
    };
  },
  {
    watch: [userId], // Optional: Recreate scope when userId changes
  }
);
```

**Mode 2: Component lifecycle** - Track component lifecycle phases

```tsx
const getPhase = useScope({
  init: () => console.log("Before first render"),
  mount: () => console.log("After first paint"),
  render: () => console.log("Every render"),
  cleanup: () => console.log("React cleanup (may run 2-3x in StrictMode)"),
  dispose: () => console.log("True unmount (runs exactly once)"),
});

// Check current phase dynamically
console.log(getPhase()); // "render" | "mount" | "cleanup" | "disposed"
```

**Mode 3: Object lifecycle** - Track object reference changes

```tsx
const user = { id: 1, name: "John" };

const getPhase = useScope({
  for: user, // Track this object
  init: (user) => console.log("User activated:", user),
  mount: (user) => startTracking(user),
  render: (user) => console.log("Rendering with", user),
  cleanup: (user) => pauseTracking(user),
  dispose: (user) => analytics.track("user-session-end", user),
});

// When user reference changes:
// 1. cleanup(oldUser) + dispose(oldUser)
// 2. init(newUser) + mount(newUser)
```

### `useSignals(signals)`

Subscribe to signals with lazy tracking.

```tsx
const [value, loadable] = useSignals({ user, posts });

// Suspense pattern (throws promises/errors)
<Suspense fallback={<Loading />}>
  <div>{value.user.name}</div>
</Suspense>;

// Manual loading states
if (loadable.user.status === "loading") return <Spinner />;
if (loadable.user.status === "error") return <Error />;
return <div>{loadable.user.value.name}</div>;
```

### `wait()` - Handle Promises

```tsx
import { wait } from "rextive";

// Suspense-style (throws promises/errors)
const [user, posts] = wait([userSignal, postsSignal]);

// Promise-style with callbacks
await wait([userSignal, postsSignal], (user, posts) => {
  console.log(user.name, posts.length);
});

// With error handling
await wait(
  [userSignal, postsSignal],
  (user, posts) => ({ user, posts }),
  (error) => ({ user: null, posts: [] })
);

// Helpers
await wait.any({ user, posts }, ([val, key]) => {}); // First success
await wait.race({ user, posts }, ([val, key]) => {}); // First settle

// wait.settled - never rejects, returns PromiseSettledResult shapes
const results = await wait.settled([user, posts], (settled) => {
  // settled is array of { status: "fulfilled", value } | { status: "rejected", reason }
  return settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
});

const result = await wait.timeout(user, 5000, "Timeout");
await wait.delay(1000); // Sleep
```

---

## 🔧 Operators

Operators are composable functions for transforming signals. Import from `rextive/op`:

```tsx
import { select, filter, scan } from "rextive/op";
```

### `select(fn, equals?)` - Transform Values

Transform each value from the source signal.

```tsx
import { signal } from "rextive";
import { select } from "rextive/op";

const count = signal(5);

// Single transformation
const doubled = count.pipe(select((x) => x * 2));

// With equality check
const name = user.pipe(select((u) => u.name, "shallow"));

// With options
const formatted = count.pipe(
  select((x) => `Count: ${x}`, {
    equals: "strict",
    name: "formatted",
  })
);

```

**Parameters:**

- `fn: (value: T) => U` - Transformation function
- `equals?` - Equality strategy: `"strict"` | `"shallow"` | `"deep"` | options object

**Benefits:**

- ✅ Avoids re-awaiting already resolved promises (uses cached loadable state)
- ✅ Works with both promise and non-promise values
- ✅ Supports async transformation functions
- ✅ Properly handles errors from rejected promises

### `filter(predicate, equals?)` - Filter Values

Only emit values that pass the predicate test. If the predicate returns false, the signal keeps its previous value.

**Note:** The first value is always emitted, regardless of the predicate.

```tsx
import { filter } from "rextive/op";

const count = signal(1);

// Only positive numbers
const positiveOnly = count.pipe(filter((x) => x > 0));

count.set(2); // positiveOnly() === 2
count.set(-1); // positiveOnly() === 2 (unchanged, filtered out)
count.set(5); // positiveOnly() === 5

// Type narrowing
const value = signal<string | number>(1);
const numbersOnly = value.pipe(filter((x): x is number => typeof x === "number"));
// Type: ComputedSignal<number>
```

**Parameters:**

- `predicate: (value: T) => boolean` - Test function
- `equals?` - Equality strategy: `"strict"` | `"shallow"` | `"deep"` | options object

### `scan(fn, initialValue, equals?)` - Accumulate Values

Accumulate values with state, similar to `Array.reduce()`. The accumulator is updated on each source signal change.

```tsx
import { scan } from "rextive/op";

const count = signal(1);

// Running total
const total = count.pipe(scan((acc, curr) => acc + curr, 0));

count.set(2); // total() === 3
count.set(3); // total() === 6

// Keep history
const history = count.pipe(scan((acc, curr) => [...acc, curr], [] as number[]));

// Build statistics
const stats = count.pipe(
  scan(
    (acc, curr) => ({
      sum: acc.sum + curr,
      count: acc.count + 1,
      avg: (acc.sum + curr) / (acc.count + 1),
    }),
    { sum: 0, count: 0, avg: 0 },
    "shallow" // Shallow equality check
  )
);
```

**Parameters:**

- `fn: (accumulator: U, current: T) => U` - Accumulator function
- `initialValue: U` - Initial accumulator value
- `equals?` - Equality strategy: `"strict"` | `"shallow"` | `"deep"` | options object

### Composing Operators

Chain multiple operators for complex transformations:

```tsx
import { select, filter, scan } from "rextive/op";

const count = signal(1);

const result = count.pipe(
  filter((x) => x > 0), // Only positive
  select((x) => x * 2), // Double it
  scan((acc, x) => acc + x, 0) // Running sum
);

// Reusable operators
const positiveOnly = filter((x: number) => x > 0);
const double = select((x: number) => x * 2);
const sum = scan((acc: number, x: number) => acc + x, 0);

const pipeline1 = count.pipe(positiveOnly, double, sum);
const pipeline2 = otherSignal.pipe(positiveOnly, double, sum);
```

**Benefits:**

- **Composable**: Build complex transformations from simple operators
- **Reusable**: Define operators once, use everywhere
- **Type-safe**: Full TypeScript inference through the chain
- **Automatic cleanup**: Intermediate signals are disposed automatically

---

## 🆚 Comparison with Other Libraries

### vs React useState + useEffect

```tsx
// ❌ React - Boilerplate hell
const [count, setCount] = useState(0);
const [name, setName] = useState("");
const doubled = useMemo(() => count * 2, [count]);

useEffect(() => {
  console.log("count changed");
}, [count]);

// ✅ Rextive - Simple and unified
import { signal } from "rextive";
import { select } from "rextive/op";

const count = signal(0);
const name = signal("");
const doubled = count.pipe(select((x) => x * 2));

count.on(() => console.log("count changed"));
```

### vs Zustand

```tsx
// ❌ Zustand - Must select everything upfront
const { user, posts, comments } = useStore((state) => ({
  user: state.user,
  posts: state.posts,
  comments: state.comments, // Subscribed even if not used!
}));

// ✅ Rextive - Lazy tracking
import { rx } from "rextive/react";

rx({ user, posts, comments }, (value) => {
  return <div>{value.user.name}</div>; // Only user subscribed!
});
```

### vs React Query

```tsx
// ❌ React Query - Complex setup
const { data } = useQuery({
  queryKey: ["todos", userId],
  queryFn: () => fetchTodos(userId),
  // ... many options
});

// ✅ Rextive - Simple and powerful
import { signal } from "rextive";

const userId = signal(1);
const todos = signal({ userId }, async ({ deps, abortSignal }) => {
  return fetch(`/todos/${deps.userId}`, { signal: abortSignal });
});
```

### vs Jotai

```tsx
// ❌ Jotai - Must use all atoms
const [user] = useAtom(userAtom);
const [posts] = useAtom(postsAtom); // Subscribed even if unused
const [comments] = useAtom(commentsAtom); // Subscribed even if unused

// ✅ Rextive - Lazy tracking
import { rx } from "rextive/react";

rx({ user, posts, comments }, (value) => {
  return <div>{value.user.name}</div>; // Only user subscribed!
});
```

### vs Redux Toolkit

```tsx
// ❌ Redux Toolkit - So much ceremony
const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    reset: (state) => {
      state.value = 0;
    },
  },
});

// ✅ Rextive - Direct and simple
import { signal } from "rextive";

const count = signal(0);
count.set((x) => x + 1);
count.set((x) => x - 1);
count.reset();
```

---

## 💎 Why Choose Rextive?

### 🎯 **One Concept to Rule Them All**

Learn `signal` once. Use it everywhere. No mental overhead switching between useState, useEffect, useMemo, Redux, React Query, etc.

### ⚡ **Performance That Just Works**

- **Lazy tracking** - Only subscribes to signals you actually use
- **Automatic batching** - Intelligent update scheduling
- **Smart memoization** - Computed signals cache automatically
- **Request cancellation** - Abort signals built-in

### 🧠 **Less Code, More Power**

```tsx
import { signal } from "rextive";

// 100 lines of Redux/React Query code becomes...
const data = signal(async () => fetchData());

// That's it. Full async support, caching, subscriptions, everything.
```

### 🔌 **Works Everywhere**

- ✅ React (with Suspense support)
- ✅ Vanilla JavaScript
- ✅ Vue, Svelte, Angular (same API)
- ✅ Node.js (for server-side logic)

### 🎨 **Developer Experience**

- 📝 Full TypeScript support with perfect inference
- 🐛 Excellent debugging with named signals
- 📦 Tree-shakeable - only pay for what you use
- 🎯 Zero configuration needed

### 🚀 **Production Ready**

- ✅ 96% test coverage
- ✅ Battle-tested in production apps
- ✅ Comprehensive documentation
- ✅ Active maintenance

---

## 📦 What's Included

```bash
rextive/          # Core - works anywhere
rextive/react     # React integration
```

**Core features:**

- `signal` - Reactive state primitive
- `signal.batch` - Batch updates
- `signal.persist` - Persistence utilities
- `signal.tag` - Group signals
- `wait` - Promise utilities

**React features:**

- `rx` - Reactive rendering
- `useScope` - Component-scoped signals & lifecycle control (3 modes)
- `useSignals` - Subscribe with lazy tracking

---

## 🎓 Learn More

Check out the [examples folder](./examples) for more patterns:

- 🎨 Service pattern
- 🔧 Disposable shapes
- 📝 Form management
- 🔄 Polling and real-time data
- 🎯 Advanced patterns

---

## 📄 License

MIT © [linq2js](https://github.com/linq2js)

---

## 🌟 Show Your Support

If Rextive helps you build better apps, give it a ⭐ on [GitHub](https://github.com/linq2js/rxblox)!

**Built with ❤️ by developers, for developers.**
