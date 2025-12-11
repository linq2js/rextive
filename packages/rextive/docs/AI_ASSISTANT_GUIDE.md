# Rextive AI Assistant Guide

> **This guide complements `.cursor/rules/rextive-rules.mdc`** which contains the complete API reference.
> This file focuses on **patterns, comparisons, and decision guides** for complex scenarios.

## Table of Contents

1. [How to Use This Documentation](#how-to-use-this-documentation)
2. [Reactive Data Patterns](#reactive-data-patterns)
3. [Logic Export Patterns](#logic-export-patterns)
4. [Component Effects Pattern](#component-effects-pattern)
5. [Common Patterns](#common-patterns)
6. [Best Practices & Common Mistakes](#best-practices--common-mistakes)
7. [TypeScript Tips](#typescript-tips)
8. [Migration Guides](#migration-guides)
9. [Debugging Tips](#debugging-tips)

---

## How to Use This Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `.cursor/rules/rextive-rules.mdc` | API reference, syntax, critical rules | Quick lookups, "how to do X" |
| This file (`AI_ASSISTANT_GUIDE.md`) | Patterns, comparisons, decisions | "Which approach should I use?", "Why isn't this working?" |

---

## Reactive Data Patterns

In reality, we usually need to compute data from other data sources. Rextive provides three approaches with different characteristics:

1. **Computed Signals** - Declarative derived data
2. **Effect-like Signals** - Side effects that update mutable signals
3. **`.on()` Subscriptions** - Manual dependency listening

### Computed Signals

Computed signals derive new values from dependencies. Consumer handles loading/error states.

```tsx
// Sync computed
const fullName = signal(
  { firstName, lastName },
  ({ deps }) => `${deps.firstName} ${deps.lastName}`
);

// Async computed
const userData = signal(
  { userId },
  async ({ deps, abortSignal }) => {
    const res = await fetch(`/api/users/${deps.userId}`, { signal: abortSignal });
    return res.json();
  }
);
```

**Characteristics:**

| Aspect | Description |
|--------|-------------|
| **Dependencies** | Multiple, declared explicitly |
| **Return type** | Any type - sync or async (Promise) |
| **Initial value** | None - consumer must handle loading/error |
| **Error handling** | Consumer-side via `task.from()` or try-catch |
| **Cleanup** | Automatic when signal disposed |

**Consumer patterns for async computed:**

```tsx
// Pattern 1: task.from() - always returns task object
const { loading, error, value } = task.from(userData());

// Pattern 2: wait() in rx() - Suspense-like
rx(() => {
  const user = wait(userData());  // Throws if loading
  return <div>{user.name}</div>;
});

// Pattern 3: pipe(task) - stale-while-revalidate
const userTask = userData.pipe(task({ name: "Guest" }));
const { loading, value } = userTask();  // value ALWAYS defined
```

**When to use computed signals:**
- ✅ Deriving data from other signals
- ✅ Fetching data based on dependencies
- ✅ When consumer needs to control loading/error UI
- ✅ When you need `abortSignal` for cancellation

### Effect-like Signals

Effect-like signals react to dependencies and update mutable signals. They don't return meaningful data - they produce side effects.

```tsx
function dashboardLogic() {
  const $profile = profileLogic();
  
  // Mutable signal to store the result
  const stats = signal<Stats>(initialStats, { name: "dashboard.stats" });

  // Effect-like signal - reacts to profile changes
  signal(
    { profile: $profile.profile },
    ({ deps, safe }) => {
      if (!deps.profile) return;
      
      // Fetch and update the mutable signal
      fetchStats(deps.profile.id).then(data => {
        safe(() => stats.set(data));  // safe() prevents update if disposed
      });
    },
    { lazy: false, name: "dashboard.statsLoader" }
  );

  return { stats };  // Consumer only sees the mutable signal
}
```

**Characteristics:**

| Aspect | Description |
|--------|-------------|
| **Signals needed** | At least 2: mutable (data) + effect (reactor) |
| **Dependencies** | Multiple, declared explicitly |
| **Initial value** | ✅ Yes - set on the mutable signal |
| **Loading/error states** | ❌ Hidden from consumer |
| **Error handling** | Signal owner handles (not consumer) |
| **Cleanup** | Automatic when logic/scope disposed |
| **Context utilities** | `safe()`, `onCleanup()`, `aborted()` available |

**When to use effect-like signals:**
- ✅ When consumer shouldn't see loading states
- ✅ When you want initial/fallback data always available
- ✅ When errors should be handled internally
- ✅ Side effects in response to dependency changes
- ✅ When auto-cleanup on scope disposal is needed

### `.on()` Subscriptions

Direct subscription to a single signal's changes. Lightweight but requires manual cleanup.

```tsx
function authLogic() {
  const token = signal<string | null>(null);
  const user = signal<User | null>(null);

  // Listen to token changes and update user
  token.on(() => {
    const t = token();
    if (t) {
      fetchUser(t).then(u => user.set(u));
    } else {
      user.set(null);
    }
  });

  return { token, user };
}
```

**Characteristics:**

| Aspect | Description |
|--------|-------------|
| **Dependencies** | Single dependency only |
| **Cleanup** | ❌ Must unsubscribe manually |
| **Context utilities** | ❌ No `safe()`, `onCleanup()`, etc. |
| **Memory** | Lighter - no extra signal created |
| **Use case** | Long-lived singletons, simple 1:1 reactions |

**When to use `.on()`:**
- ✅ Long-lived singleton logic (global stores)
- ✅ Simple one-to-one dependency
- ✅ When you need manual control over subscription
- ⚠️ Must remember to unsubscribe to avoid leaks

### Comparison Table

| Aspect | Computed Signal | Effect-like Signal | `.on()` Subscription |
|--------|----------------|-------------------|---------------------|
| **Purpose** | Derive data | Side effects | React to changes |
| **Dependencies** | Multiple | Multiple | Single |
| **Initial value** | ❌ None | ✅ Yes (mutable signal) | N/A |
| **Async support** | ✅ Returns Promise | Via internal fetch | Via callback |
| **Loading state** | ✅ Consumer handles | ❌ Hidden | ❌ Hidden |
| **Error handling** | Consumer | Signal owner | Signal owner |
| **Auto cleanup** | ✅ Yes | ✅ Yes | ❌ Manual |
| **Context utils** | ✅ `safe()`, `onCleanup()` | ✅ `safe()`, `onCleanup()` | ❌ None |
| **Memory overhead** | 1 signal | 2+ signals | None |

### Decision Flowchart

```
Need derived data visible to consumer?
├─ Yes → Computed Signal
│   └─ Consumer handles loading/error with task.from() or wait()
│
└─ No → Need to react to changes and update internal state?
    ├─ Yes → Multiple dependencies or need cleanup?
    │   ├─ Yes → Effect-like Signal
    │   └─ No → .on() Subscription (simpler, but manual cleanup)
    │
    └─ No → Just use computed signal
```

### Quick Decision Guide

| Scenario | Pattern |
|----------|---------|
| Fetch user data when userId changes | **Computed** (consumer shows loading) |
| Update internal cache when data changes | **Effect-like** (consumer sees cached data) |
| Analytics tracking on state changes | **Effect-like** or **`.on()`** |
| Sync localStorage on value change | **`.on()`** (simple, global singleton) |
| Complex multi-step data pipeline | **Effect-like** (intermediate state hidden) |

### Common Mistake: Forgetting to Unsubscribe `.on()`

```tsx
// ❌ BAD - subscription leaks when logic is disposed
function badLogic() {
  const $profile = profileLogic();
  const stats = signal<Stats>(initialStats);

  // This subscription is never cleaned up!
  $profile.profile.on(() => {
    const p = $profile.profile();
    if (p) fetchAndUpdateStats(p.id);  // Will fail after dispose
  });

  return { stats };
}

// ✅ GOOD - use effect-like signal instead
function goodLogic() {
  const $profile = profileLogic();
  const stats = signal<Stats>(initialStats);

  signal(
    { profile: $profile.profile },
    ({ deps, safe }) => {
      if (!deps.profile) return;
      fetchStats(deps.profile.id).then(data => {
        safe(() => stats.set(data));
      });
    },
    { lazy: false, name: "statsLoader" }
  );

  return { stats };
}
```

**Rule of thumb:** For scoped logic (components, `useScope`), prefer effect-like signals. The memory cost is negligible for short-lived scopes, and you get automatic cleanup.

---

## Logic Export Patterns

### Pattern A: Export Signal Only

Export the state signal and let consumers decide how to access fields.

```tsx
// Logic: expose state signal
function formLogic() {
  const state = signal({
    username: "",
    password: "",
    error: "",
  });

  async function submit() { /* ... */ }

  return {
    state,  // Consumer controls read/write
    submit,
  };
}

// Component: use lens inside rx() for fine-grained updates
function LoginForm() {
  const $form = useScope(formLogic);

  return (
    <form onSubmit={$form.submit}>
      {rx(() => {
        const [get, set] = focus.lens($form.state, "username").map(inputValue);
        return <input value={get()} onChange={set} />;
      })}
    </form>
  );
}
```

**When to use:**
- Consumer needs full control over read/write
- State is complex and benefits from `focus.lens()` for partial updates
- Simple API surface

### Pattern B: Export Getters/Setters Only

Export separate functions for controlled access. Easier to mock in tests.

```tsx
// Logic: expose controlled getters/setters
function userLogic() {
  const state = signal({ name: "", email: "" });

  return {
    getName: () => state().name,
    getEmail: () => state().email,
    setName: (v: string) => state.set((s) => ({ ...s, name: v })),
    setEmail: (v: string) => state.set((s) => ({ ...s, email: v })),
    getDisplayName: () => state().name || state().email,
  };
}

// Test: easy to mock
const mockUser = {
  getName: vi.fn(() => "Test User"),
  setName: vi.fn(),
  // ...
};
```

**When to use:**
- Logic needs to validate/transform on read or write
- Better testability with mockable functions
- Want to hide internal state structure

### ❌ Don't Export Lens Tuples

```tsx
// ❌ Bad: Lens tuples are hard to mock
return { username: focus.lens(state, "username") };

// ✅ Good: Export signal (Pattern A) or getters/setters (Pattern B)
```

### Summary

| Pattern | Export | Consumer | Testability | Use Case |
|---------|--------|----------|-------------|----------|
| **A: Signal** | `state` signal | Uses `focus.lens()` | Mock signal | Full control |
| **B: Getters/Setters** | `getFoo`, `setFoo` | Calls functions | Mock functions | Controlled access |
| **❌ Lens** | Lens tuples | Destructure | Hard to mock | **Don't use** |

---

## Component Effects Pattern

**Problem:** Logic should stay pure, but sometimes you need to trigger component-specific side effects (focus input, play sound, animate).

**Solution:** Logic exposes methods that accept callbacks from components.

```tsx
// Logic: Expose component effects
function gameLogic() {
  const gameState = signal<"menu" | "playing">("menu");
  const score = signal(0);

  function onStateChange(listener: (state: string) => void) {
    listener(gameState()); // Immediate call
    return { dispose: gameState.on(() => listener(gameState())) };
  }

  function onScoreIncrease(listener: (score: number) => void) {
    let prevScore = score();
    return {
      dispose: score.on(() => {
        const curr = score();
        if (curr > prevScore) {
          listener(curr);
          prevScore = curr;
        }
      }),
    };
  }

  return {
    gameState,
    score,
    onStateChange,
    onScoreIncrease,
  };
}

// Component: Bind component effects
function GameScreen() {
  const $game = useScope(gameLogic);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playCoin } = useSound();

  // Auto-focus input when playing
  useScope($game.onStateChange, [
    (state) => {
      if (state === "playing") inputRef.current?.focus();
    },
  ]);

  // Play sound on score increase
  useScope($game.onScoreIncrease, [(score) => playCoin()]);

  return (/* ... */);
}
```

**Benefits:**
- Logic stays pure and framework-agnostic
- Component handles DOM/UI concerns
- Auto-cleanup when component unmounts

**When to use:**
- ✅ Auto-focus input
- ✅ Play sounds/animations
- ✅ Show modals/toasts
- ✅ Scroll to element

---

## Common Patterns

### Tuple Setter with Computed Derived Values

Use `.tuple` to get both signal and setter:

```tsx
function settingsLogic() {
  const [difficulty, setDifficulty] = signal<"easy" | "medium" | "hard">("easy").tuple;

  const wordsToComplete = signal(
    { difficulty },
    ({ deps }) =>
      deps.difficulty === "easy" ? 15 : deps.difficulty === "medium" ? 12 : 10
  );

  return {
    difficulty,      // Read-only signal
    setDifficulty,   // Setter function
    wordsToComplete, // Auto-computed
  };
}
```

### Async Action State Pattern

Use `{action}State` naming for signals that track async action state:

```tsx
// Logic-Level (shared across components)
const authLogic = logic("authLogic", () => {
  const loginState = signal<Promise<void>>();
  
  async function login(credentials: Credentials) {
    const promise = authApi.login(credentials);
    loginState.set(promise);
    return promise;
  }

  return { loginState, login };
});

// Component-Level (local to one component)
function ContactForm() {
  const submitState = useScope(() => signal<Promise<void>>());
  
  return rx(() => {
    const state = task.from(submitState());
    return <button disabled={state?.loading}>Send</button>;
  });
}
```

### Query Pattern (React Query-like)

```tsx
function createTodoQuery() {
  const payload = signal<{ userId: number } | null>(null);

  const result = signal({ payload }, async ({ deps, abortSignal }) => {
    if (!deps.payload) return [];
    return fetch(`/todos/${deps.payload.userId}`, { signal: abortSignal });
  });

  return { payload, result };
}
```

### Mutation Pattern

```tsx
function createTodoMutation() {
  const payload = signal<CreateTodoPayload | null>(null);

  const result = signal({ payload }, async ({ deps }) => {
    if (!deps.payload) return null;
    // No abortSignal - mutations should complete
    return fetch("/todos", { method: "POST", body: JSON.stringify(deps.payload) });
});

  return { payload, result };
}
```

---

## Best Practices & Common Mistakes

### ✅ Always Do

1. **Declare dependencies explicitly**
2. **Use `abortSignal` for queries** (not mutations)
3. **Use `useScope` for signals in components**
4. **Use `.to()` for single transforms**
5. **Use `peek()` for internal reads** (operators, event handlers)

### ❌ Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| `signal(() => count() * 2)` | No auto-tracking | Use `signal({ count }, ...)` |
| `signal(Promise.resolve(42))` | Wrong async syntax | Use `signal(async () => 42)` |
| Creating signals in render | Memory leak | Use `useScope` |
| `<input value={rx(signal)} />` | rx() in attributes | Use `rx(() => <input ... />)` |
| Using `abortSignal` in POST | Mutations should complete | Remove `signal: abortSignal` |
| Accessing all signals upfront | Unnecessary subscriptions | Only access what you need |

---

## TypeScript Tips

### Type Inference

```tsx
// Types are inferred automatically
const count = signal(0);                    // Signal<number>
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

---

## Migration Guides

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

---

## Debugging Tips

1. **Check Dependencies**: Make sure all dependencies are explicitly declared
2. **Verify Disposal**: Check `dispose` array includes all signals that need cleanup
3. **Lazy Tracking**: Only accessed signals are tracked - check what's actually used
4. **Abort Signals**: Use for queries, not mutations
5. **Type Errors**: Use explicit types when inference fails
6. **Use `peek()`**: For internal reads that shouldn't create dependencies
7. **Signal Names**: Add `{ name: "..." }` option for easier debugging

---

## Summary

- **Computed signals**: Derive data, consumer handles loading/error
- **Effect-like signals**: Side effects with auto-cleanup, hide loading states
- **`.on()` subscriptions**: Simple reactions, manual cleanup required
- **Pattern A (Signal)**: Full control, use with `focus.lens()`
- **Pattern B (Getters/Setters)**: Controlled access, easy mocking
- **Component effects**: Bridge logic to DOM concerns (focus, sounds, animations)
