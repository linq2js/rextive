# 🎯 rxblox

**Fine-grained reactive state management for React.**  
Signals, computed values, and reactive components with zero boilerplate.

[![npm version](https://img.shields.io/npm/v/rxblox.svg)](https://www.npmjs.com/package/rxblox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why rxblox?

**React state management needs better tools.**

Traditional React re-renders entire component functions when state changes. You spend significant time managing `useCallback`, `useMemo`, and `useEffect` dependency arrays just to avoid unnecessary work. Component optimization often becomes a maintenance burden.

**rxblox** provides **fine-grained reactivity** - only the exact UI subtrees that depend on changed state re-execute. Component definition phases run once per mount. Reactive expressions (`rx()`) update independently. No manual dependency arrays. No Rules of Hooks limitations.

```tsx
// ❌ Traditional React - entire function body re-executes
function Counter() {
  const [count, setCount] = useState(0);
  console.log("Component function executed"); // Runs on EVERY state change
  return <div>{count}</div>;
}
```

```tsx
// ✅ rxblox - definition runs once, only rx() subtrees re-execute
import { signal, rx } from "rxblox";

const count = signal(0);

const Counter = blox(() => {
  console.log("Component mounted"); // Runs ONCE

  return (
    <div>
      {rx(count)} {/* only this part will update */}
      <HeavyComponent />
    </div>
  ); // Only this subtree re-executes on signal changes
});
```

### Key Benefits

- 🎯 **Fine-grained reactivity** - Subtree updates instead of full component re-execution
- 🚀 **Minimal boilerplate** - No actions, reducers, or centralized store configuration
- 🔄 **Computed values** - Automatic dependency tracking and memoization
- ⚡ **Performance optimizations** - Reduced reconciliation overhead for signal-driven updates
- 🎨 **Reactive components** - `blox()` components with definition-phase-once semantics
- 🔌 **Dependency injection** - Provider pattern with fine-grained subscriptions
- 🧹 **Automatic cleanup** - `blox` lifecycle manages subscriptions and effects
- 📦 **TypeScript first** - Full type inference and type safety
- 🪶 **Lightweight** - Small bundle footprint
- 🎪 **Flexible signal access** - Call signals conditionally, in loops, outside React render
- 🔀 **Async signals** - Built-in async state management with loading/success/error tracking
- 📊 **Loadable states** - Discriminated union types for async operation states

---

## 🔥 The Dependency Array Problem

The real pain? **Dependency arrays.**

Every React developer knows this hell:

```tsx
// The dependency array hell we all know too well
useEffect(() => {
  fetchData(userId, filters, sortBy);
}, [userId, filters, sortBy]); // ⚠️ ESLint warning: missing 'fetchData'

// Add fetchData, now it's infinite loop!
useEffect(() => {
  fetchData(userId, filters, sortBy);
}, [userId, filters, sortBy, fetchData]); // 🔥 Infinite re-renders!

// Wrap in useCallback... now fetchData needs dependencies
const fetchData = useCallback(
  (userId, filters, sortBy) => {
    // ...
  },
  [
    /* wait, what goes here? */
  ]
);

// Hours later... you have this monstrosity:
const fetchData = useCallback(
  (userId, filters, sortBy) => {
    // ...
  },
  [apiToken, config, retryCount]
); // And if ONE changes, everything breaks

useEffect(() => {
  fetchData(userId, filters, sortBy);
}, [userId, filters, sortBy, fetchData]);
```

**Every. Single. Time.**

You're not writing business logic. You're babysitting dependency arrays. You're debugging why `useEffect` fired 47 times. You're hunting down stale closures at 2 AM because you forgot to add one variable to a dependency array three functions deep.

State management shouldn't require a PhD in React optimization. You shouldn't need to memorize the Rules of Hooks. You shouldn't need a 10-line dependency chain just to fetch data. Your UI should just... _react_.

### The rxblox Solution

**Automatic dependency tracking. Zero arrays.**

Here's that same data fetching with rxblox:

```tsx
// No dependency arrays. No useCallback. No infinite loops. Just... works.
const userId = signal(1);
const filters = signal({ status: "active" });
const sortBy = signal("date");

const data = signal.async(async ({ track }) => {
  // Automatic dependency tracking - no arrays needed!
  const tracked = track({ userId, filters, sortBy });

  const response = await fetch(
    `/api/data?user=${tracked.userId}&filters=${JSON.stringify(
      tracked.filters
    )}&sort=${tracked.sortBy}`
  );
  return response.json();
});

// Changes automatically trigger re-fetch. Previous requests auto-canceled.
userId.set(2); // Just works. No dependency arrays. No stale closures. No bugs.
```

**What you get:**

- ❌ No `useCallback` - functions are stable by default
- ❌ No `useMemo` - computed signals handle it automatically
- ❌ No dependency arrays - automatic tracking "just works"
- ❌ Reduced function re-execution - only reactive expressions update
- ❌ No stale closures - signals always have the current value
- ❌ No Rules of Hooks - call signals anywhere, anytime

**Just reactive state that works the way you think.**

### Why This Matters

This isn't just about performance. It's about **developer experience**.

Every millisecond counts. Every re-render matters. Every line of boilerplate is time stolen from building features. With rxblox, you write what you mean and it just works.

- **Components run once** - Reduced function re-execution, no optimization needed
- **Dependencies auto-track** - No arrays, no stale closures, no bugs
- **Code is simple** - Write business logic, not React plumbing

Fine-grained reactivity isn't just a feature—it's the future. Solid.js proved it works. Preact Signals brought it to Preact. **rxblox brings the full power of fine-grained reactivity to React**, with first-class TypeScript support and zero dependencies.

Go home on time. Build features, not workarounds.

---

## Installation

```bash
npm install rxblox
# or
pnpm add rxblox
# or
yarn add rxblox
```

## Quick Start

```tsx
import { signal, rx } from "rxblox";

const count = signal(0);

function Counter() {
  return (
    <div>
      {/* Only this reactive expression updates when count changes */}
      <h1>Count: {rx(count)}</h1>

      <button onClick={() => count.set(count() + 1)}>Increment</button>
    </div>
  );
}
```

---

## Documentation

📚 **[Full Documentation](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md)** - Complete guide with examples and best practices

### Quick Links

- **[Core Concepts](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/core-concepts.md)** - Signals, computed values, effects, reactive components, providers, async signals, actions
- **[API Reference](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/api-reference.md)** - Complete API documentation
- **[Patterns & Best Practices](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/patterns.md)** - Common patterns, organizing signals, composable logic
- **[Comparisons](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/comparisons.md)** - How rxblox compares to Redux, Zustand, Jotai, and others

### Additional Resources

- **[Lifecycle & Cleanup](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/lifecycle-cleanup.md)** - Memory management and cleanup
- **[Performance & Memory](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/performance.md)** - Optimization guide
- **[Architecture](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/ARCHITECTURE.md)** - Internal architecture and design decisions
- **[Contributing](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/contributing.md)** - Guidelines for contributing to rxblox

---

## License

MIT © 2025

Made with ❤️ for the React community
