# Rextive Public API Reference

Complete reference for all public APIs in the rextive library.

## Core Package: `rextive`

Framework-agnostic reactive primitives. Import from `'rextive'`.

### Signal Creation

#### `signal(value?, options?)` / `$(value?, options?)`

Create mutable or computed signals.

```ts
// Mutable signal
const count = signal(0);
const user = signal<User>(); // No initial value

// With custom equality
const state = signal({ x: 1 }, "shallow");
const data = signal([1, 2], "deep");
const value = signal(42, (a, b) => a === b);

// Computed signal - single dependency
const doubled = count.map((x) => x * 2);
const squared = count.map((x) => x * x, "is"); // with equality

// Computed signal - multiple dependencies
const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b);
const combined = signal({ user, posts }, async ({ deps, abortSignal }) => {
  return await fetchData(deps.user, { signal: abortSignal });
});
```

**Equality Options:**

- `'is'` - Object.is (default)
- `'shallow'` - Shallow equality
- `'deep'` - Deep equality (lodash isEqual)
- `(a, b) => boolean` - Custom function

### Signal Instance Methods

#### `.set(value)` / `.set(fn)`

Update signal value.

```ts
count.set(1);
count.set((x) => x + 1);
```

#### `.reset()`

Reset to initial value.

```ts
count.reset(); // Back to 0
```

#### `.on(listener)`

Subscribe to changes. Returns unsubscribe function.

```ts
const unsubscribe = count.on(() => console.log(count()));
```

#### `.dispose()`

Clean up signal and stop computations.

```ts
count.dispose();
```

#### `.map(fn, equals?)`

Transform signal value.

```ts
const doubled = count.map((x) => x * 2);
const formatted = count.map((x) => `$${x}`, "shallow");
```

#### `.scan(fn, initialValue, equals?)`

Accumulate values over time.

```ts
const total = count.scan((acc, curr) => acc + curr, 0);
```

### Batch Updates

#### `batch(fn)`

Group multiple updates into one notification.

```ts
batch(() => {
  count.set(1);
  name.set("Alice");
}); // Only one update notification
```

#### `signal.batch(fn)` / `$.batch(fn)`

Same as `batch(fn)`.

```ts
$.batch(() => {
  count.set(1);
  name.set("Alice");
});
```

### Async Coordination

#### `wait.all(awaitables, onResolve?)`

Wait for all to complete (like Promise.all).

```ts
// Suspense mode (sync)
const [a, b, c] = wait.all([promiseA, promiseB, promiseC]);

// Async mode with callback
const promise = wait.all([promiseA, promiseB], (results) => {
  console.log(results); // [a, b]
  return processResults(results);
});
```

#### `wait.any(awaitables, onResolve?)`

Wait for first to complete (like Promise.any).

```ts
const fastest = wait.any([slow, medium, fast]);
```

#### `wait.race(awaitables, onResolve?)`

Race to first settlement (like Promise.race).

```ts
const first = wait.race([p1, p2, p3]);
```

#### `wait.settled(awaitables, onSettled?)`

Wait for all to settle (like Promise.allSettled).

```ts
// Suspense mode (sync) - throws Promise if loading, returns settled results
const results = wait.settled([p1, p2, p3]);
// results: PromiseSettledResult[] - never throws errors

// Async mode with callback
const promise = wait.settled([p1, p2, p3], (results) => {
  return results.filter((r) => r.status === "fulfilled");
});
```

#### `wait.delay(ms, onResolve?)`

Delay execution.

```ts
wait.delay(1000); // Wait 1 second
const value = wait.delay(1000, () => "done");
```

#### `wait.timeout(promise, ms, onResolve?, onError?)`

Add timeout to promise.

```ts
const result = wait.timeout(fetchData(), 5000);
```

### Loadable State

#### `loadable(value)`

Normalize values to loadable state.

```ts
const l = loadable(promise);
const l2 = loadable(signal);
const l3 = loadable(loadable); // Pass-through
```

#### `loadable.loading(promise)`

Create loading state.

```ts
const l = loadable.loading(fetchData());
```

#### `loadable.success(value, promise?)`

Create success state.

```ts
const l = loadable.success({ id: 1, name: "Alice" });
```

#### `loadable.error(error, promise?)`

Create error state.

```ts
const l = loadable.error(new Error("Failed"));
```

#### `loadable.is(value)`

Type guard for loadable.

```ts
if (loadable.is(value)) {
  console.log(value.status); // 'loading' | 'success' | 'error'
}
```

#### `loadable.get(promise)` / `loadable.set(promise, loadable)`

Get/set loadable state for a promise.

```ts
const l = loadable.get(myPromise);
loadable.set(myPromise, loadable.success(data));
```

### Type Guards

#### `is(value)`

Check if value is observable.

```ts
if (is(value)) {
  value.on(() => console.log("changed"));
}
```

#### `isSignal(value)`

Check if value is a signal.

```ts
if (isSignal(value)) {
  console.log(value());
}
```

### Utilities

#### `emitter()`

Create event emitter.

```ts
const events = emitter<{ data: any }>();
events.emit("data", payload);
const off = events.on("data", (payload) => console.log(payload));
```

#### `tryDispose(value)`

Safely dispose if disposable.

```ts
tryDispose(signal); // Calls dispose() if available
tryDispose({}); // No-op
```

