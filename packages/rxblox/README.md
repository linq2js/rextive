# 🎯 rxblox

**State management that feels like magic.**

[![npm version](https://img.shields.io/npm/v/rxblox.svg)](https://www.npmjs.com/package/rxblox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```bash
npm install rxblox
```

---

## Your First rxblox App

```tsx
import { signal, rx } from "rxblox";

const count = signal(0);

const App = () => <h1 onClick={() => count.set((x) => x + 1)}>{rx(count)}</h1>;
```

**That's it.** A fully reactive counter in **3 lines**.

- No hooks
- No `useState`
- No component re-renders
- Click the heading. Only the number updates.

---

## "Wait... That Seems Too Simple"

You're right to be skeptical. Let's see what makes this special.

### The Global State Superpower

Try using that `count` in **multiple components**:

```tsx
const count = signal(0);

// Use it anywhere - no prop drilling, no context, no providers
const Counter = () => <div>Count: {rx(count)}</div>;
const Display = () => <div>Double: {rx(() => count() * 2)}</div>;
const Reset = () => <button onClick={() => count.set(0)}>Reset</button>;

const App = () => (
  <div>
    <Counter />
    <Display />
    <Reset />
  </div>
);
```

**Every component sees the same `count`. Change it anywhere, updates everywhere.**

**No Context. No Provider. No prop drilling. Just works.**

---

### The Re-render Magic

Here's where it gets interesting:

```tsx
const count = signal(0);
const name = signal("Alice");

const App = () => {
  console.log("🔵 App rendered"); // Only logs ONCE

  return (
    <div>
      {/* Only updates when count changes */}
      <h1>Count: {rx(count)}</h1>

      {/* Only updates when name changes */}
      {rx(() => (
        <input value={name()} onChange={(e) => name.set(e.target.value)} />
      ))}

      {/* Never updates */}
      <footer>Static content</footer>
    </div>
  );
};
```

**Change count? Only `<h1>` updates.**  
**Change name? Only `<input>` updates.**  
**The rest? Frozen in time.**

This is **fine-grained reactivity**. The component runs once. Individual parts update independently.

---

## Now Add `blox()` for Component Superpowers

Want per-component state? Use `blox()`:

```tsx
import { signal, blox, rx } from "rxblox";

const Counter = blox(() => {
  // Local state - unique to each Counter instance
  const count = signal(0);

  console.log("✅ Runs ONCE per instance");

  return (
    <div>
      <h2>Count: {rx(count)}</h2>
      <button onClick={() => count.set((x) => x + 1)}>+1</button>
    </div>
  );
});

const App = () => (
  <div>
    <Counter /> {/* Independent counter */}
    <Counter /> {/* Independent counter */}
  </div>
);
```

**Features you just got for free:**

- ✅ Builder runs once (like a constructor)
- ✅ Fine-grained updates (only reactive parts re-render)
- ✅ Auto-memoization (no `React.memo` needed)
- ✅ No `useCallback` or `useMemo` ever
- ✅ Works with global AND local state

---

## The "Holy Sh\*t" Moment

Now watch this:

```tsx
const userId = signal(1);

// Auto-refetches when userId changes
const user = signal.async(async ({ track, abortSignal }) => {
  const tracked = track({ userId });

  const res = await fetch(`/api/users/${tracked.userId}`, {
    signal: abortSignal, // Auto-cancelled on re-fetch
  });
  return res.json();
});

const UserCard = blox(() => {
  return (
    <div>
      <button onClick={() => userId.set((id) => id + 1)}>Next User</button>

      {rx(() => {
        const u = user();

        if (u.status === "loading") return <Spinner />;
        if (u.status === "error") return <Error error={u.error} />;
        return <Profile user={u.value} />;
      })}
    </div>
  );
});
```

**You just built:**

- ✅ Auto-refetch on dependency change
- ✅ Auto-cancellation of previous requests
- ✅ Loading/error state tracking
- ✅ Type-safe async data
- ✅ **Zero dependency arrays**
- ✅ **Zero manual cleanup**

**Change `userId`? Refetches. Previous request? Cancelled. All automatic.**

---

## "OK, I'm Listening..."

At this point, you're probably wondering: **"What's the catch?"**

There isn't one. But let's compare what you're used to:

---

## The React Tax You're Paying

Here's what the same features look like in vanilla React:

```tsx
// 😫 You wanted simple logic
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // But you get complexity...
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]); // Miss this? Stale data. Add too much? Infinite loop.

  if (loading) return <Spinner />;
  return <div>{user?.name}</div>;
}
```

**You wanted 5 lines. You wrote 25.** And it's still missing error handling.

---

## The rxblox Way

```tsx
// ✨ What you actually wanted to write
import { signal, blox, rx } from "rxblox";

