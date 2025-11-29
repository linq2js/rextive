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

```tsx
import { signal, rx } from "rextive/react";

// 🎯 One concept for everything
const count = signal(0);
const doubled = count.to((x) => x * 2);
const tripled = signal({ count }, ({ deps }) => deps.count * 3);

// 🔥 Zero boilerplate React
const App = () => (
  <div>
    Count: {rx(count)} | Doubled: {rx(doubled)}
  </div>
);
```

---

## 🚀 Killer Features

### **Unified API** — One `signal()` for state, computed, and async

```tsx
const user = signal({ name: "Alice" }); // State
const greeting = user.to((u) => `Hello, ${u.name}!`); // Computed
const data = signal(async () => fetch("/api")); // Async
```

### **First-Class Async** — Promises just work

```tsx
const userData = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/users/${deps.userId}`, { signal: abortSignal });
  return res.json();
});

// Automatic loading states
{
  rx(() => {
    const state = loadable(userData());
    if (state.status === "loading") return <Spinner />;
    if (state.status === "error") return <Error error={state.error} />;
    return <User data={state.value} />;
  });
}
```

### **Powerful Operators** — RxJS-inspired pipelines

```tsx
import { debounce, distinct, filter, to } from "rextive/op";

const searchResults = searchTerm.pipe(
  debounce(300),
  filter((term) => term.length > 2),
  to((term) => fetchResults(term))
);
```

### **Error Tracing** — Debug errors across signal chains

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

```tsx
import { enableDevTools, DevToolsPanel } from "rextive/devtools";

enableDevTools();

// Renders a collapsible panel showing all signals, values, and events
<DevToolsPanel position="bottom-right" />;
```

---

## 📦 Install

```bash
npm install rextive
# or
pnpm add rextive
# or
yarn add rextive
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

**[→ Read the complete documentation](../../README.md)**

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

[GitHub](https://github.com/linq2js/rextive) · [npm](https://www.npmjs.com/package/rextive) · [Full Docs](../../README.md)

</div>
