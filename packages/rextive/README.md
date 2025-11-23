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
// Or use $ for concise code: import { $ } from "rextive";

const count = signal(0);
const doubled = count.map((x) => x * 2);
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
import { signal } from "rextive";
import { rx } from "rextive/react";

const count = signal(0); // create signal
const increment = () => count.set((x) => x + 1); // mutate signal
const Counter = <h1 onClick={increment}>{rx(count)}</h1>; // Counter UI
```

**That's it.** No providers. No hooks. No boilerplate.

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

### Single Dependency: Use `.map()`

For simple transformations of a single signal, use `.map()`:

```tsx
const count = signal(0);
const doubled = count.map((x) => x * 2);
const formatted = count.map((x) => `Count: ${x}`);

// With custom equality (string shortcuts or functions)
const user = signal({ name: "John", age: 30 });
const name = user.map((u) => u.name, "shallow");
const data = user.map((u) => u.data, "deep");
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

- `'is'` (default) - Reference equality using `Object.is`
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
| `.map()`                     | Single dependency transformation | `count.map(x => x * 2)`                           |
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
import { signal } from "rextive";
import { rx } from "rextive/react";

const user = signal(async () => fetchUser()); // Async
const count = signal(0); // Sync
const doubled = count.map((x) => x * 2); // Computed (transformation)

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
import { signal } from "rextive";

const count = signal(0);
const doubled = count.map((x) => x * 2);

function Counter() {
  return (
    <div>
      <h1>Count: {count()}</h1>
      <h2>Doubled: {doubled()}</h2>
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
  return <Suspense fallback={<div>Loading...</div>}>{user().name}</Suspense>;
}

// Change user - previous fetch cancelled automatically!
userId.set(2);
```

### Component-Scoped State (Auto-Cleanup)

```tsx
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";

function TodoList() {
  const { todos, filter } = useScope(() => {
    const todos = signal([]);
    const filter = signal("all");

    return {
      todos,
      filter,
      dispose: [todos, filter], // ✅ Auto-disposed when component unmounts!
    };
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
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";

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

  return {
    params,
    data,
    dispose: [params, data], // Dispose signals when scope unmounts
  };
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
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";

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

    return {
      form,
      errors,
      isValid,
      dispose: [form, errors, isValid], // Dispose all signals
    };
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
import { signal } from "rextive";
import { useScope } from "rextive/react";

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

    return {
      searchTerm,
      results,
      dispose: [searchTerm, results], // Dispose signals on unmount
    };
  });

  return (
    <div>
      <input
        value={searchTerm()}
        onChange={(e) => searchTerm.set(e.target.value)}
      />
      {results().map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
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

### Transform with `.map()` (Stateless)

```tsx
import { signal } from "rextive";

const count = signal(5);

const doubled = count.map((x) => x * 2);
const formatted = count.map((x) => `Count: ${x}`);

// Chainable
const result = count
  .map((x) => x * 2)
  .map((x) => x + 1)
  .map((x) => `Result: ${x}`);

// With custom equality
const user = signal({ name: "John", age: 30 });
const name = user.map(
  (u) => u.name,
  (a, b) => a === b // Only notify if name changes
);
```

### Accumulate with `.scan()` (Stateful)

```tsx
import { signal } from "rextive";

const count = signal(1);

// Running total
const total = count.scan((sum, curr) => sum + curr, 0);
count.set(2); // total = 3
count.set(3); // total = 6

// Keep last 3 values
const last3 = count.scan((acc, curr) => [...acc, curr].slice(-3), []);

// Build statistics with shallow equality
const stats = count.scan(
  (acc, curr) => ({
    sum: acc.sum + curr,
    count: acc.count + 1,
    avg: (acc.sum + curr) / (acc.count + 1),
    min: Math.min(acc.min, curr),
    max: Math.max(acc.max, curr),
  }),
  { sum: 0, count: 0, avg: 0, min: Infinity, max: -Infinity },
  "shallow" // String shortcut for shallow equality
);

// Or with full options
const stats = count.scan(
  (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
  { sum: 0, count: 0 },
  { equals: "shallow", name: "runningStats" }
);
```

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
const doubled = count.map((x) => x * 2);

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

// Transformations
count.map((x) => x * 2, "shallow"); // Transform value (stateless)
count.scan((sum, x) => sum + x, 0, "deep"); // Accumulate value (stateful)
```

**Options:**

```tsx
signal(value, {
  name: "mySignal", // For debugging
  lazy: true, // Compute only when accessed
  equals: "shallow", // String shortcut: 'is' | 'shallow' | 'deep' | custom function
  fallback: (error) => value, // Error fallback value
  onChange: (value) => {}, // Change callback
  onError: (error) => {}, // Error callback
  tags: [myTag], // Group with tags
});

// Equals option accepts:
// - 'is' (default): Object.is (reference equality)
// - 'shallow': Shallow comparison (object keys/array elements)
// - 'deep': Deep comparison (lodash isEqual)
// - Custom function: (a, b) => boolean
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

#### `.map(fn, equals?)` → `ComputedSignal`

Transform signal value (stateless). Returns a new computed signal.

```tsx
const count = signal(0);

// Basic transformation
const doubled = count.map((x) => x * 2);

// With equality check
const user = signal({ name: "John", age: 30 });
const name = user.map((u) => u.name, "shallow");

// With custom equals
const data = user.map(
  (u) => ({ name: u.name }),
  (a, b) => a.name === b.name
);
```

**Equals options:** `'is'` | `'shallow'` | `'deep'` | `(a, b) => boolean`

#### `.scan(fn, initial, equals?)` → `ComputedSignal`

Accumulate values with state (stateful). Returns a new computed signal.

```tsx
const count = signal(1);

// Running total
const total = count.scan((sum, curr) => sum + curr, 0);

// With equality check
const stats = count.scan(
  (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
  { sum: 0, count: 0 },
  "shallow"
);
```

**Equals options:** `'is'` | `'shallow'` | `'deep'` | `(a, b) => boolean`

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

### `useScope()` - Three Modes

Unified hook for lifecycle management and scoped services.

**Mode 1: Factory mode** - Create scoped signals/services

```tsx
const { count, doubled } = useScope(
  () => {
    const count = signal(0);
    const doubled = count.map((x) => x * 2);

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

const count = signal(0);
const name = signal("");
const doubled = count.map((x) => x * 2);

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
