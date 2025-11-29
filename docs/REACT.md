# React Integration

Deep dive into Rextive's React integration.

---

## `rx()` - Reactive Rendering

The core function for reactive rendering in React.

### Overload 1: Single Signal

```tsx
const count = signal(42);
{rx(count)} // Renders: 42
```

### Overload 2: Signal with Selector

```tsx
const user = signal({ name: "Alice", age: 30 });

// Property access
{rx(user, "name")} // Renders: "Alice"

// Selector function
{rx(user, (u) => u.age + 5)} // Renders: 35
```

### Overload 3: Reactive Function

```tsx
{rx(() => <div>Count: {count()}</div>)}
```

Auto-tracks any signals accessed inside the function.

### Overload 4: Component with Reactive Props

```tsx
{rx(Component, { prop1: signal1, prop2: "static" })}
{rx("div", { children: count, className: "counter" })}
```

### ⚠️ Important Rules

**Never use `rx()` directly in attributes:**

```tsx
// ❌ WRONG - Won't be reactive
<input value={rx(signal)} />

// ✅ CORRECT - Use one of these
{rx(() => <input value={signal()} />)}
{rx("input", { value: signal })}
```

### Async Signal Handling

**With Suspense (`wait()`):**

```tsx
{rx(() => {
  const data = wait(userData()); // Throws for Suspense
  return <div>{data.name}</div>;
})}
```

**With manual loading states (`loadable()`):**

```tsx
{rx(() => {
  const state = loadable(userData());
  if (state.loading) return <Spinner />;
  if (state.error) return <Error error={state.error} />;
  return <div>{state.value.name}</div>;
})}
```

---

## `rx.use()` - Reactive Hook

Low-level hook for automatic signal tracking:

```tsx
function Component() {
  const value = rx.use(() => {
    const userData = wait(user());
    const postList = wait(posts());
    return { userData, postList };
  });

  return <div>{value.userData.name}</div>;
}
```

**⚠️ Signal calls OUTSIDE `rx.use()` or `rx()` are NOT tracked.**

---

## `useScope()` - Component Lifecycle

Three modes for different use cases.

### Mode 1: Factory (Most Common)

Create component-scoped signals with auto-cleanup:

```tsx
function TodoList() {
  const scope = useScope(() => {
    const todos = signal([]);
    const filter = signal("all");
    
    return disposable({
      todos,
      filter,
      addTodo: (text) => todos.set(prev => [...prev, text]),
    });
  });

  return (
    <div>
      <p>Filter: {rx(scope.filter)}</p>
      <button onClick={() => scope.addTodo("New")}>Add</button>
    </div>
  );
}
```

### Mode 2: Lifecycle

Track component lifecycle phases:

```tsx
function Component() {
  const getPhase = useScope({
    init: () => console.log("Before first render"),
    mount: () => console.log("After first paint"),
    render: () => console.log("Every render"),
    cleanup: () => console.log("React cleanup"),
    dispose: () => console.log("True unmount"),
  });

  return <div>Phase: {getPhase()}</div>;
}
```

### Mode 3: Object Tracking

Track object reference changes:

```tsx
function UserAnalytics({ user }) {
  useScope({
    for: user,
    init: (user) => analytics.track("session-start", user),
    dispose: (user) => analytics.track("session-end", user),
  });

  return <div>Tracking: {user.name}</div>;
}
```

### Lifecycle Phases

| Phase | When | Runs in StrictMode | Use For |
|-------|------|-------------------|---------|
| **init** | Before first render | Once | Signal creation |
| **mount** | After first paint | Once | DOM measurements |
| **render** | Every render | Every render | Tracking |
| **cleanup** | React cleanup | 2-3 times | Pause (not final) |
| **dispose** | True unmount | Once | Final cleanup |

### Options

```tsx
useScope(factory, {
  watch: [dep1, dep2], // Recreate when deps change
  update: [(scope) => scope.refresh(), dep], // Run effect on deps change
});
```

---

## `provider()` - Signal Context

Create signal-based React Context with optimized rendering:

```tsx
const [useTheme, ThemeProvider] = provider({
  name: "Theme",
  create: (initialValue: "dark" | "light") => {
    return signal(initialValue);
  },
});

function App() {
  return (
    <ThemeProvider value="dark">
      <ChildComponent />
    </ThemeProvider>
  );
}

function ChildComponent() {
  const theme = useTheme();
  return <div>Theme: {rx(theme)}</div>;
}
```

### With Complex State

```tsx
const [useSession, SessionProvider] = provider({
  name: "Session",
  create: (initialUser) => {
    const user = signal(initialUser);
    const isAuthenticated = user.to((u) => u !== null);

    const login = async (credentials) => {
      const userData = await api.login(credentials);
      user.set(userData);
    };

    const logout = () => user.set(null);

    return disposable({ user, isAuthenticated, login, logout });
  },
  update: (context, newUser) => {
    context.user.set(newUser);
  },
});
```

### Benefits

- ✅ **Lazy tracking** - Only subscribes to signals actually accessed
- ✅ **Fine-grained updates** - Only `rx()` parts re-render
- ✅ **Type-safe** - Full TypeScript inference
- ✅ **Auto-cleanup** - Context disposed when provider unmounts

---

## Suspense + ErrorBoundary

Combine with React Suspense and ErrorBoundary:

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        {rx(() => {
          const data = wait(asyncSignal());
          return <DataView data={data} />;
        })}
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## Best Practices

### ✅ Do

```tsx
// Use rx() for reactive parts
<div>Count: {rx(count)}</div>

// Use useScope for component-scoped signals
const { signal } = useScope(() => disposable({ signal: signal(0) }));

// Wrap async values with wait() or loadable()
rx(() => <div>{wait(asyncSignal()).name}</div>)
```

### ❌ Don't

```tsx
// Don't create signals in render without useScope
const signal = signal(0); // Memory leak!

// Don't read signals outside reactive context
const value = count(); // Won't re-render

// Don't use rx() in attributes
<input value={rx(signal)} /> // Won't work
```

---

## Next Steps

- **[Examples](./EXAMPLES.md)** - Real-world examples
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation

