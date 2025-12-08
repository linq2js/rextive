# React Integration

Deep dive into Rextive's React integration.

---

## `rx()` - Reactive Rendering

The core function for reactive rendering in React.

### Overload 1: Single Signal

```tsx
const count = signal(42);
{
  rx(count);
} // Renders: 42
```

### Overload 2: Signal with Selector

```tsx
const user = signal({ name: "Alice", age: 30 });

// Property access
{
  rx(user, "name");
} // Renders: "Alice"

// Selector function
{
  rx(user, (u) => u.age + 5);
} // Renders: 35
```

### Overload 3: Reactive Function

```tsx
{
  rx(() => <div>Count: {count()}</div>);
}
```

Auto-tracks any signals accessed inside the function.

### Overload 4: Component with Reactive Props

```tsx
{
  rx(Component, { prop1: signal1, prop2: "static" });
}
{
  rx("div", { children: count, className: "counter" });
}
```

### ⚠️ Important Rules

**Never use `rx()` directly in attributes:**

```tsx
// ❌ WRONG - Won't be reactive
<input value={rx(signal)} />;

// ✅ CORRECT - Use one of these
{
  rx(() => <input value={signal()} />);
}
{
  rx("input", { value: signal });
}
```

### Async Signal Handling

**With Suspense (`wait()`):**

```tsx
{
  rx(() => {
    const data = wait(userData()); // Throws for Suspense
    return <div>{data.name}</div>;
  });
}
```

**With manual loading states (`task.from()`):**

```tsx
{
  rx(() => {
    const state = task.from(userData());
    if (state.loading) return <Spinner />;
    if (state.error) return <Error error={state.error} />;
    return <div>{state.value.name}</div>;
  });
}
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

## `useScope()` - Scoped State Management

Create cached scope instances with automatic lifecycle management.

### Basic Usage

```tsx
useScope(key, factory);
useScope(key, factory, options);
useScope(key, factory, args);
useScope(key, factory, args, options);
```

| Parameter | Type              | Description                                                |
| --------- | ----------------- | ---------------------------------------------------------- |
| `key`     | `unknown`         | Unique identifier for the scope                            |
| `factory` | `() => TScope`    | Factory function to create the scope                       |
| `args`    | `TArgs[]`         | Arguments passed to factory (scope recreates when changed) |
| `options` | `UseScopeOptions` | Custom equality for args comparison                        |

### Basic Example

```tsx
function TodoList() {
  const scope = useScope("todoList", () => {
    const todos = signal([]);
    const filter = signal("all");

    return {
      todos,
      filter,
      addTodo: (text) => todos.set((prev) => [...prev, text]),
    };
  });

  return (
    <div>
      <p>Filter: {rx(scope.filter)}</p>
      <button onClick={() => scope.addTodo("New")}>Add</button>
    </div>
  );
}
```

### With Args (Recreates When Args Change)

```tsx
function UserProfile({ userId }: { userId: string }) {
  const scope = useScope(
    "userProfile",
    (id) => {
      const user = signal(async () => fetchUser(id));
      return { user };
    },
    [userId]
  );

  return <div>{rx(scope.user, (u) => u?.name)}</div>;
}
```

### Multiple Instances (User-Controlled Key)

```tsx
function Tab({ tabId }: { tabId: string }) {
  // Each tab gets its own scope
  const scope = useScope(`tab:${tabId}`, () => {
    const content = signal("");
    return { content };
  });

  return <div>{rx(scope.content)}</div>;
}
```

### With Logic

```tsx
const counterLogic = logic("counterLogic", () => {
  const count = signal(0);
  return { count, increment: () => count.set((c) => c + 1) };
});

function Counter() {
  // Automatically uses logic.create()
  const { count, increment } = useScope("counter", counterLogic);
  return <button onClick={increment}>{rx(count)}</button>;
}
```

### Custom Equality for Args

```tsx
// Options object
useScope("data", factory, [filters], {
  equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
});