#### `resolveEquals(option)`

Resolve equality strategy to function.

```ts
const eq = resolveEquals("shallow");
const eq2 = resolveEquals((a, b) => a.id === b.id);
```

#### `dev()` / `dev(fn)`

Development-only utilities namespace.

```ts
// Check if in dev mode
if (dev()) {
  console.log("Running in development");
}

// Execute function only in dev
dev(() => {
  validateSignalGraph();
  checkMemoryLeaks();
});
```

#### `dev.log()` / `dev.warn()` / `dev.error()`

Development-only logging.

```ts
dev.log("Signal created:", signal);
dev.warn("Performance issue detected");
dev.error("Invalid configuration");
```

#### `dev.assert(condition, message)`

Development-only assertions.

```ts
dev.assert(count > 0, "Count must be positive");
dev.assert(user !== undefined, "User is required");
```

---

## React Package: `rextive/react`

React hooks and components. Import from `'rextive/react'`.

### Component Rendering

#### `rx(signals, render, options?)`

Reactive rendering with automatic Suspense.

```tsx
import { rx } from "rextive/react";

// Overload 1: With awaited values
rx({ user, posts }, (awaited) => (
  <div>
    <h1>{awaited.user.name}</h1>
    <PostList posts={awaited.posts} />
  </div>
));

// Overload 2: With loadables
rx({ user, posts }, (awaited, loadables) => {
  if (loadables.user.status === "loading") return <Spinner />;
  if (loadables.user.status === "error") return <Error />;
  return <div>{awaited.user.name}</div>;
});

// Overload 3: Element props (reactive component)
rx(<MyComponent user={user} count={count} />);
```

**Options:**

- `lazy?: boolean` - Lazy tracking (default: true)
- `fallback?: ReactNode` - Custom Suspense fallback

### Scope & Lifecycle

#### `useScope()` - Three Modes

**Mode 1: Factory mode** - Create scoped signals/services

```tsx
const { count, doubled } = useScope(
  () => {
    const count = signal(0);
    const doubled = count.map((x) => x * 2);
    return {
      count,
      doubled,
      dispose: [count, doubled],
    };
  },
  {
    watch: [userId], // Optional: recreate when deps change
  }
);
```

**Mode 2: Component lifecycle** - Track component phases

```tsx
const getPhase = useScope({
  init: () => console.log("Before first render"),
  mount: () => console.log("After first paint"),
  render: () => console.log("Every render"),
  cleanup: () => console.log("React cleanup"),
  dispose: () => console.log("True unmount (StrictMode-aware)"),
});

console.log(getPhase()); // "render" | "mount" | "cleanup" | "disposed"
```

**Mode 3: Object lifecycle** - Track object changes

```tsx
const user = { id: 1, name: "John" };

const getPhase = useScope({
  for: user, // Track this object
  init: (user) => console.log("User activated:", user),
  mount: (user) => startTracking(user),
  render: (user) => console.log("Rendering", user),
  cleanup: (user) => pauseTracking(user),
  dispose: (user) => analytics.track("session-end", user),
});

// When user reference changes: dispose old → init new
```

### Signal Subscription

#### `useWatch(signals)`

Subscribe to signals with lazy tracking.

```tsx
const [value, loadable] = useWatch({ user, posts });

// value: { user: User, posts: Post[] }
// loadable: { user: Loadable<User>, posts: Loadable<Post[]> }

if (loadable.user.status === "loading") return <Spinner />;
return <div>{value.user.name}</div>;
```

### Manual Rerender

#### `useRerender()`

Get manual rerender function.

```tsx
const rerender = useRerender();

useEffect(() => {
  const unsubscribe = count.on(() => rerender());
  return unsubscribe;
}, []);
```

---

## Types

### Core Types

```ts
import type {
  Signal,
  MutableSignal,
  ComputedSignal,
  Observable,
  Disposable,
  Loadable,
  LoadingLoadable,
  SuccessLoadable,
  ErrorLoadable,
  SignalOptions,
  EqualsFn,
  EqualsStrategy,
  EqualsOption,
} from "rextive";
```

### React Types

```ts
import type {
  RxOptions,
  UseScopeOptions,
  LifecyclePhase,
  ComponentLifecycleCallbacks,
  ObjectLifecycleCallbacks,
  RerenderOptions,
  RerenderFunction,
} from "rextive/react";
```

---

## Summary

**Core Exports (40 APIs):**

- Signal: `signal` / `$`, `.set`, `.reset`, `.on`, `.dispose`, `.map`, `.scan`
- Batch: `batch`, `signal.batch`
- Async: `wait.all`, `wait.any`, `wait.race`, `wait.settled`, `wait.delay`, `wait.timeout`
- Loadable: `loadable`, `loadable.loading`, `loadable.success`, `loadable.error`, `loadable.is`, `loadable.get`, `loadable.set`
- Guards: `is`, `isSignal`
- Utils: `emitter`, `tryDispose`, `resolveEquals`
- Dev: `dev`, `dev(fn)`, `dev.log`, `dev.warn`, `dev.error`, `dev.assert`

**React Exports (4 APIs):**

- `rx` - Reactive rendering (3 overloads)
- `useScope` - Lifecycle & scoped state (3 modes)
- `useWatch` - Signal subscription
- `useRerender` - Manual rerender

**Total: 44 Public APIs**
