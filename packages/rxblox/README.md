# 🎯 rxblox

**Fine-grained reactive state management for React.**

Signals, computed values, and reactive components with automatic dependency tracking and zero boilerplate.

[![npm version](https://img.shields.io/npm/v/rxblox.svg)](https://www.npmjs.com/package/rxblox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why rxblox?

Traditional React re-renders entire components when state changes. You manage `useCallback`, `useMemo`, and dependency arrays just to optimize performance.

**rxblox provides fine-grained reactivity** - only the exact UI that depends on changed state updates. No manual dependency arrays. No Rules of Hooks limitations.

```tsx
// ❌ Traditional React - entire function re-executes
function Counter() {
  const [count, setCount] = useState(0);
  console.log("Component executed"); // Runs on EVERY change
  return <div>{count}</div>;
}
```

```tsx
// ✅ rxblox - definition runs once, only rx() updates
import { signal, blox, rx } from "rxblox";

const count = signal(0);

const Counter = blox(() => {
  console.log("Component mounted"); // Runs ONCE
  return (
    <div>
      {rx(count)} {/* Only this updates */}
    </div>
  );
});
```

### No More Dependency Arrays

```tsx
// ❌ React - Dependency array hell
useEffect(() => {
  fetchData(userId, filters, sortBy);
}, [userId, filters, sortBy, fetchData]); // 🔥 Infinite loops!

// ✅ rxblox - Automatic tracking
const data = signal.async(async ({ track }) => {
  const tracked = track({ userId, filters, sortBy });
  return fetchData(tracked.userId, tracked.filters, tracked.sortBy);
});

userId.set(2); // Just works. No arrays. No bugs.
```

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

### Basic Example

```tsx
import { signal, rx } from "rxblox";

// Create a signal
const count = signal(0);

// Use in any component
function Counter() {
  return (
    <div>
      <h1>{rx(count)}</h1>
      <button onClick={() => count.set(count() + 1)}>Increment</button>
    </div>
  );
}
```

### Reactive Components with `blox()`

```tsx
import { blox, signal, rx } from "rxblox";

const Counter = blox(() => {
  // Local state - definition phase runs once
  const count = signal(0);
  const doubled = signal(() => count() * 2);

  return (
    <div>
      {rx(() => (
        <div>
          Count: {count()} | Doubled: {doubled()}
        </div>
      ))}
      <button onClick={() => count.set(count() + 1)}>+1</button>
    </div>
  );
});
```

### Async Data Loading

```tsx
import { signal } from "rxblox";

const userId = signal(1);

// Automatic loading/success/error state management
const user = signal.async(async ({ track }) => {
  const { userId: id } = track({ userId });

  const response = await fetch(`/api/users/${id}`);
  return response.json();
});

// Changes automatically trigger re-fetch
userId.set(2);
```

---

## Key Features

- 🎯 **Fine-grained reactivity** - Only dependent UI updates, not entire components
- 🚀 **Zero boilerplate** - No actions, reducers, or store configuration
- 🔄 **Computed values** - Automatic dependency tracking and memoization
- 📊 **Async signals** - Built-in loading/success/error state management
- ⚡ **Performance** - Minimal re-renders and reconciliation
- 🎨 **Reactive components** - `blox()` components with once-per-mount execution
- 🔌 **Dependency injection** - Providers without Context re-render overhead
- 🧹 **Automatic cleanup** - Effects and subscriptions managed automatically
- 📦 **TypeScript first** - Full type inference and type safety
- 🪶 **Lightweight** - Small bundle (17.21 kB gzipped UMD)
- 🎪 **Flexible** - Use signals anywhere: conditionally, in loops, outside React

---

## Core Concepts

### Signals

Reactive state containers that track subscribers and notify on changes.

```tsx
import { signal } from "rxblox";

const count = signal(0); // Create
const value = count(); // Read
count.set(10); // Write
count.set((prev) => prev + 1); // Update with function
```

### Computed Signals

Automatically track dependencies and recompute when they change.

```tsx
const firstName = signal("John");
const lastName = signal("Doe");
const fullName = signal(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"
firstName.set("Jane");
console.log(fullName()); // "Jane Doe" - auto-recomputed
```

### Effects

Side effects with automatic dependency tracking.

```tsx
import { effect } from "rxblox";

effect(() => {
  console.log("Count:", count());
  return () => console.log("Cleanup");
});
```

### Reactive Expressions

Create fine-grained reactive UI with `rx()`.

```tsx
function App() {
  return (
    <div>
      {rx(() => (
        <span>Count: {count()}</span>
      ))}
    </div>
  );
}

// Shorthand for single signals
function App() {
  return <div>Count: {rx(count)}</div>;
}
```

---

## Comparison: Lines of Code

For a simple counter with increment:

| Solution          | Lines of Code | Files | Notes                   |
| ----------------- | ------------- | ----- | ----------------------- |
| **Redux Toolkit** | ~35 lines     | 3     | Slice, store, component |
| **Zustand**       | ~20 lines     | 1     | Store hook + component  |
| **Jotai**         | ~25 lines     | 1     | Atoms + Provider + hook |
| **rxblox**        | **~12 lines** | 1     | Signal + component      |

**rxblox wins on simplicity** with the least code and finest granularity! 🎯

---

## Documentation

📚 **[Full Documentation](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md)**

Comprehensive guides covering:

- Core Concepts & API Reference
- Reactive Components (`blox`)
- Async Signals & Data Loading
- Providers & Dependency Injection
- Actions & State Tracking
- Patterns & Best Practices
- Performance & Memory Optimization
- React Compatibility & SSR
- Migration Guides

---

## Examples

### Global State

```tsx
// store.ts
export const userStore = {
  user: signal<User | null>(null),
  isLoggedIn: signal(() => userStore.user() !== null),
  login: (user: User) => userStore.user.set(user),
  logout: () => userStore.user.set(null),
};

// Component.tsx
const Profile = blox(() => {
  return rx(() => {
    const user = userStore.user();
    return user ? <div>Hello, {user.name}</div> : <div>Please log in</div>;
  });
});
```

### Form State

```tsx
const LoginForm = blox(() => {
  const email = signal("");
  const password = signal("");
  const isValid = signal(() => email().includes("@") && password().length >= 6);

  const handleSubmit = () => {
    if (!isValid()) return;
    console.log({ email: email(), password: password() });
  };

  return rx(() => (
    <form onSubmit={handleSubmit}>
      <input value={email()} onChange={(e) => email.set(e.target.value)} />
      <input
        type="password"
        value={password()}
        onChange={(e) => password.set(e.target.value)}
      />
      <button disabled={!isValid()}>Login</button>
    </form>
  ));
});
```

### Data Fetching with Dependencies

```tsx
const UserPosts = blox<{ userId: number }>((props) => {
  const posts = signal.async(async ({ track }) => {
    const userId = props.userId;
    const response = await fetch(`/api/users/${userId}/posts`);
    return response.json();
  });

  return rx(() => {
    const { status, value } = posts();

    if (status === "loading") return <div>Loading...</div>;
    if (status === "error") return <div>Error loading posts</div>;

    return (
      <ul>
        {value.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    );
  });
});
```

---

## Architecture

Want to understand how rxblox works under the hood?

📐 **[Architecture Documentation](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/ARCHITECTURE.md)**

Learn about:

- Signal-based reactivity system
- Dispatcher and dependency tracking
- Component lifecycle management
- Performance optimization strategies
- Design decisions and trade-offs

---

## Contributing

Contributions are welcome! See our **[Contributing Guide](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md#contributing)** for details.

### Development

```bash
pnpm install
pnpm test
pnpm build
```

---

## License

MIT © 2025

---

## Links

- 📦 [NPM Package](https://www.npmjs.com/package/rxblox)
- 📚 [Full Documentation](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/README.md)
- 📐 [Architecture](https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/ARCHITECTURE.md)
- 🐛 [Issue Tracker](https://github.com/linq2js/rxblox/issues)
- 💬 [Discussions](https://github.com/linq2js/rxblox/discussions)

---

**Made with ❤️ for the React community**
