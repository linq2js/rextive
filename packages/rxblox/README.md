# 🎯 rxblox

**Stop fighting React. Start building.**

Fine-grained reactive state management that actually makes sense. No boilerplate. No dependency arrays. No re-render hell.

[![npm version](https://img.shields.io/npm/v/rxblox.svg)](https://www.npmjs.com/package/rxblox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```bash
npm install rxblox
```

---

## The Problem You Know Too Well

You wanted to build a feature. Instead, you're debugging why `useEffect` ran 47 times.

```tsx
// 😫 Welcome to dependency array hell
useEffect(() => {
  fetchData(userId, filters, sortBy);
}, [userId, filters, sortBy, fetchData]); // 🔥 Infinite loop!

const fetchData = useCallback(
  async (userId, filters, sortBy) => {
    // ... actual logic buried here
  },
  [apiToken, config, retryCount] // 💀 Change ONE thing, break everything
);
```

**Sound familiar?**

- ⚠️ ESLint warnings about missing dependencies
- 🔥 Infinite re-render loops
- 🐛 Stale closures at 2 AM
- 📝 More `useCallback` than business logic
- 🧠 Mental overhead tracking what triggers what

**You're not writing features. You're babysitting React.**

---

## The rxblox Way

What if state management just... worked?

```tsx
// ✨ This is the ENTIRE code. No tricks.
import { signal, rx } from "rxblox";

const count = signal(0);

function Counter() {
  return (
    <div>
      <h1>{rx(count)}</h1>
      <button onClick={() => count.set(count() + 1)}>+1</button>
    </div>
  );
}
```

**That's it.** No `useState`. No `useCallback`. No dependency arrays. No re-renders.

### How It Works

**Traditional React:**

```tsx
function App() {
  const [count, setCount] = useState(0);

  // 🔄 ENTIRE function re-runs on every state change
  console.log("Re-rendered!"); // Logs constantly

  return <div>{count}</div>;
}
```

**rxblox:**

```tsx
const count = signal(0);

const App = blox(() => {
  // ✅ Runs ONCE on mount
  console.log("Mounted!"); // Logs once

  return <div>{rx(count)}</div>; // Only THIS updates
});
```

**The difference?** Your component body runs **once**. Only the specific UI parts that depend on state re-execute. That's fine-grained reactivity.

---

## Zero Dependency Arrays

Remember that data fetching nightmare?

```tsx
// ❌ Traditional React: Dependency array hell
const [userId, setUserId] = useState(1);
const [filters, setFilters] = useState({});

const fetchData = useCallback(async () => {
  const res = await fetch(
    `/api/data?user=${userId}&filters=${JSON.stringify(filters)}`
  );
  return res.json();
}, [userId, filters]); // Forget one? Bug. Add wrong one? Infinite loop.

useEffect(() => {
  fetchData();
}, [fetchData]);
```

**rxblox: Zero arrays. Automatic tracking.**

```tsx
// ✅ rxblox: Just write the logic
const userId = signal(1);
const filters = signal({ status: "active" });

const data = signal.async(async ({ track }) => {
  const { userId: id, filters: f } = track({ userId, filters });

  const res = await fetch(`/api/data?user=${id}&filters=${JSON.stringify(f)}`);
  return res.json();
});

// Change userId? Auto re-fetches. Previous request? Auto-canceled.
userId.set(2); // It just works. 🎉
```

No arrays. No `useCallback`. No bugs. **Just works.**

---

## Why Developers Love It

### 🎯 Fine-Grained Updates

Only the exact UI that depends on state updates. Everything else? Untouched.

```tsx
const count = signal(0);
const name = signal("Alice");

const App = blox(() => {
  return (
    <div>
      {/* Only updates when count changes */}
      <h1>{rx(count)}</h1>

      {/* Only updates when name changes */}
      <p>{rx(name)}</p>

      {/* Never re-renders */}
      <ExpensiveChart data={staticData} />
    </div>
  );
});
```

No `React.memo`. No `useMemo`. No optimization needed.

### 🚀 Less Code, More Features

**Before rxblox (Redux Toolkit):**

```tsx
// 35+ lines across 3 files 😰
// counterSlice.ts
const counterSlice = createSlice({
  name: "counter",
  initialState: { count: 0 },
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
  },
});

// store.ts
const store = configureStore({
  reducer: { counter: counterReducer },
});

// Component.tsx
function Counter() {
  const count = useSelector((state) => state.counter.count);
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(increment())}>{count}</button>;
}
```

**After rxblox:**

```tsx
// 6 lines. One file. Done. ✨
const count = signal(0);

function Counter() {
  return <button onClick={() => count.set(count() + 1)}>{rx(count)}</button>;
}
```

**6 lines vs 35.** Which would you rather maintain?

### ⚡ Built for TypeScript

Full type inference. No manual types needed.

```tsx
const user = signal({ name: "Alice", age: 30 });

const greeting = signal(() => {
  const u = user(); // Type: { name: string; age: number }
  return `Hello, ${u.name}!`; // ✅ Fully typed
});
```

### 🔄 Async Made Simple

Loading states, error handling, auto-cancellation—all built-in.

```tsx
const userId = signal(1);

const user = signal.async(async ({ track, abortSignal }) => {
  const id = track({ userId }).userId;

  const res = await fetch(`/api/users/${id}`, { signal: abortSignal });
  return res.json();
});

