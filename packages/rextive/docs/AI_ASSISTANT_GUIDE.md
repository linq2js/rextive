# Rextive AI Assistant Guide

This guide helps AI assistants understand and work with Rextive effectively.

## Core Concepts

### 1. Signal - Reactive Values

Signals are the fundamental reactive primitive. They can be:
- **Sync**: `signal(0)` - simple values
- **Async**: `signal(async () => fetchData())` - promises
- **Derived**: `signal({ deps }, ({ deps }) => compute(deps))` - computed from other signals

**Key Points:**
- Signals declare dependencies explicitly in the first parameter
- Dependencies are always visible in code
- Same signal works for sync and async values
- Signals can be created anywhere (not just in components)

### 2. rx() - Reactive Components

`rx()` creates reactive render functions with two overloads:

**Overload 1: Static/Manual Control**
```tsx
rx(() => <div>Static</div>)
rx(() => <div>{value}</div>, { watch: [value] })
```

**Overload 2: Explicit Signals (Always Reactive)**
```tsx
rx({ user, posts }, (awaited, task) => (
  <div>{awaited.user.name}</div>
))
```

**Key Points:**
- Overload 1: No reactivity by default, use `watch` for manual control
- Overload 2: Always reactive, tracks signals automatically
- Lazy tracking: Only subscribes to signals actually accessed
- Supports Suspense (`awaited`) and manual loading states (`task`)

### 3. useScope - Component-Scoped Disposables

Creates component-scoped signals/disposables with automatic cleanup.

**Key Points:**
- Automatically disposes on unmount
- Can recreate when `watch` dependencies change
- `dispose` property controls what gets cleaned up:
  - `dispose: [signal1, signal2]` - array of disposables
  - `dispose: signal` - single disposable
  - `dispose: () => cleanup()` - cleanup function
  - `dispose() { ... }` - custom dispose method
- Can return non-disposable helpers without them being disposed

### 4. signal.persist - Batch Persistence

Persist multiple signals with centralized load/save operations.

**Key Points:**
- Single state machine: `idle → loading → watching → paused → idle`
- Batch operations for multiple signals
- Control functions: `start()`, `cancel()`, `pause()`, `resume()`
- Waits for load before subscribing (prevents saving initial values)
- Calling site handles debouncing (e.g., with lodash)

## Common Patterns

### Pattern 1: Component-Scoped Signals

```tsx
function Counter() {
  const { count, doubled } = useScope(() => ({
    count: signal(0),
    doubled: signal({ count }, ({ deps }) => deps.count * 2),
    dispose: [count, doubled], // Explicit disposal
  }));

  return rx({ count, doubled }, (awaited) => (
    <div>
      <div>{awaited.count}</div>
      <div>{awaited.doubled}</div>
      <button onClick={() => count.set(count() + 1)}>+</button>
    </div>
  ));
}
```

### Pattern 2: Service Composition

```tsx
const createDataService = () => {
  const cache = signal(new Map());
  const fetcher = signal(async () => fetchData());

  return {
    cache,
    fetcher,
    get(key: string) {
      return cache().get(key);
    },
    async fetch(key: string) {
      const data = await fetcher();
      cache().set(key, data);
      return data;
    },
    dispose: [cache, fetcher], // Dispose signals
  };
};

// Global usage
const dataService = createDataService();

// Component usage (auto-dispose)
function Component() {
  const service = useScope(createDataService);
  // ...
}
```

### Pattern 3: Query Pattern (React Query-like)

```tsx
function createTodoQuery() {
  const payload = signal<{ userId: number } | null>(null);

  const result = signal({ payload }, async ({ deps, abortSignal }) => {
    if (!deps.payload) return [];

    const res = await fetch(`/todos/${deps.payload.userId}`, {
      signal: abortSignal, // Auto-cancel on payload change
    });
    return res.json();
  });

  return {
    payload,
    result,
    dispose: [payload, result],
  };
}
```

### Pattern 4: Mutation Pattern

```tsx
function createTodoMutation() {
  const payload = signal<CreateTodoPayload | null>(null);

  const result = signal({ payload }, async ({ deps }) => {
    if (!deps.payload) return null;

    // No abortSignal - mutations should complete
    const res = await fetch("/todos", {
      method: "POST",
      body: JSON.stringify(deps.payload),
    });
    return res.json();
  });

  return {
    payload,
    result,
    dispose: [payload, result],
  };
}
```

