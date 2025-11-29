# Rextive ⚡

<div align="center">

### **The simplest way to manage reactive state**

One concept. Zero complexity. Pure power.

```bash
npm install rextive
```

[![npm version](https://img.shields.io/npm/v/rextive.svg)](https://www.npmjs.com/package/rextive)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/rextive)](https://bundlephobia.com/package/rextive)

</div>

---

## 🎯 Why Rextive?

Stop juggling multiple state management patterns. Rextive gives you **one powerful concept** that handles everything:

```tsx
// ❌ Traditional React - Multiple APIs to learn
const [count, setCount] = useState(0);
const doubled = useMemo(() => count * 2, [count]);
useEffect(() => console.log("Count changed:", count), [count]);

// ✅ Rextive - One unified API
import { signal } from "rextive";

const count = signal(0);
const doubled = count.to((x) => x * 2);
count.on((value) => console.log("Count changed:", value));
```

### 🚀 What Rextive Replaces

| Instead of...                        | Use Rextive   |
| ------------------------------------ | ------------- |
| `useState` + `useMemo` + `useEffect` | Just `signal` |
| Redux + Redux Toolkit                | Just `signal` |
| React Query + SWR                    | Just `signal` |
| Zustand + Jotai + Recoil             | Just `signal` |

**One API. Infinite possibilities.**

---

## 🚀 Quick Start

```tsx
import { signal, rx } from "rextive/react";

// Create reactive state
const count = signal(0);

// Create an action
const increment = () => count.set((x) => x + 1);

// Render reactively
const Counter = <h1 onClick={increment}>{rx(count)}</h1>;
```

**That's it!** No providers. No hooks. No boilerplate.

---

## 📚 Documentation

| Guide                                            | Description                               |
| ------------------------------------------------ | ----------------------------------------- |
| **[Getting Started](./docs/GETTING_STARTED.md)** | Quick start, counter examples, vanilla JS |
| **[Core Concepts](./docs/CORE_CONCEPTS.md)**     | Transform, equality, dependencies, async  |
| **[Examples](./docs/EXAMPLES.md)**               | 10 real-world examples with code          |
| **[Patterns](./docs/PATTERNS.md)**               | Advanced patterns & best practices        |
| **[Error Handling](./docs/ERROR_HANDLING.md)**   | Error handling & tracing                  |
| **[API Reference](./docs/API_REFERENCE.md)**     | Complete API documentation                |
| **[React Integration](./docs/REACT.md)**         | rx(), useScope(), provider()              |
| **[Operators](./docs/OPERATORS.md)**             | debounce, throttle, filter, etc.          |
| **[Integrations](./docs/INTEGRATIONS.md)**       | Immer, Cache, DevTools                    |
| **[Comparison](./docs/COMPARISON.md)**           | vs Zustand, React Query, Jotai, Redux     |
| **[Advanced](./docs/ADVANCED.md)**               | Service pattern, testing, debugging       |

---

## ✨ Key Features

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

## 📦 Packages

```
rextive           Core signals (works anywhere)
rextive/react     React bindings (rx, useScope, provider)
rextive/op        Operators (debounce, throttle, filter, etc.)
rextive/immer     Immer integration for immutable updates
rextive/cache     Data caching with strategies
rextive/plugins   Plugins (persistor, when)
rextive/devtools  DevTools panel
```

---

## 🔧 Installation

**npm / pnpm / yarn:**

```bash
npm install rextive
pnpm add rextive
yarn add rextive
```

**Deno (JSR):**

```ts
import { signal } from "jsr:@ging/rextive";
```

---

## 🔥 Feature Comparison

| Feature                   | Rextive                   | Others                |
| ------------------------- | ------------------------- | --------------------- |
| **Learning Curve**        | 🟢 One concept (`signal`) | 🟡 Multiple APIs      |
| **Lazy Tracking**         | 🟢 Automatic              | 🔴 Manual selectors   |
| **Async Support**         | 🟢 Built-in native        | 🟡 Separate libraries |
| **Request Cancellation**  | 🟢 Automatic              | 🔴 Manual setup       |
| **Framework Independent** | 🟢 Works everywhere       | 🔴 Often React-only   |
| **Bundle Size**           | 🟢 Tiny (~5KB)            | 🟡 Often larger       |

---

## 📄 License

MIT © [linq2js](https://github.com/linq2js)

---

## 🌟 Show Your Support

If Rextive helps you build better apps:

- ⭐ Star the repo
- 🐛 Report bugs
- 💡 Suggest features
- 📖 Improve docs

**[GitHub Repository](https://github.com/linq2js/rextive)**