// In your component
{
  rx(() => {
    const u = user();

    if (u.status === "loading") return <Spinner />;
    if (u.status === "error") return <Error error={u.error} />;

    return <Profile user={u.value} />; // Type-safe!
  });
}
```

Loading? Error? Success? All handled. Previous requests? Auto-canceled.

---

## Real-World Example

Here's a real search component:

```tsx
import { signal, blox, rx, action } from "rxblox";

// State
const query = signal("");
const results = signal([]);

// Action with auto state tracking
const search = action.cancellable(async (signal, q: string) => {
  const res = await fetch(`/api/search?q=${q}`, { signal });
  return res.json();
});

// Component
const SearchBox = blox(() => {
  const handleSearch = async (e) => {
    const q = e.target.value;
    query.set(q);

    if (q.length < 2) return;

    const data = await search(q); // Previous search auto-canceled
    results.set(data);
  };

  return (
    <div>
      <input value={rx(query)} onChange={handleSearch} />

      {rx(() => {
        if (search.status === "loading") return <Spinner />;

        return (
          <ul>
            {results().map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
});
```

**Features you get for free:**

- ✅ Debounced search (only latest request completes)
- ✅ Auto-cancellation of previous requests
- ✅ Loading state tracking
- ✅ No memory leaks
- ✅ No dependency arrays
- ✅ Type-safe throughout

---

## What You Get

| Feature                  | Traditional React      | rxblox              |
| ------------------------ | ---------------------- | ------------------- |
| **Dependency arrays**    | ❌ Manual, error-prone | ✅ Automatic        |
| **Component re-renders** | ❌ Full component      | ✅ Only affected UI |
| **useCallback needed**   | ❌ Yes, everywhere     | ✅ Never            |
| **useMemo needed**       | ❌ For performance     | ✅ Built-in         |
| **Optimization**         | ❌ Manual memo()       | ✅ Automatic        |
| **Async state**          | ❌ Build yourself      | ✅ Built-in         |
| **Code amount**          | ❌ 3x more             | ✅ 3x less          |

---

## Quick Start

### Installation

```bash
npm install rxblox
# or
pnpm add rxblox
# or
yarn add rxblox
```

### Your First Component

```tsx
import { signal, blox, rx } from "rxblox";

// 1. Create a signal (global or local)
const count = signal(0);

// 2. Use it in a component
const Counter = blox(() => {
  // This runs ONCE on mount

  const increment = () => count.set(count() + 1);
  const decrement = () => count.set(count() - 1);

  return (
    <div>
      <button onClick={decrement}>-</button>
      {/* Only THIS updates when count changes */}
      <span>{rx(count)}</span>
      <button onClick={increment}>+</button>
    </div>
  );
});
```

**That's it!** You just built a counter with fine-grained reactivity.

### Form Example

```tsx
const name = signal("");
const email = signal("");

const MyForm = blox(() => {
  const isValid = signal(() => name().length > 0 && email().includes("@"));

  const handleSubmit = () => {
    console.log({ name: name(), email: email() });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={rx(name)} onChange={(e) => name.set(e.target.value)} />
      <input value={rx(email)} onChange={(e) => email.set(e.target.value)} />
      <button disabled={rx(() => !isValid())}>Submit</button>
    </form>
  );
});
```

**No** `useState`. **No** re-renders. **No** complexity.

---

## Learn More

📚 **[Full Documentation](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md)** - Complete guide with examples

### Essential Guides

- **[Core Concepts](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/core-concepts.md)** - Master the fundamentals in 10 minutes
- **[API Reference](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/api-reference.md)** - Every function, every option
- **[Patterns & Best Practices](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/patterns.md)** - Real-world patterns that work
- **[Comparisons](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/comparisons.md)** - See how we stack up

### Deep Dives

- **[Lifecycle & Cleanup](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/lifecycle-cleanup.md)** - Avoid memory leaks
- **[Performance Guide](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/performance.md)** - Make it blazing fast
- **[Architecture](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/ARCHITECTURE.md)** - How it works internally

---

## FAQ

**Q: Do I need to learn a new mental model?**  
A: If you've used signals in Solid.js or Preact, you already know it. If not, it's simpler than React hooks.

**Q: Can I use it with existing React code?**  
A: Yes! Drop it in anywhere. Use `signal()` for state, `rx()` for reactive UI. Mix with regular React components.

**Q: What about TypeScript?**  
A: First-class support. Full type inference. No manual types needed.

**Q: Is it production ready?**  
A: Yes. Used in production apps. Well-tested. MIT licensed.

**Q: What's the bundle size?**  
A: Lightweight. Smaller than most state management libraries.

**Q: Do I need to rewrite my app?**  
A: No. Start with one component. Gradually adopt where it helps.

---

## Contributing

Found a bug? Want a feature? PRs welcome!

**[Contributing Guide](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/contributing.md)** - How to help

---

## License

MIT © 2025

**Go build something amazing.** 🚀

---

<div align="center">

Made with ❤️ for developers who want to **code**, not **configure**

[⭐ Star on GitHub](https://github.com/linq2js/rxblox) • [📦 View on npm](https://www.npmjs.com/package/rxblox) • [📖 Read the Docs](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md)

</div>
