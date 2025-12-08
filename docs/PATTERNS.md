# Advanced Patterns

## Pattern 1: Chain Multiple Transformations

For complex transformations, chain multiple operators together:

```tsx
import { signal } from "rextive";
import { to, filter, scan } from "rextive/op";

const count = signal(1);

// Chain multiple operators (executed left-to-right)
const result = count.pipe(
  filter((x) => x > 0),     // Step 1: Only positive numbers
  to((x) => x * 2),          // Step 2: Double the value
  scan((acc, x) => acc + x, 0) // Step 3: Running sum
);

count.set(5);  // result = 10 (5 * 2)
count.set(3);  // result = 16 (10 + 3 * 2)
count.set(-1); // result = 16 (filtered out)
count.set(2);  // result = 20 (16 + 2 * 2)
```

### Create Reusable Operator Pipelines

```tsx
import { to, filter, scan } from "rextive/op";

// Define reusable operators
const positiveOnly = filter((x: number) => x > 0);
const double = to((x: number) => x * 2);
const runningSum = scan((acc: number, x: number) => acc + x, 0);

// Apply to multiple signals
const result1 = signal1.pipe(positiveOnly, double, runningSum);
const result2 = signal2.pipe(positiveOnly, double, runningSum);
```

---

## Pattern 2: Group Signals with Tags

Tags let you group related signals and perform batch operations:

```tsx
import { signal } from "rextive";

// Create a tag to group form signals
const formTag = signal.tag();

// Create signals with the tag
const name = signal("", { use: [formTag] });
const email = signal("", { use: [formTag] });
const message = signal("", { use: [formTag] });

// Batch operations (preferred)
formTag.resetAll();       // Reset all form fields
formTag.refreshAll();     // Force recomputation on all
formTag.disposeAll();     // Cleanup all signals

// Manual iteration (for custom logic)
formTag.forEach((s) => s.reset());
formTag.map((s) => s.get());  // Collect all values

// Get count of signals
console.log(`Form has ${formTag.size} fields`);
```

### Type-Safe Tags

```tsx
import { tag } from "rextive";

// General tag - accepts both mutable and computed signals
const mixedTag = tag<number>();

// Mutable-only tag
const stateTag = tag<number, "mutable">();

// Computed-only tag  
const viewTag = tag<number, "computed">();

const count = signal(0, { use: [stateTag] }); // ✅
const doubled = signal({ count }, ({ deps }) => deps.count * 2, {
  use: [viewTag], // ✅
});
```

---

## Pattern 3: Plugins - Extend Signal Behavior

Plugins let you extend signal behavior with reusable logic:

```tsx
import { signal } from "rextive";
import type { Plugin } from "rextive";

// Logger plugin
const logger: Plugin<number> = (sig) => {
  const name = sig.displayName || "unnamed";
  console.log(`[${name}] created: ${sig()}`);

  return sig.on(() => {
    console.log(`[${name}] changed: ${sig()}`);
  });
};

const count = signal(0, { name: "count", use: [logger] });
```

### Built-in Plugins

**Persistor - Auto-save to localStorage:**

```tsx
import { persistor } from "rextive/plugins";

const persist = persistor({
  load: () => JSON.parse(localStorage.getItem("app") || "{}"),
  save: (args) => {
    const existing = JSON.parse(localStorage.getItem("app") || "{}");
    localStorage.setItem("app", JSON.stringify({ ...existing, ...args.values }));
  },
});

const theme = signal("dark", { use: [persist("theme")] });
```

**When - React to other signals:**

```tsx
import { when } from "rextive/plugins";

const refreshTrigger = signal(0);
const userData = signal(async () => fetchUser(), {
  use: [when(refreshTrigger, (sig) => sig.refresh())],
});

// Trigger refresh
refreshTrigger.set((n) => n + 1);
```

### Tags vs Plugins

| Feature | Tag | Plugin |
|---------|-----|--------|
| **Purpose** | Group signals | Extend behavior |
| **Iteration** | `forEach`, `map`, `size` | No iteration |
| **Batch ops** | `refreshAll`, `resetAll`, `staleAll`, `disposeAll` | N/A |
| **Lifecycle** | `onAdd`, `onDelete` | Cleanup function |

---

## Pattern 4: Generic Functions with `AnySignal`

Write functions that work with both mutable and computed signals:

