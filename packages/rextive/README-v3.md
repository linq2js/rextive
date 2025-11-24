# Rextive ⚡

> **The simplest way to manage reactive state.**
> One concept (`signal`). Zero boilerplate. Infinite power.

[![npm version](https://img.shields.io/npm/v/rextive.svg)](https://www.npmjs.com/package/rextive)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## ⚡ Quick Start

Install it:

```bash
npm install rextive
```

### React in 30 Seconds

No providers. No complex hooks. Just signals.

```tsx
import { signal, rx } from "rextive/react";

// 1️⃣ Create a signal (state)
const count = signal(0);

// 2️⃣ Create a computed signal (derived state)
// Automatically updates when 'count' changes
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

function Counter() {
  return (
    <div>
      {/* 3️⃣ Render reactive values with rx() */}
      <h1>Count: {rx(count)}</h1>
      <h2>Doubled: {rx(doubled)}</h2>

      {/* 4️⃣ Update state directly */}
      <button onClick={() => count.set((c) => c + 1)}>Increment</button>
    </div>
  );
}
```

**What just happened?**

- `signal(0)` creates a mutable reactive value.
- `signal({ count }, ...)` creates a computed value that _tracks_ `count`.
- `rx(count)` subscribes the component to updates _precisely_ where needed.
- `count.set(...)` updates the value and triggers re-renders.

---

## 🤯 Why Rextive?

Most libraries make you learn 5 different concepts to manage state. Rextive gives you **one**.

| Task         | React (Standard)   | Redux / Zustand        | **Rextive**          |
| ------------ | ------------------ | ---------------------- | -------------------- |
| **State**    | `useState`         | `createStore` / slices | `signal`             |
| **Computed** | `useMemo`          | Selectors              | `signal`             |
| **Async**    | `useEffect`        | Thunks / Middleware    | `signal`             |
| **Global**   | `Context.Provider` | `<Provider>`           | `signal` (export it) |
| **Cleanup**  | `useEffect` return | Manual                 | Automatic            |

### The Rextive Difference

```tsx
// ❌ The Old Way (React)
const [count, setCount] = useState(0);
const doubled = useMemo(() => count * 2, [count]); // Manually declare deps
useEffect(() => {
  /* sync effects */
}, [count]); // Easy to mess up

// ✅ The Rextive Way
const count = signal(0);
const doubled = signal({ count }, ({ deps }) => deps.count * 2); // Auto-tracked
```

---

## 📖 Core Concepts

### 1. The Signal (`signal`)

A signal is a container for a value that can change.

```ts
import { signal } from "rextive";

const count = signal(0);

// Get value
console.log(count()); // 0

// Set value
count.set(1);
count.set((prev) => prev + 1);

// Reset
count.reset();
```

### 2. Computed Signals (Dependencies)

Signals can depend on other signals. They update automatically.

```ts
const price = signal(100);
const quantity = signal(2);

// Pass dependencies in the first argument object
const total = signal(
  { price, quantity },
  ({ deps }) => deps.price * deps.quantity
);

console.log(total()); // 200
price.set(50);
console.log(total()); // 100 (Updated automatically!)
```

### 3. Async & Auto-Cancellation 🚀

This is where Rextive shines. Async signals automatically handle race conditions and cancellation.

```tsx
const userId = signal(1);

// Automatically re-runs when userId changes
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  // 🪄 abortSignal is auto-triggered if userId changes again
  // before this request finishes!
  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal,
  });
  return res.json();
});
```

### 4. Lazy Tracking (Performance) ⚡

Rextive only computes or subscribes to what you _actually use_.

```tsx
const state = signal({
  name: "John",
  veryHeavyData: [
    /* ... huge array ... */
  ],
});

// Component A only cares about the name
rx(state, (value) => (
  // Rextive sees you only accessed 'name'.
  // Updates to 'veryHeavyData' will NOT re-render this!
  <div>{value.name}</div>
));
```

---

## 🛠️ React Integration Patterns

### Rendering Signals (`rx`)

Use `rx` to render signals. It can be used in three ways:

**1. Direct Render:**

```tsx
<h1>{rx(count)}</h1>
```

**2. Wrapper Component:**

```tsx
{
  /* Renders a <span> by default, or specify tag/component */
}
{
  rx("div", { className: "counter", children: count });
}
```

**3. Render Prop (for granular control):**

```tsx
{
  /* Unwraps the signal value for full control */
}
{
  rx(user, (u) => <div>Hello, {u.name}</div>);
}
```

### Component Scope (`useScope`)

Need state that lives and dies with a component? Use `useScope`.

```tsx
import { useScope, disposable } from "rextive/react";

function TodoList() {
  // Initialize signals that are scoped to this component
  const { todos, filter } = useScope(() => {
    const todos = signal([]);
    const filter = signal("all");

    // 'disposable' ensures these signals are cleaned up when
    // the component unmounts to prevent memory leaks.
    return disposable({ todos, filter });
  });

  return <div>{/* ... */}</div>;
}
```

---

## 💡 Advanced Examples

### 1. Search with Debounce & Cancellation

A production-ready search input in minimal lines of code.

```tsx
import { signal, rx, useScope, disposable } from "rextive/react";

function Search() {
  const { query, results } = useScope(() => {
    const query = signal("");

    const results = signal({ query }, async ({ deps, abortSignal }) => {
      // 1. Don't search if empty
      if (!deps.query) return [];

      // 2. Debounce: Wait 300ms
      await new Promise((r) => setTimeout(r, 300));
      if (abortSignal.aborted) return []; // Stop if cancelled

      // 3. Fetch with auto-cancellation
      const res = await fetch(`/search?q=${deps.query}`, {
        signal: abortSignal,
      });
      return res.json();
    });

    return disposable({ query, results });
  });

  return (
    <div>
      <input
        onChange={(e) => query.set(e.target.value)}
        placeholder="Search..."
      />
      {rx(results, (items) => (
        <ul>
          {items.map((i) => (
            <li key={i.id}>{i.name}</li>
          ))}
        </ul>
      ))}
    </div>
  );
}
```

### 2. Global State Management

No provider component needed. Just export your signals.

```ts
// store.ts
import { signal } from "rextive";

export const theme = signal("light");
export const user = signal(null);

export const toggleTheme = () => {
  theme.set((t) => (t === "light" ? "dark" : "light"));
};
```

```tsx
// App.tsx
import { rx } from "rextive/react";
import { theme, toggleTheme } from "./store";

function App() {
  return (
    // Updates class when theme changes
    <div className={rx(theme)}>
      <button onClick={toggleTheme}>Toggle Mode</button>
    </div>
  );
}
```

---

## 📚 API Reference

### `signal(initialValue, options?)`

Creates a mutable signal.

- **`options.equals`**: `'strict'` (default), `'shallow'`, `'deep'`, or custom function.
- **`options.lazy`**: `true` to only compute when read.

### `signal({ dependencies }, computeFn)`

Creates a computed/derived signal.

- **`dependencies`**: Object map of signals to track.
- **`computeFn`**: Function receiving `{ deps, abortSignal }`.

### `rx(source, renderFn?)`

React helper to render signals.

- **`source`**: A signal or object of signals.
- **`renderFn`**: Optional function to transform value before rendering.

### `useScope(factoryFn)`

React hook for component-lifecycle management.

- **`factoryFn`**: Function that returns an object of signals to scope.
- **Returns**: The object created by factoryFn.

---

## ❓ FAQ

<details>
<summary><strong>How does it compare to Signals in Preact/Solid/Angular?</strong></summary>

Rextive's API is designed to be more unified. Instead of separate `computed` and `effect` primitives, `signal` handles both derived state and side effects through its dependency syntax. It also has built-in async support which others often delegate to user-land.

</details>

<details>
<summary><strong>Can I use it outside of React?</strong></summary>

**Yes!** The core `rextive` package is framework-agnostic. `rextive/react` is just a thin wrapper. You can use it in Vanilla JS, Svelte, Vue, or Node.js.

</details>

---

## 📄 License

MIT © [linq2js](https://github.com/linq2js)