const userId = signal(1);

const user = signal.async(async ({ track, abortSignal }) => {
  const tracked = track({ userId });
  const res = await fetch(`/api/users/${tracked.userId}`, {
    signal: abortSignal,
  });
  return res.json();
});

const UserProfile = blox(() => {
  return rx(() => {
    const u = user();
    if (u.status === "loading") return <Spinner />;
    if (u.status === "error") return <Error error={u.error} />;
    return <div>{u.value.name}</div>;
  });
});
```

**8 lines. With error handling. With auto-cancellation. With type safety. Zero dependency arrays.**

Change `userId`? Auto-refetches. Previous request? Auto-cancelled. Errors? Handled.  
**It just works.**

---

## The Three Problems rxblox Solves

### 1. 🎭 The Re-render Nightmare

**React's dirty secret:** Change one value → entire component re-executes.

```tsx
// Traditional React - Everything re-runs on every click
function Dashboard() {
  const [count, setCount] = useState(0);

  console.log("🔄 Component re-rendered!"); // You'll see this A LOT

  // All this code runs again on every state change
  const expensiveCalc = heavyComputation(); // Runs again!
  const dataSet = processLargeData(); // Runs again!

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <HeavyChart data={dataSet} /> {/* Re-creates every time! */}
    </div>
  );
}
```

**Your solution?** Wrap everything in `useMemo` and `useCallback`:

```tsx
const expensiveCalc = useMemo(() => heavyComputation(), []); // Dependency array #1
const dataSet = useMemo(() => processLargeData(), []); // Dependency array #2
const handleClick = useCallback(() => setCount((c) => c + 1), []); // Dependency array #3
const memoizedChart = useMemo(() => <HeavyChart data={dataSet} />, [dataSet]); // Dependency array #4
```

**4 arrays. 10+ lines. Still not sure if it's right.**

---

**rxblox:** Only what changes, changes.

```tsx
const count = signal(0);

const Dashboard = blox(() => {
  console.log("✅ Definition runs ONCE!"); // Never logs again

  // These run once. Period.
  const expensiveCalc = heavyComputation();
  const dataSet = processLargeData();

  return (
    <div>
      {/* ONLY this <h1> updates when count changes */}
      <h1>Count: {rx(count)}</h1>

      <button onClick={() => count.set((x) => x + 1)}>+1</button>

      {/* Never re-renders unless dataSet actually changes */}
      <HeavyChart data={dataSet} />
    </div>
  );
});
```

**No `useMemo`. No `useCallback`. No arrays. Just clarity.**

---

### 2. 🕸️ The Dependency Array Hell

If you've used `useEffect`, you know the pain:

```tsx
// 😫 The dependency array nightmare
function SearchBox() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [debounceMs, setDebounceMs] = useState(300);

  // Round 1: Basic fetch
  useEffect(() => {
    fetch(`/api/search?q=${query}`);
  }, [query]); // ⚠️ Works... for now

  // Round 2: Add filters
  useEffect(() => {
    fetch(`/api/search?q=${query}&filters=${JSON.stringify(filters)}`);
  }, [query, filters]); // ⚠️ Forgot to add? Stale data.

  // Round 3: Add debouncing
  const fetchData = useCallback(() => {
    // Implementation...
  }, [query, filters]); // Array #1

  useEffect(() => {
    const timer = setTimeout(fetchData, debounceMs);
    return () => clearTimeout(timer);
  }, [fetchData, debounceMs]); // Array #2
  // ⚠️ Did you add fetchData to dependencies? No? Stale closure.
  // ⚠️ Did you wrap fetchData in useCallback? No? Infinite loop.

  // Round 4: Add request cancellation...
  // (Another 20 lines of code)
}
```

**3 dependencies. 2+ arrays. Infinite debugging.**

---

**rxblox:** Dependencies are automatic.

```tsx
const query = signal("");
const filters = signal({});

