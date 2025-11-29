# Rextive ⚡

<div align="center">

### **Reactive state management that just clicks**

One concept. Zero complexity. Pure power.

[![npm version](https://img.shields.io/npm/v/rextive.svg)](https://www.npmjs.com/package/rextive)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/rextive)](https://bundlephobia.com/package/rextive)

</div>

---

## ✨ Why Developers Love Rextive

Create reactive state with `signal()`, derive computed values with `.to()` or explicit dependencies, and render reactively with `rx()` — all with zero boilerplate:

```tsx
import { signal, rx } from "rextive/react";

// 🎯 One concept for everything
const count = signal(0); // Mutable state
const doubled = count.to((x) => x * 2); // Derived value
const tripled = signal({ count }, ({ deps }) => deps.count * 3); // Explicit deps
const increment = () => count.set((prev) => prev + 1); // Update signal
// Effect signal: runs immediately (lazy: false), re-runs when refresh() is called
signal(
  ({ refresh }) => {
    count.set((prev) => prev + 1); // Increment count
    setTimeout(refresh, 5000); // Schedule next refresh in 5 seconds
    return count(); // Signals must return a value
  },
  { lazy: false }
);

// 🔥 Zero boilerplate React — rx() makes any signal reactive
const App = () => (
  <div onClick={increment}>
    Count: {rx(count)} | Doubled: {rx(doubled)}
  </div>
);
```

---

## 🚀 Killer Features

### **Unified API** — One `signal()` for state, computed, and async

No need to learn different APIs for different use cases. `signal()` handles mutable state, computed values, and async data fetching with the same intuitive interface:

```tsx
const user = signal({ name: "Alice" }); // Mutable state
const greeting = user.to((u) => `Hello, ${u.name}!`); // Computed from state
const data = signal(async () => fetch("/api")); // Async data fetching
```

### **First-Class Async** — Promises just work

```tsx
// Async signals automatically handle promises and cancellation
const userData = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/users/${deps.userId}`, { signal: abortSignal });
  return res.json();
});
```

**Manual loading states with `loadable()`** — Full control over loading, error, and success states:

```tsx
{
  rx(() => {
    const state = loadable(userData);
    if (state.status === "loading") return <Spinner />;
    if (state.status === "error") return <Error error={state.error} />;
    return <User data={state.value} />;
  });
}
```

**Suspense + ErrorBoundary with `wait()`** — Declarative async rendering using React's built-in patterns:

wait() throws promises for Suspense during loading and errors for ErrorBoundary on rejection

```tsx
<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <Suspense fallback={<div>Loading...</div>}>
    {rx(() => (
      <User data={wait(userData)} />
    ))}
  </Suspense>
</ErrorBoundary>
```

**Compact syntax with `rx(Component, props)`** — Pass signal props directly, auto-unwrapped and Suspense-ready:

```tsx
<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <Suspense fallback={<div>Loading...</div>}>
    {rx(User, { data: userData })}
  </Suspense>
</ErrorBoundary>
```

### **Powerful Operators** — RxJS-inspired pipelines

Chain operators to build complex data flows. Debounce user input, filter invalid values, and transform results — all in a clean, readable pipeline:

```tsx
import { debounce, distinct, filter, to } from "rextive/op";

const searchTerm = signal("");

const searchResults = searchTerm.pipe(
  debounce(300), // Wait 300ms after typing stops
  filter((term) => term.length > 2), // Only search if 3+ characters
  to((term) => fetchResults(term)) // Transform to async search results
);
```

### **Error Tracing** — Debug errors across signal chains

When errors occur in complex signal chains, `signal.trace()` shows the complete propagation path — which signal failed, when it failed, and how the error bubbled up through dependencies:

```tsx
try {
  finalSignal();
} catch (error) {
  const traces = signal.trace(error);
  // → [{ signal: "dbConnection", when: "compute:initial", async: true },
  //    { signal: "userService", when: "compute:dependency" },
  //    { signal: "dashboard", when: "compute:dependency" }]
}
```

### **Built-in DevTools** — Visual debugging panel

Enable the built-in DevTools to inspect all signals in real-time. See current values, track changes, and debug your reactive state with a collapsible panel:

```tsx
import { enableDevTools, DevToolsPanel } from "rextive/devtools";

enableDevTools(); // Enable signal tracking

// Render the DevTools panel in your app
<DevToolsPanel position="bottom-right" />;
```

<img src="https://raw.githubusercontent.com/linq2js/rextive/main/packages/rextive/src/devtools/screenshots/devtools.png"/>

---

## 📦 Install

**npm / pnpm / yarn:**

```bash
npm install rextive
# or
pnpm add rextive
# or
yarn add rextive
```

**Deno (JSR):**

```ts
import { signal } from "jsr:@ging/rextive";
// or in deno.json
// "imports": { "rextive": "jsr:@ging/rextive" }
```

**Deno (npm compatibility):**

```ts
import { signal } from "npm:rextive";
```

---

## 🎯 Quick Comparison

| Instead of...                        | Use Rextive   |
| ------------------------------------ | ------------- |
| `useState` + `useMemo` + `useEffect` | Just `signal` |
| Redux + Redux Toolkit                | Just `signal` |
| React Query + SWR                    | Just `signal` |
| Zustand + Jotai + Recoil             | Just `signal` |

---

## 📚 Full Documentation

**[→ Read the complete documentation](https://github.com/linq2js/rextive)**

The full docs include:

- Complete API reference
- Advanced patterns (pagination, undo/redo, form validation)
- TypeScript deep-dive
- React integration guide
- Operators reference
- Best practices

---

## 🌟 At a Glance

| Feature              | Description                                      |
| -------------------- | ------------------------------------------------ |
| **`signal()`**       | Unified primitive for state, computed, and async |
| **`rx()`**           | React integration — makes components reactive    |
| **`.to()`**          | Transform values with chained selectors          |
| **`.pipe()`**        | Compose operators for complex data flows         |
| **`wait()`**         | Suspense-ready async handling                    |
| **`loadable()`**     | Manual loading/error/success states              |
| **`signal.trace()`** | Error debugging across signal chains             |
| **DevTools**         | Visual debugging panel                           |

---

<div align="center">

**Built with ❤️ for developers who value simplicity**

[GitHub](https://github.com/linq2js/rextive) · [npm](https://www.npmjs.com/package/rextive) · [Full Docs](https://github.com/linq2js/rextive/blob/main/README.md)

</div>