```tsx
import { signal, AnySignal } from "rextive";

function logChanges<T>(s: AnySignal<T>, label: string) {
  s.on(() => console.log(`[${label}]`, s()));
}

// Works with any signal type
const count = signal(0);
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

logChanges(count, "Counter");
logChanges(doubled, "Doubled");
```

### Type Narrowing

```tsx
import { is } from "rextive";

function maybeSet<T>(s: AnySignal<T>, value: T) {
  if (is(s, "mutable")) {
    s.set(value); // ✅ TypeScript knows it's mutable
  }
}
```

---

## Pattern 5: Component-Scoped State with useScope

```tsx
import { signal, useScope, rx } from "rextive/react";

function Counter() {
  const scope = useScope("counter", () => {
    const count = signal(0);
    const doubled = count.to((x) => x * 2);
    
    return {
      count,
      doubled,
      increment: () => count.set((c) => c + 1),
    };
  });

  return (
    <div>
      <p>Count: {rx(scope.count)}</p>
      <p>Doubled: {rx(scope.doubled)}</p>
      <button onClick={scope.increment}>+1</button>
    </div>
  );
}
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Keyed caching** | Same key = same instance (handles StrictMode) |
| **Auto-dispose** | Signals inside factory are automatically disposed |
| **Args support** | `useScope(key, factory, [args])` - recreates when args change |

---

## Pattern 6: Data Polling with Auto-Refresh

Use `context.refresh()` to implement automatic data polling. The refresh triggers a recomputation, which cancels the previous request (via `abortSignal`) and starts a new one.

### Basic Polling

```tsx
import { signal } from "rextive";

// Poll API every 10 seconds
const pollingData = signal(async ({ abortSignal, refresh }) => {
  // Schedule next refresh BEFORE the fetch
  // This ensures polling continues even if fetch fails
  setTimeout(refresh, 10 * 1000);

  const response = await fetch("/api/data", { signal: abortSignal });
  return response.json();
});
```

**How it works:**

1. Signal computes initially, fetching data and scheduling a refresh
2. After 10 seconds, `refresh()` is called
3. Previous computation is cancelled (abortSignal fires)
4. New computation starts, fetching fresh data
5. Cycle repeats

### Polling After Success

If you only want to poll after a successful fetch (not on errors):

```tsx
const pollingData = signal(async ({ abortSignal, refresh }) => {
  const response = await fetch("/api/data", { signal: abortSignal });
  const data = await response.json();

  // Only schedule next poll after successful fetch
  setTimeout(refresh, 10 * 1000);

  return data;
});
```

### Polling with Cleanup

For more control, schedule refresh after the promise settles:

```tsx
const pollingData = signal(async ({ abortSignal, refresh }) => {
  const result = fetch("/api/data", { signal: abortSignal })
    .then((res) => res.json());

  // Schedule next refresh after completion (success or failure)
  result.finally(() => {
    setTimeout(refresh, 10 * 1000);
  });

  return result;
});
```

### Conditional Polling

Poll only when certain conditions are met:

```tsx
const isActive = signal(true);
const userId = signal(123);

const userData = signal({ isActive, userId }, async ({ deps, abortSignal, refresh }) => {
  // Only poll when active
  if (deps.isActive) {
    setTimeout(refresh, 30 * 1000);
  }

  const response = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal,
  });
  return response.json();
});

// Stop polling
isActive.set(false);

// Resume polling (triggers immediate refresh + schedules next)
isActive.set(true);
```

### Manual Refresh Control

Combine auto-polling with manual refresh:

```tsx
import { signal, useScope, rx, task } from "rextive/react";