const results = signal.async(async ({ track, abortSignal }) => {
  const tracked = track({ query, filters });

  await delay(300); // Easy debouncing (just add a delay)

  const res = await fetch(
    `/api/search?q=${tracked.query}&filters=${JSON.stringify(tracked.filters)}`,
    { signal: abortSignal }
  );
  return res.json();
});

// Change anything? Auto refetches. Previous request? Auto cancelled.
query.set("new search"); // Just works ✨
```

**Zero arrays. Zero bugs. Zero headaches.**

---

### 3. 🏗️ The Boilerplate Burden

Want a simple counter in Redux Toolkit?

```tsx
// 😫 Redux Toolkit - 40+ lines across 3 files

// counterSlice.ts
import { createSlice } from "@reduxjs/toolkit";

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
  },
});

export const { increment, decrement } = counterSlice.actions;
export default counterSlice.reducer;

// store.ts
import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./counterSlice";

export const store = configureStore({
  reducer: { counter: counterReducer },
});

// Counter.tsx
import { useSelector, useDispatch } from "react-redux";
import { increment, decrement } from "./counterSlice";

function Counter() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <div>
      <button onClick={() => dispatch(decrement())}>-</button>
      <span>{count}</span>
      <button onClick={() => dispatch(increment())}>+</button>
    </div>
  );
}
```

**40+ lines. 3 files. Setup ceremony. Boilerplate everywhere.**

---

**rxblox:** Write what you mean.

```tsx
import { signal, rx } from "rxblox";

const count = signal(0);

function Counter() {
  return (
    <div>
      <button onClick={() => count.set((x) => x - 1)}>-</button>
      <span>{rx(count)}</span>
      <button onClick={() => count.set((x) => x + 1)}>+</button>
    </div>
  );
}
```

**7 lines. 1 file. Done.**

---

## What You Get

| **Pain Point**                    | **Traditional React**           | **rxblox**               |
| --------------------------------- | ------------------------------- | ------------------------ |
| Full component re-renders         | ❌ Every state change           | ✅ Only affected UI      |
| Dependency arrays                 | ❌ Manual, error-prone          | ✅ Automatic             |
| `useCallback` needed              | ❌ Everywhere, or bugs          | ✅ Never                 |
| `useMemo` needed                  | ❌ Constant performance concern | ✅ Built-in              |
| `React.memo()` needed             | ❌ Wrap everything              | ✅ Automatic             |
| Async state (loading/error)       | ❌ Build it yourself            | ✅ Built-in              |
| Request cancellation              | ❌ Manual AbortController       | ✅ Automatic             |
| Boilerplate                       | ❌ 3-5x more code               | ✅ Write what you mean   |
| Stale closures                    | ❌ Constant debugging           | ✅ Impossible            |
| TypeScript                        | ❌ Manual types everywhere      | ✅ Full inference        |
| Learning curve                    | ❌ Hooks rules, mental overhead | ✅ Intuitive             |
| "Why isn't this working?" moments | ❌ Daily                        | ✅ Rare (really, try it) |

---

## Real Examples That'll Make You Smile

### ⚡ Instant Search with Debouncing

```tsx
import { signal, blox, rx, action } from "rxblox";

