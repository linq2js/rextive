# Rextive API Reference

Complete reference for all Rextive APIs with every overload documented.

## Table of Contents

1. [signal()](#signal)
2. [task namespace](#task)
3. [wait namespace](#wait)
4. [React Hooks](#react-hooks)

---

## signal()

The main function for creating signals - both mutable and computed.

### Overloads

#### 1. `signal()` - Empty signal

```ts
function signal<TValue = unknown>(): MutableSignal<TValue, undefined>
```

Creates a mutable signal with no initial value.
- `get()` returns `TValue | undefined`
- `set()` requires `TValue` (not undefined)

**Example:**
```ts
const user = signal<User>();
user.set({ id: 1, name: "Alice" }); // ✅
// user.set(undefined); // ❌ Type error
```

---

#### 2a. `signal(value)` - Mutable signal with initial value

```ts
function signal<TValue>(
  value: TValue | ((context: SignalContext) => TValue)
): MutableSignal<TValue>
```

Creates a mutable signal with an initial value or lazy initializer.

**Examples:**
```ts
// With direct value
const count = signal(0);
const user = signal({ name: "Alice" });

// With lazy initializer
const expensive = signal(() => heavyComputation());
```

---

#### 2b. `signal(value, equals)` - Mutable signal with equality shortcut

```ts
function signal<TValue>(
  value: TValue | ((context: SignalContext) => TValue),
  equals: "strict" | "shallow" | "deep"
): MutableSignal<TValue>
```

Creates a mutable signal with a string equality shortcut.
- `"strict"` - Object.is (default)
- `"shallow"` - Shallow object/array comparison
- `"deep"` - Deep comparison (lodash isEqual)

⚠️ **Note:** Custom equality functions are not allowed as second argument to avoid ambiguity with computed signals. Use the options form instead.

**Examples:**
```ts
const user = signal({ name: "John" }, "shallow");
const data = signal(complexObj, "deep");
const count = signal(0, "strict");

// For custom equals, use options form:
const custom = signal(0, { equals: (a, b) => Math.abs(a - b) < 0.01 });
```

---

#### 2c. `signal(value, options)` - Mutable signal with options

```ts
function signal<TValue>(
  value: TValue | ((context: SignalContext) => TValue),
  options?: SignalOptions<TValue>
): MutableSignal<TValue>
```

Creates a mutable signal with full options object.

**SignalOptions:**
```ts
{
  equals?: "strict" | "shallow" | "deep" | ((a: T, b: T) => boolean);
  name?: string;
  fallback?: (error: unknown) => T;
  onChange?: (value: T) => void;
  onError?: (error: unknown) => void;
  tags?: readonly Tag<T>[];
  lazy?: boolean;
}
```

**Examples:**
```ts
const count = signal(0, {
  equals: (a, b) => a === b,
  name: "counter",
  onChange: (value) => console.log("Changed:", value)
});
```

---

#### 3a. `signal(deps, compute)` - Computed signal

```ts
function signal<TValue, TDependencies extends SignalMap>(
  dependencies: TDependencies,
  compute: (context: ComputedSignalContext<TDependencies>) => TValue
): ComputedSignal<TValue>
```

Creates a computed signal from dependencies.

**Examples:**
```ts
const count = signal(0);
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

const firstName = signal("John");
const lastName = signal("Doe");
const fullName = signal(
  { firstName, lastName },
  ({ deps }) => `${deps.firstName} ${deps.lastName}`
);
```

---

#### 3b. `signal(deps, compute, equals)` - Computed signal with equality shortcut

```ts
function signal<TValue, TDependencies extends SignalMap>(
  dependencies: TDependencies,
  compute: (context: ComputedSignalContext<TDependencies>) => TValue,
  equals: "strict" | "shallow" | "deep"
): ComputedSignal<TValue>
```

Creates a computed signal with a string equality shortcut.

⚠️ **Note:** Custom equality functions are not allowed as third argument. Use the options form instead.

**Examples:**
```ts
const fullName = signal(
  { firstName, lastName },
  ({ deps }) => ({ full: `${deps.firstName} ${deps.lastName}` }),
  "shallow"
);

// For custom equals, use options form:
const result = signal(
  { a, b },
  ({ deps }) => ({ sum: deps.a + deps.b }),
  { equals: (x, y) => x.sum === y.sum }
);
```

---

#### 3c. `signal(deps, compute, options)` - Computed signal with options

```ts
function signal<TValue, TDependencies extends SignalMap>(
  dependencies: TDependencies,
  compute: (context: ComputedSignalContext<TDependencies>) => TValue,
  options?: SignalOptions<TValue>
): ComputedSignal<TValue>
```

Creates a computed signal with full options object.

**Examples:**
```ts
const doubled = signal({ count }, ({ deps }) => deps.count * 2, {
  name: "doubled",
  equals: (a, b) => a === b,
  fallback: (error) => 0,
  onChange: (value) => console.log("Computed:", value)
});
```

---

### Signal Instance Methods

All signals (both mutable and computed) have these methods:

```ts
interface Signal<TValue> {
  // Getter
  (): TValue;
  get(): TValue;
  
  // Subscription
  on(listener: () => void): () => void;
  
  // Disposal
  dispose(): void;
  
  // Utilities
  toJSON(): TValue;
  displayName?: string;
  
  // Transformations
  map<U>(
    fn: (value: TValue) => U,
    equalsOrOptions?: "strict" | "shallow" | "deep" | SignalOptions<U>
  ): ComputedSignal<U>;
  
  scan<U>(
    fn: (accumulator: U, current: TValue) => U,
    initialValue: U,
    equalsOrOptions?: "strict" | "shallow" | "deep" | SignalOptions<U>
  ): ComputedSignal<U>;
}
```

#### MutableSignal additional methods

```ts
interface MutableSignal<TValue> extends Signal<TValue> {
  // Setters
  set(value: TValue): void;
  set(reducer: (prev: TValue) => TValue): void;
  
  // Utilities
  reset(): void;
  hydrate(value: TValue): void;
}
```

#### ComputedSignal additional methods

```ts
interface ComputedSignal<TValue> extends Signal<TValue> {
  pause(): void;
  resume(): void;
  paused(): boolean;
}
```

---

## task

Namespace for working with task values (loading/success/error states).

### Main Function

#### `task.from(value)` - Normalize to task

```ts
function from<TValue>(value: TValue): Task<T>
```

Converts any value to a Task. Idempotent if already a task.

**Examples:**
```ts
task.from(42);                    // SuccessTask<number>
task.from(Promise.resolve(42));   // LoadingTask<number>
task.from(existingTask);      // Returns as-is
```

---

### Namespace Methods

#### `task.loading(promise)` - Create loading task

```ts
function loading<TValue>(promise: PromiseLike<TValue>): LoadingTask<TValue>
```

**Example:**
```ts
const loading = task.loading(fetch("/api/data"));
```

---

#### `task.success(value, promise?)` - Create success task

```ts
function success<TValue>(
  value: TValue,
  promise?: PromiseLike<TValue>
): SuccessTask<TValue>
```

**Examples:**
```ts
const success = task.success(42);
const withPromise = task.success(42, Promise.resolve(42));
```

---

#### `task.error(error, promise?)` - Create error task

```ts
function error<TValue = any>(
  error: unknown,
  promise?: PromiseLike<TValue>
): ErrorTask<TValue>
```

**Examples:**
```ts
const error = task.error(new Error("Failed"));
const withPromise = task.error<User>(err, userPromise);
```

---

#### `task.get(promise)` - Get or create from promise

```ts
function get<T>(promise: PromiseLike<T>): Task<T>
```

Gets cached task for promise or creates a loading one.

---

#### `task.set(promise, task)` - Associate task with promise

```ts
function set<T, L extends Task<T>>(
  promise: PromiseLike<T>,
  task: L
): L
```

Caches task for a promise.

---

## wait

Namespace for waiting on awaitables (promises, tasks, signals).

### Main Function - `wait()` / `wait.all()`

#### Overload 1: Single awaitable (Suspense mode)

```ts
function wait<T>(awaitable: Awaitable<T>): T
```

Throws promise if loading, returns value when ready.

---

#### Overload 2: Tuple of awaitables (Suspense mode)

```ts
function wait<T extends readonly Awaitable<any>[]>(
  awaitables: T
): { readonly [K in keyof T]: AwaitedFrom<T[K]> }
```

Throws promise if any loading, returns tuple when all ready.

---

#### Overload 3: Record of awaitables (Suspense mode)

```ts
function wait<T extends Record<string, Awaitable<any>>>(
  awaitables: T
): { [K in keyof T]: AwaitedFrom<T[K]> }
```

Throws promise if any loading, returns record when all ready.

---

#### Overload 4: Single awaitable (Promise mode)

```ts
function wait<T, R>(
  awaitable: Awaitable<T>,
  onResolve: (value: T) => R | PromiseLike<R>,
  onError?: (error: unknown) => R | PromiseLike<R>
): Promise<R>
```

Returns promise that resolves with transformed value.

---

#### Overload 5: Tuple of awaitables (Promise mode)

```ts
function wait<T extends readonly Awaitable<any>[], R>(
  awaitables: T,
  onResolve: (...values: AwaitedTuple<T>) => R | PromiseLike<R>,
  onError?: (error: unknown) => R | PromiseLike<R>
): Promise<R>
```

Returns promise that resolves with transformed tuple values.

---

#### Overload 6: Record of awaitables (Promise mode)

```ts
function wait<T extends Record<string, Awaitable<any>>, R>(
  awaitables: T,
  onResolve: (values: AwaitedRecord<T>) => R | PromiseLike<R>,
  onError?: (error: unknown) => R | PromiseLike<R>
): Promise<R>
```

Returns promise that resolves with transformed record values.

---

### `wait.any()` - First to resolve

Similar overloads to `wait()` but returns `[value, key]` tuple for the first resolved awaitable.

---

### `wait.race()` - First to settle

Similar overloads to `wait()` but returns `[value, key]` tuple for the first settled (resolved OR rejected) awaitable.

---

### `wait.settled()` - All settled

#### Overload 1: Suspense mode

```ts
function settled<T>(
  awaitables: Record<string, Awaitable<any>> | readonly Awaitable<any>[]
): PromiseSettledResult<T>[] | Record<string, PromiseSettledResult<any>>
```

Throws promise if loading. Returns settled results when all complete (never throws errors).

---

#### Overload 2: Promise mode

```ts
function settled<T, R>(
  awaitables: Record<string, Awaitable<any>> | readonly Awaitable<any>[],
  onSettled: (results: SettledResults<T>) => R | PromiseLike<R>
): Promise<R>
```

Returns promise that resolves with transformed settled results.

---

### `wait.timeout()` - With timeout

```ts
function timeout<T>(
  awaitable: Awaitable<T> | Record<string, Awaitable<any>> | readonly Awaitable<any>[],
  ms: number
): Promise<T | AwaitedTuple<any> | AwaitedRecord<any>>
```

Rejects if not resolved within timeout.

---

### `wait.delay()` - Simple delay

```ts
function delay(ms: number): Promise<void>
```

Returns promise that resolves after delay.

---

## React Hooks

### `useScope()` - Unified lifecycle and scoped state

#### Overload 1: Component lifecycle

```ts
function useScope(
  options: {
    init?: () => void;
    mount?: () => void;
    render?: () => void;
    cleanup?: () => void;
    dispose?: () => void;
  }
): () => LifecyclePhase
```

**Example:**
```ts
const getPhase = useScope({
  init: () => console.log('Initializing'),
  mount: () => console.log('Mounted'),
  dispose: () => console.log('Disposed')
});

console.log(getPhase()); // "render" | "mount" | "cleanup" | "disposed"
```

---

#### Overload 2: Object lifecycle

```ts
function useScope<TTarget>(
  options: {
    for: TTarget;
    init?: (target: TTarget) => void;
    mount?: (target: TTarget) => void;
    render?: (target: TTarget) => void;
    cleanup?: (target: TTarget) => void;
    dispose?: (target: TTarget) => void;
  }
): () => LifecyclePhase
```

**Example:**
```ts
const user = { id: 1, name: "Alice" };

const getPhase = useScope({
  for: user,
  init: (u) => console.log('User activated:', u),
  mount: (u) => startTracking(u),
  dispose: (u) => stopTracking(u)
});
```

---

#### Overload 3: Factory mode

```ts
function useScope<TScope>(
  create: () => ExDisposable & TScope,
  options?: {
    init?: (scope: TScope) => void;      // Called when scope is created
    mount?: (scope: TScope) => void;     // Called after scope is mounted (alias: ready)
    ready?: (scope: TScope) => void;     // Alias for mount
    update?: ((scope: TScope) => void) | [(scope: TScope) => void, ...deps]; // After render
    cleanup?: (scope: TScope) => void;   // During cleanup phase
    dispose?: (scope: TScope) => void;   // When scope is being disposed
    watch?: unknown[];                    // Recreate when deps change
  }
): Omit<TScope, "dispose">
```

**Examples:**
```ts
// Basic factory
const { count, doubled } = useScope(() => {
  const count = signal(0);
  const doubled = signal({ count }, ({ deps }) => deps.count * 2);
  return { count, doubled, dispose: [count, doubled] };
});

// With watch (recreates when userId changes)
const { userData } = useScope(
  () => ({
    userData: signal(fetchUser(userId)),
    dispose: [userData]
  }),
  { watch: [userId] }
);

// With lifecycle callbacks
const { store } = useScope(
  () => createStore(),
  {
    init: (store) => console.log('Store created', store),
    mount: (store) => store.connect(),
    update: (store) => store.sync(), // Called after every render
    cleanup: (store) => store.disconnect(),
    dispose: (store) => store.destroy()
  }
);

// Update with deps - only runs when deps change
const { query } = useScope(
  () => createQuery(),
  {
    update: [(scope) => scope.refresh(), userId, filter] // Only when userId or filter changes
  }
);
```

---

#### Overload 4: Factory with args

```ts
function useScope<TScope, TArgs extends any[]>(
  create: (...args: TArgs) => ExDisposable & TScope,
  args: TArgs,
  options?: Omit<UseScopeOptions<TScope>, "watch">
): TScope
```

**Example:**
```ts
// Type-safe: args match factory params & become watch deps
const { userData } = useScope(
  (userId, filter) => {
    const userData = signal(fetchUser(userId, filter));
    return { userData };
  },
  [userId, filter] // Args passed to factory & used as watch deps
);
```

---

#### Overload 5: Proxy mode (on-demand signal creation)

```ts
function useScope<T extends Record<string, unknown>>(): SignalProxy<T>

type SignalProxy<T> = {
  [K in keyof T]: Mutable<T[K], T[K] | undefined>;
};
```

Creates signals lazily on first property access. Useful for action state tracking patterns.

**Example:**
```ts
// Define signal types via type parameter
const proxy = useScope<{
  submitState: Promise<SubmitResult>;
  searchState: Promise<SearchResult>;
}>();

// Signals created on first access (returns Mutable<T, T | undefined>)
proxy.submitState.set(promise);  // Creates empty signal, then sets value
proxy.submitState();             // Returns undefined initially

// Use with rx() for reactive rendering
{rx(() => {
  const state = task.from(proxy.submitState());
  return state?.loading ? <Spinner /> : <Content />;
})}

// ~40% less boilerplate than explicit signal creation:
// Before: const { submitState } = useScope(() => ({ submitState: signal<Promise<SubmitResult>>() }));
// After:  const proxy = useScope<{ submitState: Promise<SubmitResult> }>();
```

---

### Other React Hooks

- `useWatch(signals)` - Subscribe to signals and track changes
- `useStable()` - Dynamic stable value getter for callbacks and objects
- `rx()` - Reactive rendering helper
- And more...

---

## Type Shortcuts Reference

### Equality Strategies

- `"strict"` - Object.is (default, strict equality)
- `"shallow"` - Shallow comparison (object keys/array elements)
- `"deep"` - Deep comparison (lodash isEqual)

### When to Use String Shortcuts vs Options

**Use string shortcuts** (second/third argument):
```ts
signal(value, "shallow")
signal(deps, fn, "deep")
count.map(x => x * 2, "strict")
```

**Use options object** for:
- Custom equality functions
- Additional options (name, fallback, callbacks, etc.)

```ts
signal(value, { equals: (a, b) => a.id === b.id })
signal(deps, fn, { equals: 'shallow', name: 'computed' })
count.map(x => x * 2, { equals: (a, b) => a === b, name: 'mapped' })
```

---

## Summary Table

| API | Overloads | Notes |
|-----|-----------|-------|
| `signal()` | 6 overloads | Mutable (3) + Computed (3) |
| `task` | 1 main + 6 namespace methods | Namespace pattern |
| `wait()` | 6 main overloads | Suspense + Promise modes |
| `wait.*` | Each has multiple overloads | any, race, settled, timeout, delay |
| `useScope()` | 5 overloads | Component, Object, Factory, Args, Proxy modes |

---

For more examples and guides, see the main [README.md](../README.md).