// Strategy shorthand
useScope("data", factory, [obj], "shallow");
useScope("data", factory, [obj], "deep");

// Custom function
useScope("data", factory, [obj], (a, b) => a.id === b.id);
```

### Key Features

| Feature             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| **Keyed caching**   | Same key = same instance (handles StrictMode)           |
| **Args comparison** | Recreates scope when args change                        |
| **Auto-dispose**    | Signals inside factory are automatically disposed       |
| **Logic support**   | Automatically uses `logic.create()` for Logic factories |

### Additional Cleanup

```tsx
// Add dispose method for non-signal cleanup
const scope = useScope("myScope", () => {
  const data = signal([]);
  const subscription = service.subscribe();

  return {
    data,
    dispose: () => subscription.unsubscribe(),
  };
});
```

---

## `provider()` - Signal Context

Create type-safe React Context with three modes.

### Mode 1: Signal Mode (default)

Wraps value in a mutable signal. Perfect for reactive primitives:

```tsx
const [useTheme, ThemeProvider] = provider<"dark" | "light">({
  name: "Theme",
});

// Provider
<ThemeProvider value="dark">
  <App />
</ThemeProvider>;

// Consumer - returns Mutable<"dark" | "light">
function ChildComponent() {
  const theme = useTheme();
  return <div>Theme: {rx(theme)}</div>;
  // theme.set("light") to update
}
```

### Mode 2: Raw Mode

Passes value directly without wrapping. Perfect for logic instances:

```tsx
import { InferLogic, useScope } from "rextive/react";
import { productLogic } from "./logic/productLogic";

type ProductInstance = InferLogic<typeof productLogic>;

const [useProduct, ProductProvider] = provider<ProductInstance>({
  name: "Product",
  raw: true, // Pass value directly
});

// Parent - create scope and provide
function ProductPage() {
  const $product = useScope("product", productLogic);
  return (
    <ProductProvider value={$product}>
      <ProductContent />
    </ProductProvider>
  );
}

// Child - access logic instance directly
function ProductContent() {
  const $product = useProduct(); // InferLogic directly
  return <div>Qty: {rx($product.quantity)}</div>;
}
```

### Mode 3: Factory Mode

For complex contexts with custom initialization:

```tsx
const [useSession, SessionProvider] = provider({
  name: "Session",
  create: (initialUser) => {
    const user = signal(initialUser);
    const isAuthenticated = user.to((u) => u !== null);
    const login = async (creds) => user.set(await api.login(creds));
    const logout = () => user.set(null);
    return disposable({ user, isAuthenticated, login, logout });
  },
  update: (ctx, newUser) => ctx.user.set(newUser),
});
```

### Options

| Option   | Type                   | Description                                   |
| -------- | ---------------------- | --------------------------------------------- |
| `name`   | `string`               | Name for error messages                       |
| `raw`    | `boolean`              | Pass value directly (default: `false`)        |
| `equals` | `EqualsFn`             | Custom equality for raw mode value comparison |
| `create` | `(value) => T`         | Factory for factory mode                      |
| `update` | `(ctx, value) => void` | Called when value prop changes (factory mode) |

### Benefits

- ✅ **Auto-dispose** - Signals disposed when provider unmounts
- ✅ **Type-safe** - Full TypeScript inference
- ✅ **Fine-grained** - Only `rx()` parts re-render
- ✅ **StrictMode safe** - Handles double-renders correctly

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
<div>Count: {rx(count)}</div>;

// Use useScope for component-scoped signals
const { count } = useScope("myComponent", () => ({ count: signal(0) }));

// Wrap async values with wait() or task.from()
rx(() => <div>{wait(asyncSignal()).name}</div>);
```

### ❌ Don't

```tsx
// Don't create signals in render without useScope
const count = signal(0); // Memory leak!

// Don't read signals outside reactive context
const value = count(); // Won't re-render

// Don't use rx() in attributes
<input value={rx(signal)} />; // Won't work
```

---

## Next Steps

- **[Examples](./EXAMPLES.md)** - Real-world examples
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
