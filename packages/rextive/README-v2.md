# Rextive ⚡

> **One signal-first mental model for local state, global data, async workflows, and UI rendering.**

[![npm version](https://img.shields.io/npm/v/rextive.svg)](https://www.npmjs.com/package/rextive)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

```bash
npm install rextive
```

Rextive replaces piles of hooks, stores, and cache layers with a single primitive: `signal`. The same API powers React apps, vanilla JavaScript, Node services, and any framework that can run JavaScript.

## Highlights

- **One concept** – forget juggling `useState`, `useMemo`, `useEffect`, Redux, and React Query
- **Lazy & precise** – subscribe only to the values you actually touch
- **Sync ⇄ async symmetry** – data fetching, caching, and cancellation work the same as local counters
- **React-friendly** – render with `rx()`, scope lifecycle with `useScope`, or read signals with Suspense
- **Tiny & portable** – works in React, Vue, Svelte, Angular, or no framework at all

## Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🧠 Core Ideas](#-core-ideas)
- [🛠 Everyday Patterns](#-everyday-patterns)
- [✨ Features at a Glance](#-features-at-a-glance)
- [🌀 Operators](#-operators)
- [🧰 Advanced Toolkit](#-advanced-toolkit)
- [⚛️ React Helpers](#️-react-helpers)
- [🆚 Comparisons](#-comparisons)
- [📚 Learn More](#-learn-more)
- [📄 License & Support](#-license--support)

## 🚀 Quick Start

### React in 30 seconds

```tsx
import { signal, rx } from "rextive/react";

const count = signal(0);
const increment = () => count.set((n) => n + 1);

const Counter = () => <button onClick={increment}>{rx(count)}</button>;
```

No providers, contexts, or selectors. Import everything from `rextive/react` for a batteries-included React DX (`signal`, `rx`, `useScope`, `wait`, `loadable`, ...).

### Vanilla JavaScript

```ts
import { signal } from "rextive";

const count = signal(0);

signal({ count }, ({ deps }) => {
  document.querySelector("#counter")!.textContent = String(deps.count);
});

count.set((n) => n + 1);
```

### Prefer shorthand?

```ts
import { $ } from "rextive";

const count = $(0);
const doubled = $({ count }, ({ deps }) => deps.count * 2);
```

`signal()` and `$()` are interchangeable—pick the style that reads best to you.

## 🧠 Core Ideas

### 1. Signals 101

```ts
const count = signal(0);
count(); // read
count.set(1); // write
count.set((n) => n + 1);
count.reset(); // back to initial
```

Signals are callable values. Reading subscribes lazily, writing notifies dependents, and disposal cleans everything up.

### 2. Operators for single sources

```ts
import { select, filter, scan } from "rextive/op";

const count = signal(1);
const doubled = count.pipe(select((n) => n * 2));
const positive = count.pipe(filter((n) => n > 0));
const total = count.pipe(scan((sum, n) => sum + n, 0));
```

Operators keep transformations declarative while preserving TypeScript inference.

### 3. Multiple dependencies

```ts
const firstName = signal("Ada");
const lastName = signal("Lovelace");

const fullName = signal(
  { firstName, lastName },
  ({ deps }) => `${deps.firstName} ${deps.lastName}`
);
```

Pass an object of dependencies and a compute function. Rextive tracks access lazily, so only touched values re-run.

### 4. Async is first-class

```ts
const userId = signal(1);

const user = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/api/users/${deps.userId}`, { signal: abortSignal });
  return res.json();
});

userId.set(2); // automatically cancels the previous fetch
```

Every async signal receives an `AbortSignal`. Combine it with `AbortController`, `AbortSignal.any`, or `AbortSignal.timeout` for zero-effort cancellation.

### 5. Equality strategies

```ts
const user = signal({ name: "Ada", age: 28 }, "shallow");
const item = signal({ id: 1, value: 42 }, (a, b) => a.id === b.id);
```

Use `'strict'` (default), `'shallow'`, `'deep'`, or provide a custom comparer to avoid noisy re-renders.

## 🛠 Everyday Patterns

### Counter (hello world)

```tsx
import { signal, rx } from "rextive/react";
import { select } from "rextive/op";

const count = signal(0);
const doubled = count.pipe(select((n) => n * 2));

const Counter = () => (
  <div>
    <p>Count: {rx(count)}</p>
    <p>Doubled: {rx(doubled)}</p>
    <button onClick={() => count.set((n) => n + 1)}>+1</button>
    <button onClick={() => count.reset()}>Reset</button>
  </div>
);
```

### React Query–style data + cancellation

```tsx
const searchTerm = signal("react");

const results = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  if (!deps.searchTerm) return [];
  await new Promise((r) => setTimeout(r, 250)); // debounce
  const res = await fetch(`/search?q=${deps.searchTerm}`, {
    signal: abortSignal,
  });
  return res.json();
});

searchTerm.set("vue"); // previous fetch cancels automatically
```

### Component-scoped services

```tsx
import { signal, disposable, rx, useScope } from "rextive/react";

function TodoList() {
  const { todos, filter } = useScope(() =>
    disposable({
      todos: signal([]),
      filter: signal("all"),
    })
  );

  return rx({ todos, filter }, ({ todos, filter }) => (
    <section>
      <input onChange={(e) => filter.set(e.target.value)} />
      <ul>
        {todos
          .filter((todo) => filter === "all" || todo.status === filter)
          .map((todo) => (
            <li key={todo.id}>{todo.title}</li>
          ))}
      </ul>
    </section>
  ));
}
```

### Query factory (service pattern)

```ts
function createQuery(endpoint: string) {
  const params = signal<Record<string, unknown>>();
  const data = signal({ params }, async ({ deps, abortSignal }) => {
    if (!deps.params) return null;
    const res = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(deps.params),
      signal: abortSignal,
    });
    return res.json();
  });
  return disposable({ params, data });
}
```

### Form validation

```tsx
const form = signal({ name: "", email: "" });
const errors = signal({ form }, ({ deps }) => {
  const errs: Record<string, string> = {};
  if (!deps.form.name) errs.name = "Required";
  if (!deps.form.email.includes("@")) errs.email = "Invalid email";
  return errs;
});
const isValid = signal(
  { errors },
  ({ deps }) => Object.keys(deps.errors).length === 0
);
```

### Batch + persist

```ts
signal.batch(() => {
  first.set("Jane");
  last.set("Doe");
});

const { signals } = signal.persist(
  { theme: signal("dark"), settings: signal({}) },
  {
    load: () => JSON.parse(localStorage.getItem("app") || "{}"),
    save: (values) => localStorage.setItem("app", JSON.stringify(values)),
  }
);
```

## ✨ Features at a Glance

| Capability           | Rextive                   | Notes                                         |
| -------------------- | ------------------------- | --------------------------------------------- |
| Learning curve       | One primitive (`signal`)  | No atoms, stores, or reducers                 |
| Lazy tracking        | ✅                        | Only accessed values subscribe                |
| Async built-in       | ✅                        | AbortSignal provided automatically            |
| Request cancellation | ✅                        | Works with fetch, Axios, anything abort-aware |
| Component scoping    | `useScope` / `disposable` | Automatic cleanup even in StrictMode          |
| Cross-framework      | ✅                        | React, Vue, Svelte, Angular, Vanilla          |
| Bundle size          | ⚡ Tiny                   | Tree-shakeable, zero deps                     |

## 🌀 Operators

Import from `rextive/op` and compose like array helpers.

```ts
import { select, filter, scan } from "rextive/op";

const stats = count.pipe(
  filter((n) => n > 0),
  select((n) => n * 2),
  scan(
    (state, value) => ({
      sum: state.sum + value,
      count: state.count + 1,
      avg: (state.sum + value) / (state.count + 1),
    }),
    { sum: 0, count: 0, avg: 0 },
    "shallow"
  )
);
```

- `select(fn, equals?)` – map values (optionally provide equality strategy)
- `filter(predicate, equals?)` – keep the last value that passed
- `scan(reducer, initial, equals?)` – stateful accumulation (like `Array.reduce`)

## 🧰 Advanced Toolkit

- `signal.batch(fn)` – collapse multiple writes into one notification
- `signal.persist(config, storage)` – sync signals to any storage adapter
- `signal.tag()` – group related signals and operate on them as a set
- `awaited(...selectors)` – seamlessly transform signals that may resolve to promises
- `wait()` utilities – `wait.any`, `wait.race`, `wait.settled`, `wait.timeout`, `wait.delay`
- `signal.to()` / `.pipe()` – bridge signals into other ecosystems while keeping disposal automatic

## ⚛️ React Helpers

### `rx()` – render reactively

```tsx
rx({ user, posts }, ({ user, posts }, loadable) => (
  <div>
    <h1>{user.name}</h1>
    {loadable.posts.status === "loading" && <Spinner />}
  </div>
));
```

Wrap the entire element instead of calling `rx()` inside props—`rx()` returns a component.

### `useScope()` – one hook, three modes

1. **Factory** – create per-component services and dispose automatically
2. **Lifecycle** – observe `init`, `mount`, `render`, `cleanup`, `dispose`
3. **Object lifecycle** – track when arbitrary objects change references

### `useWatch()` – subscribe with full loadable metadata

```tsx
const [value, loadable] = useWatch({ user, posts });
if (loadable.user.status === "loading") return <Spinner />;
return <div>{value.user.name}</div>;
```

## 🆚 Comparisons

| Problem                           | Typical Stack                        | With Rextive                 |
| --------------------------------- | ------------------------------------ | ---------------------------- |
| Local state + memo + side-effects | `useState` + `useMemo` + `useEffect` | `signal`                     |
| Global state                      | Redux / Zustand / Jotai              | Export a `signal`            |
| Data fetching                     | React Query / SWR                    | `signal({ deps }, async fn)` |
| Derived data                      | Selectors & memoization libraries    | `.pipe(select())`            |
| Request cancellation              | Manual AbortController wiring        | Auto `abortSignal` argument  |

## 📚 Learn More

Explore the [`examples/`](./examples) folder for ready-to-run snippets:

- Disposable services & scopes
- Form management and validation
- Polling and streaming data
- Service factories & dependency injection patterns
- Advanced Suspense + `wait()` flows

## 📄 License & Support

- Licensed under [MIT](https://opensource.org/licenses/MIT) – © [linq2js](https://github.com/linq2js)
- Give the repo a ⭐ on [GitHub](https://github.com/linq2js/rxblox) if Rextive makes your apps happier
- Issues and feature requests are always welcome – we build this for developers like you ❤️