### Pattern 5: Effects with Explicit Triggers

```tsx
const refreshTrigger = signal(0);

const effectResult = signal({ refreshTrigger }, async ({ deps }) => {
  console.log("Effect running...");
  return await doSomething();
});

// Trigger effect
refreshTrigger.set(refreshTrigger() + 1);
```

### Pattern 6: Batch Persistence with localStorage

```tsx
import { debounce } from 'lodash-es';

const { signals, pause, resume } = signal.persist(
  { count: signal(0), name: signal("") },
  {
    load: () => {
      const stored = localStorage.getItem("app-state");
      return stored ? JSON.parse(stored) : {};
    },
    save: debounce((values) => {
      localStorage.setItem("app-state", JSON.stringify(values));
    }, 300),
    onError: (error, type) => {
      console.error(`Failed to ${type}:`, error);
    }
  }
);

// Pause during bulk operations
pause();
signals.count.set(100);
signals.name.set("John");
resume(); // Saves latest state immediately
```

### Pattern 7: Conditional Persistence

```tsx
const { signals, start } = signal.persist(
  { user: signal(null), settings: signal({}) },
  {
    autoStart: false, // Don't start automatically
    load: () => JSON.parse(localStorage.getItem("user-state") || "{}"),
    save: (values) => localStorage.setItem("user-state", JSON.stringify(values))
  }
);

// Start persistence only when user is logged in
if (isLoggedIn) {
  start();
}
```

### Pattern 8: Conditional Rendering with Suspense

```tsx
function Component() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {rx({ cloudValue }, (awaited) => {
        // If cloudValue is promise, throws and waits
        // Once resolved, check happens
        if (!awaited.cloudValue) {
          return <Comp1 />;
        }
        return <Other value={awaited.cloudValue} />;
      })}
    </Suspense>
  );
}
```

## API Reference Quick Guide

### signal

```tsx
// Create
const count = signal(0);

// Read (triggers tracking)
count(); // 0
count.get(); // 0

// Read WITHOUT tracking (use in event handlers, internal code)
count.peek(); // 0 - does NOT create reactive dependencies

// Update
count.set(1);

// Derived
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

// Async
const data = signal(async () => fetchData());

// Subscribe
const unsubscribe = count.on(() => console.log("changed"));

// Dispose
count.dispose();
```

### peek() vs get()

```tsx
// get() / signal() - triggers tracking in reactive contexts
rx(() => {
  console.log(count()); // Creates dependency, re-renders on change
});

// peek() - never triggers tracking
rx(() => {
  console.log(count.peek()); // No dependency, won't re-render
});

// Use peek() in event handlers to avoid unwanted dependencies
const handleClick = () => {
  const value = count.peek(); // Safe - no tracking
  console.log("Clicked with count:", value);
};

// Use peek() in operators/plugins for internal reads
const myOperator = (source) => {
  const initialValue = source.peek(); // Internal read, no tracking
  // ...
};
```

### rx

```tsx
// Static
rx(() => <div>Static</div>);

// With watch
rx(() => <div>{value}</div>, { watch: [value] });

// With signals
rx({ user, posts }, (awaited, task) => (
  <div>
    <div>{awaited.user.name}</div>
    {task.posts.status === "loading" && <Spinner />}
  </div>
));
```

### useScope

```tsx
// Factory mode with all options
const scope = useScope(
  () => ({
    signal1: signal(0),
    signal2: signal(1),
    helper: () => {}, // Not disposed
    dispose: [signal1, signal2], // Explicit disposal
  }),
  {
    // Lifecycle callbacks
    init: (scope) => {},      // Called when scope is created
    mount: (scope) => {},     // Called after scope is mounted (alias: ready)
    update: (scope) => {},    // Called after every render
    cleanup: (scope) => {},   // Called during cleanup phase
    dispose: (scope) => {},   // Called when scope is being disposed
    
    // Dependencies
    watch: [userId],          // Recreate when userId changes
  }
);

// Update with deps - only runs when deps change
useScope(() => createScope(), {
  update: [(scope) => scope.signal1.set(value), value],
});

// Factory with args (type-safe, args become watch deps)
const { userData } = useScope(
  (userId, filter) => createUserScope(userId, filter),
  [userId, filter]
);
```