function Dashboard() {
  const scope = useScope("dashboard", () => {
    const data = signal(async ({ abortSignal, refresh }) => {
      setTimeout(refresh, 60 * 1000); // Auto-refresh every minute

      const res = await fetch("/api/dashboard", { signal: abortSignal });
      return res.json();
    });

    return { data };
  });

  return (
    <div>
      {rx(() => {
        const state = task.from(scope.data);
        if (state.loading) return <Spinner />;
        return <DashboardView data={state.value} />;
      })}

      {/* Manual refresh button */}
      <button onClick={() => scope.data.refresh()}>
        Refresh Now
      </button>
    </div>
  );
}
```

### Key Points

| Aspect | Recommendation |
|--------|----------------|
| **Schedule timing** | Before fetch = continuous polling; After fetch = success-only polling |
| **Cancellation** | Always pass `abortSignal` to fetch - previous requests auto-cancel |
| **Error handling** | Use `finally` for reliable scheduling regardless of success/failure |
| **Stop polling** | Dispose the signal or use conditional logic |
| **Interval** | Consider server load; typical: 10s-60s for dashboards |

---

## Pattern 7: Logic Export Patterns

When creating logic modules, choose the appropriate export pattern based on consumer needs.

### Pattern A: Export Signal Only (Consumer Controls Read/Write)

Export the state signal and let consumers decide how to access fields. Consumers can use `focus.lens()` inside `rx()` for fine-grained reactivity on large states.

```tsx
import { signal, useScope, rx, inputValue } from "rextive/react";
import { focus } from "rextive/op";

// Logic: expose state signal
function formLogic() {
  const state = signal({
    username: "",
    password: "",
    error: "",
  });

  async function submit() {
    // validation and submission logic
  }

  return {
    state,  // Consumer controls read/write
    submit,
  };
}

// Component: use lens inside rx() for fine-grained updates
function LoginForm() {
  const $form = useScope(formLogic);

  return (
    <form onSubmit={(e) => { e.preventDefault(); $form.submit(); }}>
      {rx(() => {
        // Create lens inside rx() - cheap, disposed per render
        const [get, set] = focus.lens($form.state, "username").map(inputValue);
        return <input value={get()} onChange={set} />;
      })}
      
      {rx(() => {
        const [get, set] = focus.lens($form.state, "password").map(inputValue);
        return <input type="password" value={get()} onChange={set} />;
      })}
      
      {rx(() => {
        const error = $form.state().error;
        return error ? <p className="error">{error}</p> : null;
      })}
    </form>
  );
}
```

**When to use:**
- Consumer needs full control over read/write
- State is complex and benefits from `focus.lens()` for partial updates
- Simple API surface (just expose state)

### Pattern B: Export Getters/Setters Only (Controlled Access)

Export separate getter and setter functions when you want controlled access. This is easier to mock in tests.

```tsx
// Logic: expose controlled getters/setters
function userLogic() {
  const state = signal({ name: "", email: "" });

  return {
    // Controlled read
    getName: () => state().name,
    getEmail: () => state().email,
    
    // Controlled write (can include validation)
    setName: (v: string) => state.set((s) => ({ ...s, name: v.trim() })),
    setEmail: (v: string) => state.set((s) => ({ ...s, email: v.toLowerCase() })),
    
    // Derived read-only
    getDisplayName: () => state().name || state().email,
  };
}

// Component: use getters/setters directly
function UserProfile() {
  const $user = useScope(userLogic);

  return rx(() => (
    <div>
      <h2>{$user.getDisplayName()}</h2>
      <input 
        value={$user.getName()} 
        onChange={(e) => $user.setName(e.currentTarget.value)} 
      />
    </div>
  ));
}

// Test: easy to mock
describe("UserProfile", () => {
  it("displays user name", () => {
    const mockUser = {
      getName: vi.fn(() => "Test User"),
      setName: vi.fn(),
      getEmail: vi.fn(() => "test@example.com"),
      setEmail: vi.fn(),
      getDisplayName: vi.fn(() => "Test User"),
    };
    
    // Use mockUser in tests
  });
});
```

**When to use:**
- Logic needs to validate/transform on read or write
- Better testability with mockable functions
- Want to hide internal state structure

### ❌ Don't Export Lens Tuples

```tsx
// ❌ Bad: Lens tuples are hard to mock
function formLogic() {
  const state = signal({ username: "" });
  return {
    username: focus.lens(state, "username"),  // Hard to mock!
  };
}

// ✅ Good: Export signal (Pattern A)
return { state };

