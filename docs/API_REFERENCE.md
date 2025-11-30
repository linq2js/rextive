# API Reference

Complete API documentation for Rextive.

---

## `signal()`

The core primitive for creating reactive state.

### Mutable Signals

```tsx
// Empty signal (undefined)
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

### Computed Signals

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

### Equality Options

| Option | Description | Use For |
|--------|-------------|---------|
| `"strict"` (default) | Reference equality (`Object.is`) | Primitives |
| `"shallow"` | One level deep comparison | Simple objects |
| `"deep"` | Recursive comparison | Nested objects |
| Custom function | `(a, b) => boolean` | Custom logic |

---

## Signal Instance Methods

### `.get()` / `signal()`

Read the current value:

```tsx
const value = count.get();
const value = count(); // Shorthand
```

### `.set(value)` / `.set(fn)`

Update value (mutable signals only):

```tsx
count.set(5);
count.set((prev) => prev + 1);
```

### `.reset()`

Reset to initial value (mutable signals only):

```tsx
count.reset();
```

### `.on(callback)`

Subscribe to changes:

```tsx
const unsubscribe = count.on(() => {
  console.log("Count changed:", count());
});

// Cleanup
unsubscribe();
```

### `.to(selector, equals?)`

Transform signal value:

```tsx
const doubled = count.to((x) => x * 2);
const userName = user.to((u) => u.name, "shallow");
```

### `.pipe(...operators)`

Chain operators:

```tsx
import { to, filter, scan } from "rextive/op";

const result = count.pipe(
  filter((x) => x > 0),
  to((x) => x * 2),
  scan((acc, x) => acc + x, 0)
);
```

### `.refresh()`

Force immediate recomputation:

```tsx
userData.refresh();
```

### `.stale()`

Mark for lazy recomputation:

```tsx
userData.stale(); // Will recompute on next access
```

### `.pause()` / `.resume()` / `.paused()`

Control computed signals:

```tsx
computed.pause();    // Stop recomputing
computed.resume();   // Resume
computed.paused();   // Check status
```

### `.dispose()`

Cleanup signal:

```tsx
signal.dispose();
```

### `.error()` / `.tryGet()`

Safe error access:

```tsx
const error = signal.error();    // Get error without throwing
const value = signal.tryGet();   // Get value or undefined
```

---

## Compute Function Context

For computed signals, the compute function receives a context object:

### Properties

```tsx
signal({ userId, filter }, (context) => {
  context.deps        // Dependency values
  context.abortSignal // AbortSignal for cancellation
});
```

### Methods

```tsx
signal(async (context) => {
  // Safe execution (throws if aborted)
  const data = context.safe(() => processData());
  
  // Safe promise (never resolves if aborted)
  await context.safe(wait.delay(300));
  
  // Register cleanup
  context.onCleanup(() => cleanup());
  
  // Check if aborted
  if (context.aborted()) return null;
  
  // Reuse logic with context
  const result = await context.use(fetchUser, options);
  
  // Trigger recomputation (polling)
  setTimeout(() => context.refresh(), 1000);
  
  // Mark stale (TTL cache)
  setTimeout(() => context.stale(), 5 * 60 * 1000);
});
```

---

## Static Methods

### `signal.batch(fn)`

Batch multiple updates:

```tsx
signal.batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
  email.set("jane@example.com");
});
// Only ONE notification
```

### `signal.on(signals, callback)`

Subscribe to multiple signals:

```tsx
const control = signal.on([count, name], (trigger) => {
  console.log("Changed:", trigger());
});

control.pause();   // Pause
control.resume();  // Resume
control.dispose(); // Cleanup
```

### `signal.tag()`

Create a tag for grouping:

```tsx
const formTag = signal.tag();

const name = signal("", { use: [formTag] });
const email = signal("", { use: [formTag] });

formTag.forEach((s) => s.reset()); // Reset all
formTag.map((s) => s.get());       // Collect values
formTag.size;                       // Count
```

#### Tag Batch Methods

Perform operations on all signals in a tag:

```tsx
const dataTag = signal.tag();

// Force recomputation on all signals
dataTag.refreshAll();

// Reset all mutable signals to initial values
dataTag.resetAll();

// Mark all computed signals as stale (lazy recompute)
dataTag.staleAll();

// Dispose all signals (destructive!)
dataTag.disposeAll();
```

| Method | Description | Affects |
|--------|-------------|---------|
| `refreshAll()` | Force immediate recomputation | All signals |
| `resetAll()` | Reset to initial values | Mutable signals only |
| `staleAll()` | Mark for lazy recompute | Computed signals only |
| `disposeAll()` | Dispose all signals | All signals |

### `signal.from(signals)`

Combine signals:

```tsx
// Record form
const user = signal.from({ name, age });
console.log(user()); // { name: "...", age: ... }