### useAwaited

```tsx
const user = signal(async () => fetchUser());
const posts = signal(async () => fetchPosts());

const awaited = useAwaited({ user, posts });
// awaited.user throws promise if loading
// awaited.posts throws promise if loading
```

### useTask

```tsx
const data = signal(async () => fetchData());

const task = useTask({ data });
// task.data.status: "loading" | "success" | "error"
// task.data.value: T (if success)
// task.data.error: unknown (if error)
```

### signal.persist

```tsx
import { debounce } from 'lodash-es';

const { signals, pause, resume, status } = signal.persist(
  { count: signal(0), name: signal("") },
  {
    load: () => JSON.parse(localStorage.getItem("state") || "{}"),
    save: debounce((values) => {
      localStorage.setItem("state", JSON.stringify(values));
    }, 300),
    onError: (error, type) => console.error(error),
    autoStart: true, // default - start immediately
  }
);

// Status: 'idle' | 'loading' | 'watching' | 'paused'
console.log(status()); // 'watching'

// Control
pause(); // Pause saving
resume(); // Resume and save latest state
cancel(); // Stop all persistence
start(); // Restart persistence
```

## Best Practices

### 1. Explicit Dependencies

✅ **Good:**
```tsx
const doubled = signal({ count }, ({ deps }) => deps.count * 2);
```

❌ **Bad:**
```tsx
// Don't try to auto-track - dependencies must be explicit
const doubled = signal(() => count() * 2); // Won't work
```

### 1.5. Use peek() for Internal Reads

When writing operators, plugins, or internal code that reads signals without wanting to create reactive dependencies:

✅ **Good:**
```tsx
// Internal reads use peek()
const myOperator = (source) => {
  const initialValue = source.peek(); // No tracking
  return signal(initialValue);
};

// Event handlers use peek()
const handleSubmit = () => {
  const formValue = formSignal.peek(); // No accidental dependencies
  submitForm(formValue);
};
```

❌ **Bad:**
```tsx
// Calling source() in operators may create unwanted dependencies
const myOperator = (source) => {
  const initialValue = source(); // May trigger tracking!
  return signal(initialValue);
};
```

### 2. Lazy Tracking

✅ **Good:**
```tsx
rx({ user, posts, comments }, (awaited) => {
  // Only accesses user - only user is tracked
  return <div>{awaited.user.name}</div>;
});
```

❌ **Bad:**
```tsx
// Don't access all signals upfront if not needed
const user = awaited.user;
const posts = awaited.posts; // Unnecessary subscription
const comments = awaited.comments; // Unnecessary subscription
```

### 3. Disposal Control

✅ **Good:**
```tsx
useScope(() => ({
  signal: signal(0),
  helper: () => {}, // Not disposed
  dispose: [signal], // Explicit
}));
```

❌ **Bad:**
```tsx
// Don't rely on automatic disposal of all properties
useScope(() => ({
  signal: signal(0),
  helper: () => {}, // Would be disposed if we auto-disposed all
}));
```

### 4. Async Patterns

✅ **Good - Query (with abortSignal):**
```tsx
signal({ payload }, async ({ deps, abortSignal }) => {
  return fetch(`/api?q=${deps.payload}`, { signal: abortSignal });
});
```

✅ **Good - Mutation (without abortSignal):**
```tsx
signal({ payload }, async ({ deps }) => {
  return fetch("/api", {
    method: "POST",
    body: JSON.stringify(deps.payload),
    // No abortSignal - mutations should complete
  });
});
```

### 5. Service Composition

✅ **Good:**
```tsx
const createService = () => {
  const service1 = createService1();
  const service2 = createService2();

  return {
    service1,
    service2,
    dispose() {
      service1.dispose();
      service2.dispose();
    },
    // or
    // dispose: [service1, service2],
  };
};

// Works globally
const service = createService();

// Works with useScope (auto-dispose)
const service = useScope(createService);
```

## Common Mistakes to Avoid

### 1. ❌ Forgetting Explicit Dependencies

```tsx
// Wrong - dependencies not declared
const doubled = signal(() => count() * 2);

// Correct
const doubled = signal({ count }, ({ deps }) => deps.count * 2);
```