// ✅ Good: Export getters/setters (Pattern B)
return {
  getUsername: () => state().username,
  setUsername: (v: string) => state.set((s) => ({ ...s, username: v })),
};
```

### Summary

| Pattern | Export | Consumer | Testability | Use Case |
|---------|--------|----------|-------------|----------|
| **A: Signal** | `state` signal | Uses `focus.lens()` in `rx()` | Mock signal | Full control, large states |
| **B: Getters/Setters** | `getFoo`, `setFoo` | Calls functions | Mock functions | Controlled access, easy mocking |
| **❌ Lens** | Lens tuples | Destructure | Hard to mock | **Don't use** |

---

## Pattern 8: Async Action State

Handle async actions (form submit, API calls) with loading/error states.

### Naming Convention

Use `{action}State` for signals that track async action state:

```tsx
const loginState = useScope(() => signal<Promise<void>>());
const submitState = useScope(() => signal<Promise<Result>>());
const deleteState = useScope(() => signal<Promise<void>>());
```

### Pattern A: Logic-Level State (Shared)

When multiple parts of UI need to react to the same action:

```tsx
// logic/authLogic.ts
export const authLogic = logic("authLogic", () => {
  const user = signal<User | null>(null);
  const loginState = signal<Promise<void>>();  // Exposed for consumers
  
  async function login(credentials: Credentials) {
    const promise = (async () => {
      const result = await authApi.login(credentials);
      user.set(result.user);
    })();
    
    loginState.set(promise);
    return promise;
  }

  return {
    user,
    loginState,  // Consumers can track this
    login,
  };
});

// components/LoginForm.tsx
function LoginForm() {
  const $auth = authLogic();

  return rx(() => {
    const state = task.from($auth.loginState());
    
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        $auth.login({ email, password });
      }}>
        <button disabled={state?.loading}>
          {state?.loading ? "Logging in..." : "Login"}
        </button>
      </form>
    );
  });
}

// components/Header.tsx - ALSO reacts to login state
function Header() {
  const $auth = authLogic();

  return rx(() => {
    const state = task.from($auth.loginState());
    
    return (
      <header>
        {state?.loading && <Spinner size="sm" />}
        {rx(() => $auth.user() ? <Avatar /> : <GuestIcon />)}
      </header>
    );
  });
}
```

**When to use:**
- Multiple components need to show loading/error state
- Global actions (login, logout, sync)
- Action state is part of domain logic

### Pattern B: Component-Level State (Local)

When only one component handles the action:

```tsx
// logic/formLogic.ts - Logic exposes action only, no state
export function contactFormLogic() {
  async function submit(data: ContactData) {
    await api.sendContact(data);
  }

  return { submit };
}

// components/ContactForm.tsx
function ContactForm() {
  const $form = useScope(contactFormLogic);
  const submitState = useScope(() => signal<Promise<void>>());

  return rx(() => {
    const state = task.from(submitState());
    
    if (state?.value !== undefined) {
      return <SuccessMessage />;
    }
    
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        submitState.set($form.submit(formData));
      }}>
        {state?.error && <ErrorMessage error={state.error} />}
        
        <button disabled={state?.loading}>
          {state?.loading ? "Sending..." : "Send Message"}
        </button>
      </form>
    );
  });
}
```

**When to use:**
- Single component handles the action
- Action is UI-specific (form submit, modal confirm)
- Don't want to pollute logic with UI state

### Comparison

| Aspect | Pattern A: Logic-Level | Pattern B: Component-Level |
|--------|------------------------|---------------------------|
| State location | In logic | In component |
| Sharing | ✅ Multiple consumers | ❌ Single component |
| Logic complexity | Higher | Lower |
| Reusability | Action + state together | Action only, state separate |

---

## Pattern Quick Reference

| Pattern | Use When | Example |
|---------|----------|---------|
| **Single value** | Simple state | `signal(0)` |
| **With equality** | Objects/arrays | `signal({...}, "shallow")` |
| **`.to()`** | Transform one signal | `count.to(x => x * 2)` |
| **Multiple deps** | Combine signals | `signal({ a, b }, ...)` |
| **`.pipe()`** | Chain operators | `count.pipe(filter(...), to(...))` |
| **Tags** | Group signals | `signal.tag()` |
| **Plugins** | Extend behavior | `{ use: [logger] }` |
| **Async** | Data fetching | `signal(async () => ...)` |
| **Polling** | Auto-refresh data | `signal(async ({ refresh }) => ...)` |
| **Export signal** | Consumer controls access | `return { state }` |
| **Export getters/setters** | Controlled access, easy mocking | `return { getName, setName }` |
| **Async state (logic)** | Shared action state | `loginState` in logic |
| **Async state (local)** | Single component action | `useScope(() => signal<Promise>())` |

---

## Next Steps

- **[Error Handling](./ERROR_HANDLING.md)** - Error handling & tracing
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Operators](./OPERATORS.md)** - Full operators reference