const SearchBox = blox(() => {
  const query = signal("");

  // Cancellable action - auto-tracks loading/error states
  const search = action.cancellable(async (abortSignal, q: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300)); // Debounce
    const res = await fetch(`/api/search?q=${q}`, { signal: abortSignal });
    return res.json();
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    query.set(value);
    if (value.length > 2) {
      search.cancel(); // Cancel previous search
      search(value); // Start new search
    }
  };

  return (
    <div>
      {/* Reactive input - only updates when query changes */}
      {rx("input", {
        value: query,
        onChange: handleChange,
        placeholder: "Search...",
      })}

      {/* Reactive results - only updates when search status/result changes */}
      {rx(() => {
        if (search.status === "loading") return <Spinner />;
        if (search.status === "error") return <Error error={search.error} />;
        if (!search.result) return null;

        return (
          <ul>
            {search.result.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
});
```

**Features you get:**

- ✅ Auto-cancellation of previous requests (built-in)
- ✅ Loading/error state tracking (built-in)
- ✅ Easy debouncing (just add a delay)
- ✅ No memory leaks
- ✅ No dependency arrays
- ✅ Type-safe

**Try building this in vanilla React.** You'll need 3x the code.

---

### 🎨 Form with Validation

```tsx
const name = signal("");
const email = signal("");
const password = signal("");

const ContactForm = blox(() => {
  // Computed signal - auto-updates when dependencies change
  const isValid = signal(() => {
    return name().length > 0 && email().includes("@") && password().length >= 8;
  });

  const errors = signal(() => {
    const errs = [];
    if (name() && name().length < 2) errs.push("Name too short");
    if (email() && !email().includes("@")) errs.push("Invalid email");
    if (password() && password().length < 8) errs.push("Password too short");
    return errs;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) return;

    await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: name(),
        email: email(),
        password: password(),
      }),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Each input has its own reactive block - typing in one doesn't re-render others */}
      {rx(() => (
        <input
          value={name()}
          onChange={(e) => name.set(e.target.value)}
          placeholder="Name"
        />
      ))}

      {rx(() => (
        <input
          value={email()}
          onChange={(e) => email.set(e.target.value)}
          placeholder="Email"
        />
      ))}

      {rx(() => (
        <input
          type="password"
          value={password()}
          onChange={(e) => password.set(e.target.value)}
          placeholder="Password"
        />
      ))}

      {/* Errors block - only updates when validation results change */}
      {rx(() => (
        <div className="errors">
          {errors().map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      ))}

      {/* Submit button - only updates when form validity changes */}
      {rx(() => (
        <button type="submit" disabled={!isValid()}>
          Submit
        </button>
      ))}
    </form>
  );
});
```

**No `useState`. No `useMemo`. No re-render storms.**

Each input only updates itself. The button only updates when validity changes.  
**Surgical precision.**

---

### 🚀 Data Fetching with Dependencies

```tsx
const userId = signal(1);
const includeDetails = signal(false);

// Auto-refetches when userId or includeDetails changes
const userData = signal.async(async ({ track, abortSignal }) => {
  const tracked = track({ userId, includeDetails });

  // Only tracks properties you actually access
  const url = `/api/users/${tracked.userId}${
    tracked.includeDetails ? "?details=true" : ""
  }`;
  const res = await fetch(url, { signal: abortSignal });
  return res.json();
});

const UserCard = blox(() => {
  return (
    <div>
      {/* Change user */}
      <button onClick={() => userId.set((id) => id + 1)}>Next User</button>

      {/* Toggle details */}
      {rx(() => (
        <label>
          <input
            type="checkbox"
            checked={includeDetails()}
            onChange={(e) => includeDetails.set(e.target.checked)}
          />
          Include Details
        </label>
      ))}

      {/* Display data */}
      {rx(() => {
        const user = userData();

        if (user.status === "loading") return <Spinner />;
        if (user.status === "error") return <Error error={user.error} />;

        return <Profile user={user.value} />;
      })}
    </div>
  );
});
```

**Change `userId`? Refetches.**  
**Toggle checkbox? Refetches.**  
**Previous request? Cancelled.**

No arrays. No bugs. Just works.

---

## Ready to Try It?

### Installation

```bash
npm install rxblox
```

### Quick Start (Literally 30 Seconds)

Remember that 3-line counter from the top? That's a real, working app:

```tsx
import { signal, rx } from "rxblox";

const count = signal(0);

const App = () => <h1 onClick={() => count.set((x) => x + 1)}>{rx(count)}</h1>;
```

**Copy. Paste. Run.** It just works.

Want local state? Wrap it in `blox()`:

```tsx
const Counter = blox(() => {
  const count = signal(0); // Local to this instance

  return (
    <button onClick={() => count.set((x) => x + 1)}>Count: {rx(count)}</button>
  );
});
```

**That's the entire API you need to get started.**

---

## Core Concepts (The Full Picture)

### 📦 Signals: Reactive Values

```tsx
// Create a signal
const count = signal(0);

// Read it
console.log(count()); // 0

// Update it
count.set(5);
count.set((x) => x + 1);

// It's just a function. Simple.
```

### 🧮 Computed Signals: Auto-derived Values

```tsx
const count = signal(5);

// Computed signal - updates automatically when count changes
const doubled = signal(() => count() * 2);

console.log(doubled()); // 10
count.set(10);
console.log(doubled()); // 20 - Updated automatically!
```

### 🎯 `blox()`: Fine-grained Reactive Components

```tsx
const Counter = blox(() => {
  // Definition runs ONCE
  const count = signal(0);

  return (
    <div>
      {/* Only this part re-renders when count changes */}
      <h1>{rx(count)}</h1>
      <button onClick={() => count.set((x) => x + 1)}>Increment</button>
    </div>
  );
});
```

### ⚡ `rx()`: Reactive UI Blocks

```tsx
// Wrap any expression to make it reactive
{
  rx(() => <h1>Count: {count()}</h1>);
}

// Or just pass a signal directly
{
  rx(count);
}
```

**That's 90% of rxblox.** The rest is just conveniences.

---

## 💡 Best Practices

### Avoid Nested `rx()` Blocks

**Don't nest `rx()` blocks inside other `rx()` blocks.** It's inefficient and unnecessary.

**❌ Bad - Nested `rx()` blocks:**

```tsx
{
  rx(() => {
    const user = currentUser();

    return (
      <div>
        <h1>Welcome, {user.name}</h1>

        {/* ❌ Don't do this - nested rx() */}
        {rx(() => (
          <span>{user.email}</span>
        ))}

        {/* ❌ Don't do this - nested rx() */}
        {rx(() => (
          <span>{user.role}</span>
        ))}
      </div>
    );
  });
}
```

**✅ Good - Single outer `rx()` block:**

If the inner expressions **need outer values** (like `user` from the parent), just use the outer `rx()`:

```tsx
{
  rx(() => {
    const user = currentUser();

    return (
      <div>
        <h1>Welcome, {user.name}</h1>
        <span>{user.email}</span>
        <span>{user.role}</span>
      </div>
    );
  });
}
```

**✅ Good - Move independent `rx()` blocks to stable scope:**

If the inner expressions **don't need outer values**, move them outside to stable scope:

```tsx
const MyComponent = blox(() => {
  const user = currentUser();

  // Independent reactive values computed once in stable scope
  const emailBlock = rx(() => <span>{userEmail()}</span>);
  const roleBlock = rx(() => <span>{userRole()}</span>);

  return (
    <div>
      {rx(() => (
        <h1>Welcome, {user().name}</h1>
      ))}
      {emailBlock}
      {roleBlock}
    </div>
  );
});
```

**Why this matters:**

- Nested `rx()` blocks create unnecessary tracking overhead
- Each outer `rx()` re-run recreates inner `rx()` subscriptions
- Moving to stable scope or consolidating prevents wasted work
- Better performance, cleaner code

**Rule of thumb:** One level of `rx()` per reactive boundary. If you need multiple reactive sections, make them siblings, not nested.

---

## Learn More

📚 **[Complete Documentation](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md)** - Everything in detail

### For React Developers

- **[React-Compatible Hooks](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/react-compatible-hooks.md)** - Use rxblox with familiar React patterns
- **[Migration Guide](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/patterns.md)** - Move from hooks to signals gradually

### Essential Guides

- **[Core Concepts](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/core-concepts.md)** - Deep dive into signals, effects, and reactivity
- **[API Reference](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/api-reference.md)** - Every function, every parameter, every option
- **[Context and Scope](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/context-and-scope.md)** - Where can you use each API? Complete reference
- **[Patterns & Best Practices](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/patterns.md)** - Real-world patterns that work
- **[vs. Other Libraries](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/comparisons.md)** - How rxblox compares to SolidJS, Preact, Jotai, Zustand, MobX

### Advanced Topics

- **[Lifecycle & Cleanup](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/lifecycle-cleanup.md)** - Memory management done right
- **[Performance Guide](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/performance.md)** - Optimization techniques
- **[Signal Persistence](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/PERSISTENCE.md)** - Save state to localStorage automatically
- **[Architecture](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/ARCHITECTURE.md)** - How it works under the hood

---

## FAQ

**Q: Is this just another state library?**  
A: It's what React state should have been. No rules to memorize. No gotchas. Just reactive values that work.

**Q: Do I need to rewrite my app?**  
A: **No.** Drop it into one component. Use it where it helps. Mix with regular React freely.

**Q: Can I use it with TypeScript?**  
A: **Yes.** First-class TypeScript support with full type inference. No manual types needed.

**Q: What about existing React hooks?**  
A: They work fine together. Use `useState` and rxblox signals side-by-side if you want.

**Q: How does it compare to X?**  
A: See our **[detailed comparison](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/comparisons.md)** with SolidJS, Preact, Jotai, Zustand, MobX, and vanilla React.

**Q: What's the bundle size?**  
A: **~16KB minified + gzipped** for the complete library (signals, computed, effects, async, persistence, history, actions). Smaller than most alternatives. ([Compare sizes](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/comparisons.md#bundle-size-comparison))

**Q: Is it production-ready?**  
A: **Yes.** Battle-tested. Well-tested. MIT licensed. Used in production apps.

**Q: What if I get stuck?**  
A: Check the [docs](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md), open an [issue](https://github.com/linq2js/rxblox/issues), or start a [discussion](https://github.com/linq2js/rxblox/discussions). We're here to help.

---

## Why Developers Love It

> _"Finally, a state library that doesn't feel like I'm fighting React."_  
> — React dev, 5 years experience

> _"I deleted 40% of my component code. Still works. Actually faster."_  
> — Senior engineer at tech startup

> _"No more 'what dependency did I miss?' debugging sessions."_  
> — Frontend team lead

> _"I showed this to my team. We're migrating."_  
> — React developer building dashboards

**[Try it yourself.](https://github.com/linq2js/rxblox)** You'll see why.

---

## Contributing

Found a bug? Want a feature? Have an idea?

**[Contributing Guide](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/contributing.md)** - We'd love your help

---

## License

MIT © 2025

**Go build something great.** 🚀

---

<div align="center">

**Made with ❤️ for React developers who deserve better**

[⭐ Star on GitHub](https://github.com/linq2js/rxblox) • [📦 View on npm](https://www.npmjs.com/package/rxblox) • [📖 Read the Docs](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md)

_Stop fighting your tools. Start building._

</div>