// Tuple form
const coords = signal.from([x, y]);
console.log(coords()); // [10, 20]
```

### `signal.trace(error)`

Get error trace through signal chain:

```tsx
try {
  dashboard();
} catch (error) {
  const traces = signal.trace(error);
  // [{ signal: "db", when: "compute:initial" }, ...]
}
```

### `signal.is(value, kind?)`

Check signal type:

```tsx
signal.is(maybeSignal);           // Is any signal?
signal.is(sig, "mutable");        // Is mutable?
signal.is(sig, "computed");       // Is computed?
```

---

## React Integration

### `rx()`

Reactive rendering:

```tsx
// Single signal
{rx(count)}

// With selector
{rx(user, "name")}
{rx(user, u => u.name)}

// Reactive function
{rx(() => <div>{count()}</div>)}

// Component form
{rx(Component, { prop: signal })}
{rx("div", { children: count })}
```

### `useScope()`

Component-scoped signals:

```tsx
// Factory mode
const { count } = useScope(() => ({
  count: signal(0),
  dispose: [count],
}));

// Lifecycle mode
useScope({
  init: () => console.log("Before render"),
  mount: () => console.log("After paint"),
  dispose: () => console.log("True unmount"),
});

// With watch
useScope(() => createQuery(), { watch: [userId] });
```

### `provider()`

React context with signals:

```tsx
const ThemeContext = provider({
  theme: signal("dark"),
  toggleTheme: () => { /* ... */ },
});

// Provide
<ThemeContext.Provider value={/* optional override */}>
  {children}
</ThemeContext.Provider>

// Consume
const { theme } = ThemeContext.use();
```

---

## Async Utilities

### `wait()` / `wait.all()`

Wait for all promises:

```tsx
// Suspense mode (throws for Suspense)
const value = wait(promise);
const [a, b] = wait([p1, p2]);
const { user, posts } = wait({ user: p1, posts: p2 });

// Promise mode
await wait(promise, (value) => processValue(value));
await wait([p1, p2], (a, b) => combine(a, b));
```

### `wait.any()`

First to resolve:

```tsx
const [value, key] = wait.any({ fast, slow });
```

### `wait.race()`

First to settle:

```tsx
const [value, key] = wait.race({ p1, p2 });
```

### `wait.settled()`

All settled (never throws):

```tsx
const results = wait.settled([p1, p2, p3]);
```

### `wait.timeout()`

With timeout:

```tsx
const data = await wait.timeout(fetchData(), 5000);
```

### `wait.delay()`

Simple delay:

```tsx
await wait.delay(1000);
```

### `loadable()`

Manual loading states:

```tsx
const state = loadable(promise);

state.status;   // "loading" | "success" | "error"
state.loading;  // boolean
state.value;    // resolved value
state.error;    // error if rejected
```

---

## Type Utilities

### `AnySignal<T>`

Union of mutable and computed signals:

```tsx
function watchSignal<T>(s: AnySignal<T>) {
  s.on(() => console.log(s()));
}
```

### `Mutable<T>`

Mutable signal type:

```tsx
const count: Mutable<number> = signal(0);
```

### `Computed<T>`

Computed signal type:

```tsx
const doubled: Computed<number> = signal({ count }, ...);
```

---

## Utilities

### `disposable(obj)`

Create disposable from object:

```tsx
const scope = disposable({
  count: signal(0),
  doubled: count.to(x => x * 2),
});
// Automatically adds dispose array
```

### `awaited(...selectors)`

Transform async values:

```tsx
const titles = todoList.to(
  awaited(
    (todos) => todos.filter(t => !t.done),
    (todos) => todos.map(t => t.title)
  )
);
```

### `compose(...fns)`

Function composition (right to left):

```tsx
const pipeline = compose(format, double, add);
```

### `pipe(initial, ...fns)`

Pipeline (left to right):

```tsx
const result = pipe(5, add1, multiply2, toString);
```

### `emitter()`

Event emitter:

```tsx
const events = emitter<string>();
events.on((value) => console.log(value));
events.emit("hello");
events.dispose();
```

---

## Next Steps

- **[React Integration](./REACT.md)** - Deep dive into rx(), useScope()
- **[Operators](./OPERATORS.md)** - Full operators reference
- **[Examples](./EXAMPLES.md)** - Real-world examples


