# API Reference

Complete API documentation for Rextive, organized by package exports.

---

## Table of Contents

- [Core (`rextive`)](#core-rextive)
- [React (`rextive/react`)](#react-rextivereact)
- [Operators (`rextive/op`)](#operators-rextiveop)
- [Cache (`rextive/cache`)](#cache-rextivecache)
- [Plugins (`rextive/plugins`)](#plugins-rextiveplugins)
- [Immer (`rextive/immer`)](#immer-rextiveimmer)
- [DevTools (`rextive/devtools`)](#devtools-rextivedevtools)
- [Test (`rextive/test`)](#test-rextivetest)

---

## Core (`rextive`)

The core package provides the fundamental reactive primitives.

```ts
import { signal, is, task, wait, logic, disposable, emitter } from "rextive";
```

### `signal()`

The core primitive for creating reactive state.

#### Mutable Signals

```tsx
// Empty signal (undefined initial value, notifier pattern)
const user = signal<User>();

// With initial value
const count = signal(0);

// With equality strategy
const user = signal({ name: "John" }, "shallow");
const data = signal(complexObj, "deep");

// With options
const config = signal(initialValue, {
  equals: "shallow",
  name: "config",
  fallback: (error) => defaultValue,
  onError: (error) => console.error(error),
  onChange: (value) => console.log(value),
  lazy: false,
  use: [plugin1, plugin2],
});
```

#### Computed Signals

```tsx
// Basic computed
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

// With equality
const summary = signal(
  { firstName, lastName },
  ({ deps }) => ({ full: `${deps.firstName} ${deps.lastName}` }),
  "shallow"
);

// Async computed
const userData = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/users/${deps.userId}`, { signal: abortSignal });
  return res.json();
});
```

#### Equality Options

| Option               | Description                      | Use For        |
| -------------------- | -------------------------------- | -------------- |
| `"strict"` (default) | Reference equality (`Object.is`) | Primitives     |
| `"shallow"`          | One level deep comparison        | Simple objects |
| `"deep"`             | Recursive comparison             | Nested objects |
| Custom function      | `(a, b) => boolean`              | Custom logic   |

---

### Signal Instance Properties

#### `.uid`

Auto-generated, immutable unique identifier:

```tsx
const count = signal(0);
console.log(count.uid); // "sig-1"

// Perfect for React keys
signals.map((s) => <div key={s.uid}>{s.displayName}</div>);
```

#### `.displayName`

Debug name for devtools (auto-generated or user-provided via `name` option).

---

### Signal Instance Methods

#### `.get()` / `signal()`

Read the current value (triggers reactive tracking):

```tsx
const value = count.get();
const value = count(); // Shorthand
```

#### `.peek()`

Read the current value **without** triggering reactive tracking:

```tsx
const value = count.peek();
```

Use `peek()` when you need to read a value but don't want to create a reactive dependency.

#### `.set(value)` / `.set(fn)`

Update value (mutable signals only):

```tsx
count.set(5);
count.set((prev) => prev + 1);
```

#### `.reset()`

Reset to initial value (mutable signals only):

```tsx
count.reset();
```

#### `.on(callback)`

Subscribe to changes:

```tsx
const unsubscribe = count.on(() => {
  console.log("Count changed:", count());
});

// Cleanup
unsubscribe();
```

#### `.to(selector, options?)`

Transform signal value (creates computed signal):

```tsx
const doubled = count.to((x) => x * 2);
const userName = user.to((u) => u.name, "shallow");
```

#### `.pipe(...operators)`

Chain operators:

```tsx
import { to, filter, scan } from "rextive/op";

const result = count.pipe(
  filter((x) => x > 0),
  to((x) => x * 2),
  scan((acc, x) => acc + x, 0)
);
```

#### `.refresh()`

Force immediate recomputation:

```tsx
userData.refresh();
```

#### `.stale()`

Mark for lazy recomputation:

```tsx
userData.stale(); // Will recompute on next access
```

#### `.when(notifier, action, filter?)`

React to changes in other signals:

```tsx
// With action string
userData.when(refreshTrigger, "refresh");
userData.when(resetTrigger, "reset");
userData.when(invalidateTrigger, "stale");

// With filter
userData.when(trigger, "refresh", (notifier, self) => notifier() > 5);

// With callback
counter.when(increment, (notifier, self) => {
  self.set((prev) => prev + notifier());
});
```

#### `.tuple`

Get `[signal, setter]` tuple (mutable signals only):

```tsx
const [count, setCount] = signal(0).tuple;
```

#### `.pause()` / `.resume()` / `.paused()`

Control computed signals:

```tsx
computed.pause(); // Stop recomputing
computed.resume(); // Resume
computed.paused(); // Check status
```

#### `.dispose()`

Cleanup signal:

```tsx
signal.dispose();
```

#### `.disposed()`

Check if signal has been disposed:

```tsx
if (signal.disposed()) {
  console.log("Signal is disposed");
}
```

#### `.error()` / `.tryGet()`

Safe error access:

```tsx
const error = signal.error(); // Get error without throwing
const value = signal.tryGet(); // Get value or undefined
```

#### `.hydrate(value)`

Hydrate with initial data (e.g., from SSR):

```tsx
const status = signal.hydrate(serverData); // "success" | "skipped"
```

---

### Compute Function Context

For computed signals, the compute function receives a context object:

```tsx
signal({ userId, filter }, (context) => {
  context.deps; // Dependency values
  context.abortSignal; // AbortSignal for cancellation
  context.nth; // Computation count (0, 1, 2, ...)
  context.aborted(); // Check if aborted
});
```

#### Context Methods

```tsx
signal(async (context) => {
  // Safe execution (throws if aborted)
  const data = context.safe(() => processData());

  // Safe promise (never resolves if aborted)
  await context.safe(wait.delay(300));

  // Register cleanup
  context.onCleanup(() => cleanup());

  // Reuse logic with context
  const result = await context.use(fetchUser, options);

  // Trigger recomputation (polling)
  setTimeout(() => context.refresh(), 1000);

  // Mark stale (TTL cache)
  setTimeout(() => context.stale(), 5 * 60 * 1000);
});
```

---

### Static Methods

#### `signal.batch(fn)`

Batch multiple updates:

```tsx
signal.batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
  email.set("jane@example.com");
});
// Only ONE notification
```

#### `signal.on(signals, callback)`

Subscribe to multiple signals:

```tsx
const control = signal.on([count, name], (trigger) => {
  console.log("Changed:", trigger());
});

control.pause(); // Pause
control.resume(); // Resume
control.dispose(); // Cleanup
```

#### `signal.tag()`

Create a tag for grouping signals:

```tsx
const formTag = signal.tag();

const name = signal("", { use: [formTag] });
const email = signal("", { use: [formTag] });

formTag.forEach((s) => s.reset()); // Reset all
formTag.map((s) => s.get()); // Collect values
formTag.size; // Count

// Batch operations
formTag.refreshAll(); // Force recomputation on all
formTag.resetAll(); // Reset all mutable signals
formTag.staleAll(); // Mark all computed as stale
formTag.disposeAll(); // Dispose all (destructive!)
```

#### `signal.from(signals)`

Combine signals:

```tsx
// Record form
const user = signal.from({ name, age });
console.log(user()); // { name: "...", age: ... }

// Tuple form
const coords = signal.from([x, y]);
console.log(coords()); // [10, 20]
```

#### `signal.action(compute, options?)`

Create an action (async operation with result signal):

```tsx
const loginAction = signal.action<Credentials, User>(async (creds) => {
  return authApi.login(creds);
});

// Dispatch and await result
const user = await loginAction.dispatch(credentials);

// Or access result signal reactively
const state = task.from(loginAction.result());
```

#### `signal.trace(error)`

Get error trace through signal chain:

```tsx
try {
  dashboard();
} catch (error) {
  const traces = signal.trace(error);
  // [{ signal: "db", when: "compute:initial", async: true }, ...]
}
```

#### `signal.use(signals, ...plugins)`

Apply plugins to multiple signals:

```tsx
signal.use({ count, name }, logger, persist);
```

---

### `is(value, kind?)`

Unified type guard:

```tsx
import { is } from "rextive";

is(maybeSignal); // Is any signal?
is(sig, "mutable"); // Is mutable signal?
is(sig, "computed"); // Is computed signal?
is(value, "task"); // Is a Task?
is(value, "tag"); // Is a Tag?
is(value, "accessor"); // Is an Accessor?
is(value, "observable"); // Is an Observable?
```

---

### `task`

Async state access without Suspense.

#### `task.from(promise)`

Access loading/error/success state from a Promise:

```tsx
const state = task.from(promise);

state.status;  // "loading" | "success" | "error"
state.loading; // boolean
state.value;   // resolved value (undefined while loading)
state.error;   // error if rejected
```

**Example - Stale-while-revalidate pattern:**
```tsx
rx(() => {
  const state = task.from(userDataSignal());
  return (
    <div>
      {state?.loading && <Spinner />}
      {state?.error && <Error error={state.error} />}
      {state?.value && <UserCard user={state.value} />}
    </div>
  );
});
```

---

### `wait`

Suspense integration for async values. Use inside `rx()` to unwrap promises.

#### `wait()` / `wait.all()`

Unwrap promises for Suspense (throws promise for React to catch):

```tsx
// Inside rx() - triggers Suspense boundary
rx(() => {
  const value = wait(asyncSignal());
  const [a, b] = wait([promise1, promise2]);
  const { user, posts } = wait({ user: userPromise, posts: postsPromise });
  return <div>{value.name}</div>;
});
```

> **Why not Promise.race/settled?** Use `wait()` + `task.from()` instead of creating
> wrapper promises. You get loading/error states without extra promise overhead:
> ```tsx
> rx(() => {
>   const state = task.from(asyncSignal());
>   if (state?.loading) return <Spinner />;
>   if (state?.error) return <Error error={state.error} />;
>   return <Content data={state.value} />;
> });
> ```

#### `wait.timeout()`

Promise with timeout (utility):

```tsx
const data = await wait.timeout(fetchData(), 5000);
```

#### `wait.delay()`

Simple delay (utility):

```tsx
await wait.delay(1000);
```

---

### `logic()`

Create reusable logic units:

```tsx
export const counterLogic = logic("counterLogic", () => {
  const count = signal(0);
  const doubled = count.to((x) => x * 2);

  return {
    count,
    doubled,
    increment: () => count.set((x) => x + 1),
    decrement: () => count.set((x) => x - 1),
  };
});

// Singleton access
const { count, increment } = counterLogic();

// Fresh instance
const instance = counterLogic.create();
instance.dispose(); // Cleanup
```

#### `logic.provide()`

Override logic for testing:

```tsx
logic.provide(authLogic, () => ({
  user: signal(mockUser),
  logout: vi.fn(),
}));
```

#### `logic.abstract()`

Create abstract logic (must be overridden):

```tsx
const storageProvider = logic.abstract<{
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
}>("storageProvider");

// Provide implementation
logic.provide(storageProvider, () => ({
  get: async (key) => localStorage.getItem(key),
  set: async (key, value) => localStorage.setItem(key, value),
}));
```

#### `logic.clear()`

Clear all overrides and dispose tracked instances:

```tsx
afterEach(() => logic.clear());
```

---

### `disposable()`

Create disposable from object:

```tsx
const scope = disposable({
  count: signal(0),
  doubled: count.to((x) => x * 2),
});

scope.dispose(); // Disposes all signals
```

---

### `emitter()`

Event emitter:

```tsx
const events = emitter<string>();
events.on((value) => console.log(value));
events.emit("hello");
events.dispose();
```

---

### Other Utilities

```tsx
import {
  // Equality helpers
  shallowEquals,    // Shallow equality comparison
  resolveEquals,    // Resolve equality strategy string to function
  
  // Type checks
  isPromiseLike,    // Check if value is promise-like
  
  // Function utilities
  compose,          // Function composition (right to left)
  
  // Development
  dev,              // Check if in dev mode: dev() => boolean
} from "rextive";
```

#### `compose(...fns)`

Right-to-left function composition:

```tsx
const process = compose(
  (x: number) => x.toString(),
  (x: number) => x * 2,
  (x: number) => x + 1
);
process(5); // "12" (5+1=6, 6*2=12, "12")
```

#### `dev()`

Check development mode (useful for conditional logging):

```tsx
if (dev()) {
  console.log("Debug info:", signal.peek());
}
```

### Error Types

```tsx
import {
  AbortedComputationError, // Thrown when async computation is aborted
  FallbackError,           // Thrown when fallback handler fails
  SignalDisposedError,     // Thrown when accessing disposed signal
} from "rextive";
```

---

## React (`rextive/react`)

React bindings for Rextive. Re-exports all core exports for convenience.

```tsx
import { signal, rx, useScope, useStable, provider } from "rextive/react";
```

### `rx()`

Reactive rendering with four overloads:

```tsx
// 1. Single signal
{
  rx(count);
}

// 2. With selector (property or function)
{
  rx(user, "name");
}
{
  rx(user, (u) => u.name);
}

// 3. Reactive function (auto-tracking)
{
  rx(() => <div>{count()}</div>);
}

// 4. Component form
{
  rx(Component, { prop: signal });
}
{
  rx("div", { children: count });
}
```

#### `rx.use()`

Reactive hook with auto-dispose:

```tsx
function Component() {
  const value = rx.use(() => {
    const userData = wait(user());
    return { userData };
  });

  return <div>{value.userData.name}</div>;
}
```

---

### `useScope()`

Component-scoped signals with automatic lifecycle management.

#### Local Mode (private per-component)

```tsx
// Basic - no deps
const { count } = useScope(() => ({ count: signal(0) }));

// With deps - passed to factory
const { user } = useScope(
  (id) => ({
    user: signal(async () => fetchUser(id)),
  }),
  [userId]
);

// With Logic
const { count, increment } = useScope(counterLogic);
```

#### Shared Mode (keyed, shared across components)

```tsx
// Multiple components share this scope
const { input } = useScope("searchBar", searchBarLogic);

// Dynamic keys for multiple instances
const { content } = useScope(`tab:${tabId}`, tabLogic);
```

#### Custom Equality for Deps

```tsx
useScope((filters) => ({ ... }), [filters], "shallow");
useScope((obj) => ({ ... }), [obj], (a, b) => a.id === b.id);
```

#### Multiple Scopes Mode

Create multiple scopes at once, returning a tuple:

```tsx
// Array of factories - returns tuple
const [counter, form] = useScope([
  () => ({ count: signal(0) }),
  () => ({ name: signal(""), email: signal("") }),
]);

// With scope() helper for clarity
import { scope } from "rextive/react";

const [counter, form] = useScope([
  scope(counterLogic),
  scope(formLogic),
]);

// Shared mode with scope()
const [shared, local] = useScope([
  scope("shared-key", sharedLogic), // Shared across components
  () => ({ value: signal("local") }), // Local to this component
]);

// Mixed: logic and factories
const [counter, form, validator] = useScope([
  scope(counterLogic),
  () => ({ name: signal("") }),
  scope(validationLogic),
]);
```

**`scope()` helper function:**

```tsx
// Local mode
scope(factory);
scope(factory, deps);
scope(factory, deps, equals);

// Shared mode
scope(key, factory);
scope(key, factory, deps);
scope(key, factory, deps, equals);

// Returns a Scope<T> descriptor
// Note: No proxy mode for scope()
```

---

### `useStable()`

Dynamic stable reference getter. Similar to `useCallback`/`useMemo` but with dynamic keys.

**When to use `useStable()` vs React hooks:**

| Use Case | Recommendation |
|----------|---------------|
| Single callback with known deps | `useCallback` |
| Single memoized value | `useMemo` |
| Multiple callbacks in one place | `useStable()` |
| Dynamic/computed keys | `useStable()` |
| Need stable ref without deps array | `useStable()` |

```tsx
const stable = useStable<{
  onClick: () => void;
  config: { theme: string };
}>();

// Single key-value (always returns same reference)
const onClick = stable("onClick", () => handleClick());
const config = stable("config", { theme: "dark" }, "shallow");

// Multiple values at once
const handlers = stable({
  onSubmit: () => submitForm(),
  onCancel: () => cancelForm(),
});
```

**vs React hooks:**
```tsx
// useStable - one line, no deps array
const onClick = stable("onClick", () => doSomething(count));

// useCallback - requires deps array
const onClick = useCallback(() => doSomething(count), [count]);
```

---

### `provider()`

React context with three modes:

#### Signal Mode (default)

```tsx
const [useTheme, ThemeProvider] = provider<"dark" | "light">({ name: "Theme" });

<ThemeProvider value="dark">{children}</ThemeProvider>;

const theme = useTheme(); // Mutable<"dark" | "light">
```

#### Raw Mode

```tsx
const [useStore, StoreProvider] = provider<StoreType>({
  name: "Store",
  raw: true,
});

<StoreProvider value={storeInstance}>{children}</StoreProvider>;

const $store = useStore(); // StoreType directly
```

#### Factory Mode

```tsx
const [useAuth, AuthProvider] = provider<AuthContext, User>({
  name: "Auth",
  create: (user) => ({ user: signal(user), logout: () => {} }),
  update: (ctx, value) => ctx.user.set(value),
});
```

---

## Operators (`rextive/op`)

Signal operators for transforming and combining signals.

```tsx
import {
  to,
  filter,
  scan,
  focus,
  lens,
  debounce,
  throttle,
  delay,
  pace,
  take,
  takeWhile,
  takeLast,
  takeUntil,
  skip,
  skipWhile,
  skipLast,
  skipUntil,
  min,
  max,
  count,
  distinct,
} from "rextive/op";
```

### Transform Operators

#### `to(selector, options?)`

Transform values:

```tsx
const doubled = count.pipe(to((x) => x * 2));
```

#### `filter(predicate)`

Filter values:

```tsx
const positive = count.pipe(filter((x) => x > 0));
```

#### `scan(fn, initial)`

Accumulate values:

```tsx
const total = count.pipe(scan((acc, x) => acc + x, 0));
```

#### `focus(path, fallback?, options?)`

Bidirectional lens for nested properties:

```tsx
const form = signal({ user: { name: "Alice" } });
const userName = form.pipe(focus("user.name"));

userName(); // "Alice"
userName.set("Bob"); // Updates source immutably

// With fallback for optional properties
const nickname = user.pipe(focus("nickname", () => "Guest"));
```

#### `lens(source, path)`

Lightweight lens (no signal created):

```tsx
const [getName, setName] = lens(form, "user.name");
```

---

### Timing Operators

#### `debounce(ms)`

```tsx
const debouncedSearch = searchInput.pipe(debounce(300));
```

#### `throttle(ms)`

```tsx
const throttledPosition = mousePos.pipe(throttle(100));
```

#### `pace(ms)`

Rate limit updates:

```tsx
const pacedData = fastData.pipe(pace(1000));
```

#### `delay(ms)`

Delay updates:

```tsx
const delayed = source.pipe(delay(500));
```

---

### Sequence Operators (Advanced)

> **When to use:** These RxJS-style operators are useful for streaming scenarios
> (real-time data, event sequences). For typical app state, computed signals
> with conditionals are often simpler.

#### Take Operators

```tsx
take(5);                    // First 5 values
takeWhile((x) => x < 10);   // While condition true
takeLast(3);                // Last 3 values
takeUntil(stopSignal);      // Until signal emits
```

#### Skip Operators

```tsx
skip(5);                    // Skip first 5
skipWhile((x) => x < 10);   // Skip while condition true
skipLast(3);                // Skip last 3
skipUntil(startSignal);     // Skip until signal emits
```

**Example - Stream processing:**
```tsx
// Only process first 10 mouse events, then stop
const limitedClicks = clicks.pipe(take(10));

// Skip events until user is authenticated
const protectedEvents = events.pipe(skipUntil(isAuthenticated));
```

---

### Aggregation Operators

```tsx
min();      // Track minimum value seen
max();      // Track maximum value seen
count();    // Count emissions
distinct(); // Remove consecutive duplicates
```

---

## Cache (`rextive/cache`)

Data caching with strategies.

```tsx
import {
  cache,
  lru,
  staleOn,
  evictOn,
  hydrate,
  ObjectKeyedMap,
} from "rextive/cache";
```

### `cache(name, factory, options?)`

Create cached data fetcher:

```tsx
const getUser = cache(
  "users",
  async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`);
    return res.json();
  },
  {
    strategy: [lru(100), staleOn({ maxAge: 60_000 })],
  }
);

// Access cached data
const { value, unref } = getUser("123");
const user = await value;
unref(); // Release reference

// Cache operations
getUser.stale("123"); // Mark stale
getUser.refresh("123"); // Force re-fetch
getUser.delete("123"); // Remove
getUser.clear(); // Clear all
```

### Strategies

```tsx
lru(maxSize); // LRU eviction
staleOn({ maxAge }); // Mark stale after time
evictOn({ maxAge }); // Evict after time
hydrate(loadFn); // Hydrate from storage
```

### `ObjectKeyedMap`

Map with object keys:

```tsx
const map = new ObjectKeyedMap<{ id: number }, string>();
map.set({ id: 1 }, "value");
map.get({ id: 1 }); // "value"
```

---

## Plugins (`rextive/plugins`)

Signal plugins for extended behavior.

```tsx
import { persistor } from "rextive/plugins";
```

### `persistor(options)`

Auto-persistence plugin:

```tsx
const persist = persistor<{ theme: string; fontSize: number }>({
  load: () => JSON.parse(localStorage.getItem("settings") || "{}"),
  save: (args) => {
    const existing = JSON.parse(localStorage.getItem("settings") || "{}");
    localStorage.setItem(
      "settings",
      JSON.stringify({ ...existing, ...args.values })
    );
  },
});

const theme = signal("dark", { use: [persist("theme")] });
```

---

## Immer (`rextive/immer`)

Immer integration for immutable updates.

```tsx
import { produce } from "rextive/immer";
```

### `produce(recipe)`

Write mutations that are actually immutable:

```tsx
const state = signal({ count: 0, user: { name: "John" } });

state.set(
  produce((draft) => {
    draft.count++;
    draft.user.name = "Jane";
  })
);
```

---

## DevTools (`rextive/devtools`)

Debug and inspect signals.

```tsx
import {
  enableDevTools,
  disableDevTools,
  isDevToolsEnabled,
  getSignals,
  getSignal,
  getTags,
  getTag,
  getStats,
  getSnapshot,
  onDevToolsEvent,
  enableChainTracking,
  disableChainTracking,
  getChains,
  clearChains,
} from "rextive/devtools";
```

### Setup

```tsx
// Enable devtools (call before creating signals)
enableDevTools({
  maxHistory: 100,
  name: "my-app",
  logToConsole: true,
});

// Check status
isDevToolsEnabled(); // true

// Disable
disableDevTools();
```

### Inspection

```tsx
// Get all signals
const signals = getSignals(); // Map<string, SignalInfo>

// Get specific signal
const info = getSignal("counter");

// Get all tags
const tags = getTags();

// Get statistics
const stats = getStats();
// { signalCount, mutableCount, computedCount, tagCount, totalChanges, ... }

// Get snapshot of all values
const snapshot = getSnapshot();
// { counter: 5, userName: "Alice", ... }
```

### Event Subscription

```tsx
const unsubscribe = onDevToolsEvent((event) => {
  switch (event.type) {
    case "signal:create":
      console.log("Created:", event.signal.id);
      break;
    case "signal:change":
      console.log("Changed:", event.signalId, "→", event.value);
      break;
    case "signal:error":
      console.error("Error:", event.signalId, event.error);
      break;
  }
});
```

### Chain Tracking

```tsx
// Enable chain tracking (for Chains tab)
enableChainTracking();

// Get chain reactions
const chains = getChains();

// Clear chains
clearChains();

// Disable
disableChainTracking();
```

### DevTools Panel

```tsx
import { DevToolsPanel } from "rextive/devtools-panel";

function App() {
  return (
    <div>
      <YourApp />
      {process.env.NODE_ENV === "development" && <DevToolsPanel />}
    </div>
  );
}
```

---

## Test (`rextive/test`)

Testing utilities for Rextive.

```tsx
import { mockLogic } from "rextive/test";
```

### `mockLogic(logic)`

Create mock for logic testing:

```tsx
import { mockLogic } from "rextive/test";
import { signal } from "rextive";
import { vi } from "vitest";

const $auth = mockLogic(authLogic);

beforeEach(() => {
  $auth.default({
    user: signal(null),
    isRestoring: signal(false),
    logout: vi.fn(),
    openLoginModal: vi.fn(),
  });
});

afterEach(() => $auth.clear());

it("should show Sign In when not authenticated", () => {
  $auth.provide({ user: signal(null) });
  render(<UserMenu />);
  expect(screen.getByText("Sign In")).toBeInTheDocument();
});

it("should call logout when clicked", () => {
  const mock = $auth.provide({
    user: signal({ id: 1, name: "John" }),
    logout: vi.fn(),
  });
  render(<UserMenu />);
  fireEvent.click(screen.getByTitle("Logout"));
  expect(mock.logout).toHaveBeenCalledTimes(1);
});
```

#### Methods

| Method               | Description                                       |
| -------------------- | ------------------------------------------------- |
| `.default(partial)`  | Set default mock values (merged with overrides)   |
| `.provide(partial?)` | Apply mock to logic registry, returns merged mock |
| `.clear()`           | Clear defaults, overrides, and logic registry     |

---

## Type Utilities

### Signal Types

```tsx
import type {
  AnySignal, // Union of Mutable and Computed
  Mutable, // Mutable signal type
  Computed, // Computed signal type
  Signal, // Base signal type
  SignalMap, // Record<string, AnySignal>
  SignalKind, // "mutable" | "computed" | "any"
} from "rextive";
```

### Logic Types

```tsx
import type {
  Logic, // Logic factory type
  AbstractLogic, // Abstract logic type
  Instance, // Logic instance with dispose
  InferLogic, // Extract type from Logic
  InferInstance, // Extract instance type from Logic
  TestInstance, // For testing (preserves Signal types)
} from "rextive";
```

### Task Types

```tsx
import type {
  Task, // Task<T> = LoadingTask | SuccessTask | ErrorTask
  LoadingTask, // { status: "loading", loading: true, ... }
  SuccessTask, // { status: "success", value: T, ... }
  ErrorTask, // { status: "error", error: unknown, ... }
  TaskStatus, // "loading" | "success" | "error"
} from "rextive";
```

### Path Types

```tsx
import type {
  Path, // Valid dot-notation paths for object
  PathValue, // Value type at path
  PathSetter, // Setter function for nested paths
  PathGetter, // Getter function for nested paths
} from "rextive";
```

### Other Types

```tsx
import type {
  Tag, // Signal tag type
  Plugin, // Plugin function type
  GroupPlugin, // Group plugin type
  SignalContext, // Compute function context
  ComputedSignalContext, // Context with deps
  SignalOptions, // Signal creation options
  EqualsStrategy, // "strict" | "shallow" | "deep"
  Awaitable, // Task | PromiseLike | Signal
} from "rextive";
```

---

## Next Steps

- **[Core Concepts](./CORE_CONCEPTS.md)** - Understand the fundamentals
- **[React Integration](./REACT.md)** - Deep dive into rx(), useScope()
- **[Operators](./OPERATORS.md)** - Full operators reference
- **[Logic](./LOGIC.md)** - Building reusable logic units
- **[Examples](./EXAMPLES.md)** - Real-world examples
