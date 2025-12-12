# Learn by Example

Real-world examples to help you master Rextive. Each example includes detailed explanations of the patterns and techniques used.

---

## Table of Contents

- [Learn by Example](#learn-by-example)
  - [Table of Contents](#table-of-contents)
  - [Example 1: Counter (The Basics)](#example-1-counter-the-basics)
    - [What You'll Learn](#what-youll-learn)
    - [Code](#code)
    - [Key Points](#key-points)
  - [Example 2: Async Data Fetching with Auto-Cancel](#example-2-async-data-fetching-with-auto-cancel)
    - [What You'll Learn](#what-youll-learn-1)
    - [Code (Suspense Mode)](#code-suspense-mode)
    - [Code (Manual Loading States)](#code-manual-loading-states)
    - [Key Points](#key-points-1)
  - [Example 3: Advanced Timeout \& Cancellation](#example-3-advanced-timeout--cancellation)
    - [What You'll Learn](#what-youll-learn-2)
    - [Code](#code-1)
    - [Key Points](#key-points-2)
  - [Example 4: Component-Scoped State with Auto-Cleanup](#example-4-component-scoped-state-with-auto-cleanup)
    - [What You'll Learn](#what-youll-learn-3)
    - [Code](#code-2)
    - [Key Points](#key-points-3)
  - [Example 5: React Query-like Data Fetching](#example-5-react-query-like-data-fetching)
    - [What You'll Learn](#what-youll-learn-4)
    - [Code](#code-3)
    - [Key Points](#key-points-4)
  - [Example 6: Form Validation with Async Checks](#example-6-form-validation-with-async-checks)
    - [What You'll Learn](#what-youll-learn-5)
    - [Code](#code-4)
    - [Key Points](#key-points-5)
  - [Example 7: Debounced Search](#example-7-debounced-search)
    - [What You'll Learn](#what-youll-learn-6)
    - [Code](#code-5)
    - [How Debouncing Works](#how-debouncing-works)
    - [Key Points](#key-points-6)
  - [Example 8: Batch Updates for Performance](#example-8-batch-updates-for-performance)
    - [What You'll Learn](#what-youll-learn-7)
    - [Code](#code-6)
    - [When to Use Batching](#when-to-use-batching)
  - [Example 9: Persist to LocalStorage](#example-9-persist-to-localstorage)
    - [What You'll Learn](#what-youll-learn-8)
    - [Code](#code-7)
    - [How It Works](#how-it-works)
    - [Key Points](#key-points-7)
  - [Example 10: React to Other Signals with `.when()`](#example-10-react-to-other-signals-with-when)
    - [What You'll Learn](#what-youll-learn-9)
    - [Code](#code-8)
    - [Available Actions](#available-actions)
    - [Key Points](#key-points-8)
  - [Example 11: Data Polling with Auto-Refresh](#example-11-data-polling-with-auto-refresh)
    - [What You'll Learn](#what-youll-learn-10)
    - [Code](#code-9)
    - [React Component with Polling](#react-component-with-polling)
    - [Conditional Polling](#conditional-polling)
    - [Key Points](#key-points-9)
    - [Best Practices](#best-practices)
  - [Next Steps](#next-steps)

---

## Example 1: Counter (The Basics)

A fully-featured counter demonstrating the core Rextive concepts: mutable signals, derived state with `.to()`, and reactive rendering with `rx()`.

### What You'll Learn

- Creating mutable signals with `signal()`
- Deriving state with `.to()` (no dependency declaration needed for single signals)
- Reactive rendering with `rx()`
- Updating signals with `.set()` and `.reset()`

### Code

```tsx
import { signal, rx } from "rextive/react";

// Create reactive state - this is your source of truth
const count = signal(0);

// Create derived state using .to() - these automatically update when count changes
const doubled = count.to((x) => x * 2);
const isPositive = count.to((x) => x > 0);
const isEven = count.to((x) => x % 2 === 0);

function Counter() {
  return (
    <div>
      {/* rx(signal) renders the signal value reactively */}
      <h1>Count: {rx(count)}</h1>

      {/* rx(signal, selector) transforms the value before rendering */}
      <p>Doubled: {rx(doubled)}</p>
      <p>Is Positive: {rx(isPositive, (pos) => (pos ? "Yes ✓" : "No ✗"))}</p>
      <p>Is Even: {rx(isEven, (even) => (even ? "Yes ✓" : "No ✗"))}</p>

      {/* .set() with updater function for safe concurrent updates */}
      <button onClick={() => count.set((x) => x + 1)}>Increment</button>
      <button onClick={() => count.set((x) => x - 1)}>Decrement</button>

      {/* .reset() returns the signal to its initial value (0) */}
      <button onClick={() => count.reset()}>Reset to 0</button>
    </div>
  );
}
```

### Key Points

| Concept      | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| `signal(0)`  | Creates a mutable signal with initial value `0`                 |
| `.to(fn)`    | Creates a computed signal from a single source - no deps needed |
| `rx(signal)` | Renders signal value and re-renders only when it changes        |
| `.set(fn)`   | Updates using an updater function `(prev) => next`              |
| `.reset()`   | Resets to initial value                                         |

---

## Example 2: Async Data Fetching with Auto-Cancel

Demonstrates async signals with automatic request cancellation. When the dependency changes, the previous in-flight request is automatically cancelled.

### What You'll Learn

- Creating async computed signals
- Using `abortSignal` for automatic cancellation
- Integrating with React Suspense
- Manual loading states with `task.from()`

### Code (Suspense Mode)

```tsx
import { signal, rx } from "rextive/react";
import { Suspense } from "react";

// Mutable signal for user ID selection
const userId = signal(1);

// Async computed signal - automatically cancels previous fetch when userId changes
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  // Pass abortSignal to fetch - request cancels automatically on re-computation
  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

function Profile() {
  return (
    <div>
      <button onClick={() => userId.set(1)}>Load User 1</button>
      <button onClick={() => userId.set(2)}>Load User 2</button>

      {/* Suspense handles the loading state automatically */}
      <Suspense fallback={<div>Loading user...</div>}>
        {rx(user, (u) => (
          <div>
            <h3>{u.name}</h3>
            <p>Email: {u.email}</p>
          </div>
        ))}
      </Suspense>
    </div>
  );
}
```

### Code (Manual Loading States)

```tsx
import { task } from "rextive";

function ProfileManual() {
  return rx(() => {
    // task.from() normalizes Promise to { loading, error, value } object
    const state = task.from(user);

    if (state.loading) return <div>Loading user...</div>;
    if (state.error) return <div>Error: {state.error.message}</div>;
    return (
      <div>
        <h3>{state.value.name}</h3>
      </div>
    );
  });
}
```

### Key Points

| Concept                      | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| `signal({ deps }, async fn)` | Creates async computed signal with explicit dependencies            |
| `abortSignal`                | Automatically provided; cancels when deps change or signal disposes |
| `Suspense`                   | Works out-of-the-box with async signals                             |
| `task.from()`                 | Converts Promise to `{ loading, error, value }` for manual handling |

---

## Example 3: Advanced Timeout & Cancellation

Advanced patterns for combining automatic cancellation with custom timeouts and manual abort control.

### What You'll Learn

- Adding request timeouts
- Combining multiple AbortSignals
- Manual cancellation with `producer()`

### Code

```tsx
import { signal, wait, producer } from "rextive";

const userId = signal(1);

// Pattern 1: Add timeout to prevent hanging requests
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  // Combine auto-cancel signal with a 5-second timeout
  const timeoutSignal = AbortSignal.any([
    abortSignal,
    AbortSignal.timeout(5000), // 5 second timeout
  ]);

  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: timeoutSignal,
  });
  return res.json();
});

// Pattern 2: Manual + automatic cancellation
const searchTerm = signal("");

// producer() creates a value that's replaced each time you call .next()
const manualController = producer(() => new AbortController());

const searchResults = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  if (!deps.searchTerm) return [];

  // Get current controller (creates new one, cancelling previous)
  const controller = manualController.next();

  // Combine three signals: auto, manual, and timeout
  const combinedSignal = AbortSignal.any([
    abortSignal, // Auto-cancel on searchTerm change
    controller.signal, // Manual cancel
    AbortSignal.timeout(10000), // 10 second timeout
  ]);

  const res = await fetch(`/search?q=${deps.searchTerm}`, {
    signal: combinedSignal,
  });
  return res.json();
});

// Manually cancel the current search
manualController.current().abort();
```

### Key Points

| Concept                   | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `AbortSignal.any([...])`  | First signal to abort wins (ES2024+)                   |
| `AbortSignal.timeout(ms)` | Creates auto-abort signal after delay                  |
| `producer(factory)`       | Creates replaceable values; `.next()` replaces current |

---

## Example 4: Component-Scoped State with Auto-Cleanup

Demonstrates the `useScope()` pattern for creating component-local state that automatically cleans up on unmount.

### What You'll Learn

- Creating scoped state with `useScope(key, factory)`
- Auto-dispose for signals created inside factory
- Organizing related signals and actions together

### Code

```tsx
import { signal, rx, useScope } from "rextive/react";

function TodoList() {
  // useScope() creates scope once and auto-disposes signals on unmount
  const scope = useScope(() => {
    // Mutable signals for state
    const todos = signal([
      { id: 1, text: "Learn Rextive", status: "done" },
      { id: 2, text: "Build app", status: "active" },
    ]);
    const filter = signal("all");

    // Computed signal with multiple dependencies
    const filteredTodos = signal({ todos, filter }, ({ deps }) => {
      if (deps.filter === "all") return deps.todos;
      return deps.todos.filter((t) => t.status === deps.filter);
    });

    // Derived state from single signal
    const activeCount = todos.to(
      (list) => list.filter((t) => t.status === "active").length
    );

    // Actions (plain functions that update signals)
    const addTodo = (text) => {
      todos.set((list) => [...list, { id: Date.now(), text, status: "active" }]);
    };

    const toggleTodo = (id) => {
      todos.set((list) =>
        list.map((t) =>
          t.id === id
            ? { ...t, status: t.status === "active" ? "done" : "active" }
            : t
        )
      );
    };

    return {
      todos,
      filter,
      filteredTodos,
      activeCount,
      addTodo,
      toggleTodo,
    };
  });

  return (
    <div>
      <div>
        <button onClick={() => scope.filter.set("all")}>All</button>
        <button onClick={() => scope.filter.set("active")}>Active</button>
        <button onClick={() => scope.filter.set("done")}>Done</button>
      </div>

      <p>Active todos: {rx(scope.activeCount)}</p>

      {rx(scope.filteredTodos, (todos) => (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id} onClick={() => scope.toggleTodo(todo.id)}>
              {todo.text}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
```

### Key Points

| Concept                    | Description                                             |
| -------------------------- | ------------------------------------------------------- |
| `useScope(key, factory)`   | Creates scope once, auto-disposes signals on unmount    |
| Auto-dispose               | Signals inside factory are automatically cleaned up     |
| Factory pattern            | Separates state creation from component for testability |

---

## Example 5: React Query-like Data Fetching

Build a reusable query pattern similar to React Query or SWR.

### What You'll Learn

- Creating reusable data fetching patterns
- Using `useScope()` with args for dependency-based recreation
- Building query-like APIs

### Code

```tsx
import { signal, rx, useScope, task } from "rextive/react";

function UserProfile({ userId }) {
  // Create scoped query instance - recreates when userId changes
  const scope = useScope((id) => {
    // Result signal - fetches user data
    const result = signal(async ({ abortSignal }) => {
      const res = await fetch(`/api/user/${id}`, {
        signal: abortSignal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });

    return {
      result,
      refetch: result.refresh,
    };
  }, [userId]);

  return (
    <div>
      <button onClick={() => scope.refetch()}>Refresh</button>

      {rx(() => {
        const state = task.from(scope.result());

        if (state.loading) return <div>Loading...</div>;
        if (state.error) return <div>Error: {state.error.message}</div>;
        if (!state.value) return <div>No user selected</div>;
        return (
          <div>
            <h3>{state.value.name}</h3>
          </div>
        );
      })}
    </div>
  );
}
```

### Key Points

| Concept                          | Description                                          |
| -------------------------------- | ---------------------------------------------------- |
| `useScope(key, factory, [args])` | Recreates scope when args change                     |
| `result.refresh()`               | Forces immediate re-computation                      |
| Args as dependencies             | userId change triggers scope recreation              |

---

## Example 6: Form Validation with Async Checks

Build a registration form with both synchronous and asynchronous validation.

### What You'll Learn

- Sync validation with `.to()`
- Async validation with debouncing
- Using `safe()` for cancellation-aware delays

### Code

```tsx
import {
  signal,
  rx,
  useScope,
  task,
  wait,
} from "rextive/react";

function RegistrationForm() {
  const scope = useScope(() => {
    // Mock existing usernames (would be API call in real app)
    const existingUsernames = ["admin", "testuser", "john123"];

    // Form field signals
    const fields = {
      name: signal(""),
      username: signal(""),
    };

    // Validation signals
    const errors = {
      // Sync validation - immediate feedback
      name: fields.name.to((value) => {
        if (value.length === 0) return "Name is required";
        if (value.length < 2) return "Name must be at least 2 characters";
        return undefined; // undefined = valid
      }),

      // Async validation - debounced check
      username: fields.username.to(async (value, { safe }) => {
        if (value.length === 0) return "Username is required";

        // safe() throws if signal is disposed or re-computing
        // This creates a 500ms debounce
        await safe(wait.delay(500));

        // Check availability (would be API call)
        if (existingUsernames.includes(value)) return "Username already taken";
        return undefined;
      }),
    };

    return { fields, errors };
  });

  // Reusable field component
  const Field = ({ label, field, validation }) =>
    rx(() => {
      const fieldValue = field();
      const validationState = task.from(validation);

      return (
        <div>
          <label>
            {label}:
            <input
              value={fieldValue}
              onChange={(e) => field.set(e.target.value)}
            />
          </label>
          {validationState.loading && <div>Checking...</div>}
          {validationState.value && (
            <div style={{ color: "red" }}>{validationState.value}</div>
          )}
        </div>
      );
    });

  return (
    <form>
      <Field
        label="Name"
        field={scope.fields.name}
        validation={scope.errors.name}
      />
      <Field
        label="Username"
        field={scope.fields.username}
        validation={scope.errors.username}
      />
      <button type="submit">Register</button>
    </form>
  );
}
```

### Key Points

| Concept         | Description                                              |
| --------------- | -------------------------------------------------------- |
| Sync `.to()`    | Returns computed value immediately                       |
| Async `.to()`   | Returns Promise, handles cancellation automatically      |
| `safe(promise)` | Throws if cancelled - use for debounce/delay             |
| `task.from()`    | Normalizes sync/async validation to `{ loading, value }` |

---

## Example 7: Debounced Search

Build a search box with debouncing and automatic cancellation of in-flight requests.

### What You'll Learn

- Debouncing user input
- Using `safe()` for cancellation-aware delays
- Combining debounce with request cancellation

### Code

```tsx
import {
  signal,
  rx,
  useScope,
  wait,
  task,
} from "rextive/react";

function SearchBox() {
  const scope = useScope(() => {
    const searchInput = signal("");

    const results = signal(
      { searchInput },
      async ({ deps, abortSignal, safe }) => {
        const query = deps.searchInput.trim();

        // Early return for invalid queries
        if (!query || query.length < 2) return [];

        // Debounce: safe() throws if re-computed before delay completes
        // This prevents API calls while user is still typing
        await safe(wait.delay(300));

        // Actual fetch - abortSignal cancels if searchInput changes again
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: abortSignal,
        });
        return res.json();
      }
    );

    return { searchInput, results };
  });

  return (
    <div>
      <input
        value={rx(scope.searchInput)}
        onChange={(e) => scope.searchInput.set(e.target.value)}
        placeholder="Search (min 2 characters)..."
      />

      {rx(() => {
        const resultsState = task.from(scope.results);

        if (resultsState.loading) return <div>Searching...</div>;
        if (resultsState.error) return <div>Error!</div>;
        return (
          <ul>
            {resultsState.value.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
```

### How Debouncing Works

1. User types → `searchInput` updates
2. Computed signal starts → `safe(wait.delay(300))` begins
3. User types again before 300ms → previous computation cancelled
4. After 300ms of no typing → fetch executes
5. If user types during fetch → `abortSignal` cancels the request

### Key Points

| Concept                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `safe(wait.delay(ms))` | Cancellable debounce - throws if signal re-computes        |
| Double cancellation    | Debounce (safe) + fetch (abortSignal) for complete control |

---

## Example 8: Batch Updates for Performance

When updating multiple signals that feed into a single computed signal, use batching to prevent unnecessary intermediate computations.

### What You'll Learn

- Using `signal.batch()` for performance
- Understanding notification coalescing
- When batching matters

### Code

```tsx
import { signal } from "rextive";

const firstName = signal("John");
const lastName = signal("Doe");
const email = signal("john@example.com");

// Computed signal that depends on all three
const summary = signal(
  { firstName, lastName, email },
  ({ deps }) => `${deps.firstName} ${deps.lastName} <${deps.email}>`
);

// Log whenever summary changes
summary.on((value) => console.log("Summary updated:", value));

// ❌ Without batch: 3 separate notifications (wasteful!)
firstName.set("Jane"); // Summary recomputes
lastName.set("Smith"); // Summary recomputes again
email.set("jane@example.com"); // Summary recomputes third time

// ✅ With batch: Single notification
signal.batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
  email.set("jane@example.com");
});
// Summary recomputes ONCE with all new values
```

### When to Use Batching

| Scenario                                  | Use Batch? |
| ----------------------------------------- | ---------- |
| Updating multiple related signals at once | ✅ Yes     |
| Form reset (clearing all fields)          | ✅ Yes     |
| Single signal update                      | ❌ No      |
| Unrelated signals                         | ❌ No      |

---

## Example 9: Persist to LocalStorage

Automatically save and restore signal state using the `persistor` plugin.

### What You'll Learn

- Using the `persistor` plugin
- Type-safe persistence keys
- Hydration on page load

### Code

```tsx
import { signal } from "rextive";
import { persistor } from "rextive/plugins";

// Define the shape of persisted data
type AppSettings = {
  theme: string;
  fontSize: number;
};

// Create persistor with load/save functions
const persist = persistor<AppSettings>({
  load: () => {
    const stored = localStorage.getItem("appSettings");
    return stored ? JSON.parse(stored) : {};
  },
  save: (args) => {
    // Merge with existing to preserve other keys
    const existing = JSON.parse(localStorage.getItem("appSettings") || "{}");
    localStorage.setItem(
      "appSettings",
      JSON.stringify({ ...existing, ...args.values })
    );
  },
});

// Create signals with persistence
// persist("key") returns a plugin that handles load/save
const theme = signal("dark", { use: [persist("theme")] });
const fontSize = signal(16, { use: [persist("fontSize")] });

// On page load: signals are automatically hydrated from localStorage
// On change: values are automatically saved
theme.set("light"); // Automatically saved to localStorage
```

### How It Works

1. On signal creation → `load()` called, value hydrated if present
2. On `.set()` → `save()` called with new value
3. Type-safe → `persist("invalidKey")` is a TypeScript error

### Key Points

| Concept                     | Description                          |
| --------------------------- | ------------------------------------ |
| `persistor({ load, save })` | Creates reusable persistence factory |
| `use: [plugin]`             | Attaches plugin to signal            |
| Type safety                 | Key must exist in type parameter     |

---

## Example 10: React to Other Signals with `.when()`

Let a signal react to changes in other "notifier" signals using the `.when()` method.

### What You'll Learn

- Using `.when()` for signal-to-signal reactions
- Built-in actions: `"refresh"`, `"reset"`, `"stale"`
- Custom reducers for value-based updates

### Code

```tsx
import { signal } from "rextive";

const userId = signal(1);
const refreshTrigger = signal(0);

// Create async signal that fetches user data
const userData = signal({ userId }, async ({ deps }) => fetchUser(deps.userId));

// Refresh userData when refreshTrigger changes
userData.when(refreshTrigger, "refresh");

// Trigger a refresh from anywhere
refreshTrigger.set((n) => n + 1);

// Multiple notifiers
const filter = signal("all");
const sort = signal("date");

const todos = signal(async () => fetchTodos());

// Refresh when ANY of these signals change
todos.when([filter, sort], "refresh");

// With filter - only trigger when condition is met
todos.when(refreshTrigger, "refresh", (notifier, self) => notifier() > 0);

// Custom reducer - update value based on notifier
const counter = signal(0);
const increment = signal(0);

// When increment changes, add its value to counter
counter.when(increment, (notifier, self) => self() + notifier());
```

### Available Actions

| Action                         | For          | Description                          |
| ------------------------------ | ------------ | ------------------------------------ |
| `"refresh"`                    | Computed     | Force immediate recomputation        |
| `"stale"`                      | Computed     | Mark stale, recompute on next access |
| `"reset"`                      | Mutable only | Reset to initial value               |
| `(notifier, self) => newValue` | Mutable only | Custom reducer                       |

### Key Points

| Concept                   | Description                                 |
| ------------------------- | ------------------------------------------- |
| `.when(notifier, action)` | React to another signal's changes           |
| `[notifier1, notifier2]`  | React to multiple signals                   |
| Filter function           | Optional third arg to conditionally trigger |
| Chaining                  | `.when()` returns `this` for chaining       |

---

## Example 11: Data Polling with Auto-Refresh

Implement automatic data polling using the signal context's `refresh()` method. This is useful for dashboards, live data feeds, and any scenario requiring periodic updates.

### What You'll Learn

- Using `context.refresh()` to trigger recomputation
- Proper cancellation handling with `abortSignal`
- Different polling strategies (continuous vs. success-only)
- Combining auto-polling with manual refresh

### Code

```tsx
import { signal, task, disposable } from "rextive";
import { useScope, rx } from "rextive/react";

// Basic polling - refreshes every 10 seconds
const stockPrice = signal(async ({ abortSignal, refresh }) => {
  // Schedule next refresh BEFORE fetch
  // Ensures polling continues even if request fails
  setTimeout(refresh, 10 * 1000);

  const res = await fetch("/api/stock/AAPL", { signal: abortSignal });
  return res.json();
});

// Poll only after successful fetch
const reliableData = signal(async ({ abortSignal, refresh }) => {
  const res = await fetch("/api/data", { signal: abortSignal });
  const data = await res.json();

  // Only schedule next poll after success
  setTimeout(refresh, 30 * 1000);

  return data;
});

// Poll regardless of success/failure using finally
const resilientData = signal(async ({ abortSignal, refresh }) => {
  const result = fetch("/api/metrics", { signal: abortSignal }).then((res) =>
    res.json()
  );

  // Schedule next refresh after completion
  result.finally(() => {
    setTimeout(refresh, 15 * 1000);
  });

  return result;
});
```

### React Component with Polling

```tsx
function StockTicker() {
  const scope = useScope(() => {
    const symbol = signal("AAPL");

    // Poll stock price every 5 seconds
    const price = signal({ symbol }, async ({ deps, abortSignal, refresh }) => {
      setTimeout(refresh, 5 * 1000);

      const res = await fetch(`/api/stock/${deps.symbol}`, {
        signal: abortSignal,
      });
      return res.json();
    });

    return { symbol, price };
  });

  return (
    <div>
      <select onChange={(e) => scope.symbol.set(e.target.value)}>
        <option value="AAPL">Apple</option>
        <option value="GOOGL">Google</option>
        <option value="MSFT">Microsoft</option>
      </select>

      {rx(() => {
        const state = task.from(scope.price);

        if (state.loading) return <span>Loading...</span>;
        if (state.error) return <span>Error: {state.error.message}</span>;

        return (
          <span>
            {state.value.symbol}: ${state.value.price}
          </span>
        );
      })}

      {/* Manual refresh button */}
      <button onClick={() => scope.price.refresh()}>Refresh Now</button>
    </div>
  );
}
```

### Conditional Polling

```tsx
function Dashboard() {
  const scope = useScope(() => {
    const isVisible = signal(true);
    const pollInterval = signal(30 * 1000);

    const metrics = signal(
      { isVisible, pollInterval },
      async ({ deps, abortSignal, refresh }) => {
        // Only poll when tab is visible
        if (deps.isVisible) {
          setTimeout(refresh, deps.pollInterval);
        }

        const res = await fetch("/api/metrics", { signal: abortSignal });
        return res.json();
      }
    );

    // Pause/resume polling based on tab visibility
    const handleVisibility = () => {
      isVisible.set(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return {
      metrics,
      isVisible,
      pollInterval,
      dispose: () =>
        document.removeEventListener("visibilitychange", handleVisibility),
    };
  });

  return (
    <div>
      {rx(() => {
        const state = task.from(scope.metrics);
        if (state.loading) return <Spinner />;
        return <MetricsView data={state.value} />;
      })}

      {/* Adjust polling interval */}
      <select onChange={(e) => scope.pollInterval.set(Number(e.target.value))}>
        <option value="10000">Every 10s</option>
        <option value="30000">Every 30s</option>
        <option value="60000">Every 1min</option>
      </select>
    </div>
  );
}
```

### Key Points

| Concept               | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `refresh()`           | Triggers recomputation, cancels previous request via `abortSignal` |
| Schedule before fetch | Polling continues even if request fails                            |
| Schedule after fetch  | Only polls after successful response                               |
| `finally()`           | Reliable scheduling regardless of success/failure                  |
| Conditional polling   | Check conditions before scheduling (e.g., tab visibility)          |
| Manual + Auto         | Combine `setTimeout(refresh, ...)` with `signal.refresh()` button  |

### Best Practices

| Practice                  | Reason                                                |
| ------------------------- | ----------------------------------------------------- |
| Always pass `abortSignal` | Ensures previous requests are cancelled               |
| Choose polling strategy   | Based on failure tolerance requirements               |
| Consider tab visibility   | Don't waste resources polling hidden tabs             |
| Use reasonable intervals  | 10s-60s typical for dashboards; respect server limits |
| Provide manual refresh    | Users expect control over data freshness              |

---

## Next Steps

- **[Patterns](./PATTERNS.md)** - Advanced patterns & best practices
- **[Error Handling](./ERROR_HANDLING.md)** - Error handling & tracing
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