### 2. ❌ Using PromiseLike in signal (should use signal.async)

```tsx
// Wrong - signal doesn't accept PromiseLike directly
const data = signal(Promise.resolve(42));

// Correct - use async function
const data = signal(async () => 42);
```

### 3. ❌ Not Using dispose Array

```tsx
// Wrong - helper functions would be disposed
useScope(() => ({
  count: signal(0),
  increment: () => count.set(count() + 1),
}));

// Correct - explicit disposal
useScope(() => ({
  count: signal(0),
  increment: () => count.set(count() + 1),
  dispose: [count],
}));
```

### 4. ❌ Using abortSignal in Mutations

```tsx
// Wrong - mutations shouldn't be cancelled
signal({ payload }, async ({ deps, abortSignal }) => {
  return fetch("/api", { method: "POST", signal: abortSignal });
});

// Correct - no abortSignal for mutations
signal({ payload }, async ({ deps }) => {
  return fetch("/api", { method: "POST" });
});
```

### 5. ❌ Accessing All Signals Upfront

```tsx
// Wrong - subscribes to all signals even if not used
rx({ a, b, c }, (awaited) => {
  const aVal = awaited.a;
  const bVal = awaited.b;
  const cVal = awaited.c;
  return <div>{aVal}</div>; // Only a is used
});

// Correct - only access what you need
rx({ a, b, c }, (awaited) => {
  return <div>{awaited.a}</div>; // Only a is subscribed
});
```

## TypeScript Tips

### Type Inference

```tsx
// Types are inferred automatically
const count = signal(0); // Signal<number>
const user = signal(async () => fetchUser()); // Signal<Promise<User>>

// Explicit types when needed
const data = signal<User | null>(null);
```

### Scope Types

```tsx
// Type is inferred from return value
const scope = useScope(() => ({
  count: signal(0),
  name: signal(""),
}));
// scope.count: Signal<number>
// scope.name: Signal<string>
```

## Performance Considerations

1. **Lazy Tracking**: Only subscribes to accessed signals
2. **Reference Stability**: Uses shallow comparison for dependency arrays
3. **Memoization**: `rx` components are memoized
4. **Abort Signals**: Automatically cancels previous requests when dependencies change

## When to Use What

- **`signal`**: For reactive values (sync or async)
- **`signal.persist`**: For batch persistence of multiple signals
- **`rx`**: For reactive rendering in components
- **`useScope`**: For component-scoped signals with cleanup
- **`useAwaited`**: For Suspense integration (usually use `rx` instead)
- **`useTask`**: For manual loading states (usually use `rx` instead)

## Migration from Other Libraries

### From React useState

```tsx
// Before
const [count, setCount] = useState(0);
const doubled = useMemo(() => count * 2, [count]);

// After
const count = signal(0);
const doubled = signal({ count }, ({ deps }) => deps.count * 2);
```

### From Zustand

```tsx
// Before
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// After
const count = signal(0);
// count.set(count() + 1)
```

### From React Query

```tsx
// Before
const { data } = useQuery({
  queryKey: ["todos", userId],
  queryFn: () => fetchTodos(userId),
});

// After
const userId = signal(1);
const todos = signal({ userId }, async ({ deps, abortSignal }) => {
  return fetch(`/todos/${deps.userId}`, { signal: abortSignal });
});
```

## Debugging Tips

1. **Check Dependencies**: Make sure all dependencies are explicitly declared
2. **Verify Disposal**: Check `dispose` array includes all signals that need cleanup
3. **Lazy Tracking**: Only accessed signals are tracked - check what's actually used
4. **Abort Signals**: Use for queries, not mutations
5. **Type Errors**: Use explicit types when inference fails

## Summary

- **Explicit Dependencies**: Always declare dependencies in signal creation
- **Lazy Tracking**: Only subscribes to what you access
- **Disposal Control**: Use `dispose` property to control cleanup
- **Unified API**: Same `signal` for sync and async
- **Component Scoping**: Use `useScope` for component-local state
- **Service Pattern**: Works globally and with `useScope` for auto-cleanup
- **Use `peek()` for Internal Reads**: Operators, plugins, and event handlers should use `peek()` to avoid creating unwanted dependencies

