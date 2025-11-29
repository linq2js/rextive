# Learn by Example

Real-world examples to help you master Rextive.

---

## Example 1: Counter (The Basics)

A fully-featured counter with derived state:

```tsx
import { signal, rx } from "rextive/react";

// Create reactive state
const count = signal(0);

// Create derived state (automatically updates)
const doubled = count.to((x) => x * 2);
const isPositive = count.to((x) => x > 0);
const isEven = count.to((x) => x % 2 === 0);

function Counter() {
  return (
    <div>
      <h1>Count: {rx(count)}</h1>
      <p>Doubled: {rx(doubled)}</p>
      <p>Is Positive: {rx(isPositive, (pos) => (pos ? "Yes ✓" : "No ✗"))}</p>
      <p>Is Even: {rx(isEven, (even) => (even ? "Yes ✓" : "No ✗"))}</p>

      <button onClick={() => count.set((x) => x + 1)}>Increment</button>
      <button onClick={() => count.set((x) => x - 1)}>Decrement</button>
      <button onClick={() => count.reset()}>Reset to 0</button>
    </div>
  );
}
```

---

## Example 2: Async Data Fetching with Auto-Cancel

A user profile loader with automatic request cancellation:

```tsx
import { signal, rx } from "rextive/react";
import { Suspense } from "react";

const userId = signal(1);

// Async signal that fetches user data
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal, // ✅ Automatically cancels when userId changes
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
});

function Profile() {
  return (
    <div>
      <button onClick={() => userId.set(1)}>Load User 1</button>
      <button onClick={() => userId.set(2)}>Load User 2</button>

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

**With manual loading states using `loadable()`:**

```tsx
import { loadable } from "rextive";

function ProfileManual() {
  return rx(() => {
    const state = loadable(user);

    if (state.loading) return <div>Loading user...</div>;
    if (state.error) return <div>Error: {state.error.message}</div>;
    return <div><h3>{state.value.name}</h3></div>;
  });
}
```

---

## Example 3: Advanced Timeout & Cancellation

Combine automatic cancellation with timeouts and manual control:

```tsx
import { signal, wait, producer } from "rextive";

const userId = signal(1);

// Pattern 1: Add timeout to prevent hanging requests
const user = signal({ userId }, async ({ deps, abortSignal }) => {
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
const manualController = producer(() => new AbortController());

const searchResults = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  if (!deps.searchTerm) return [];

  const controller = manualController.next();
  const combinedSignal = AbortSignal.any([
    abortSignal,
    controller.signal,
    AbortSignal.timeout(10000),
  ]);

  const res = await fetch(`/search?q=${deps.searchTerm}`, {
    signal: combinedSignal,
  });
  return res.json();
});

// Cancel current search manually
manualController.current().abort();
```

---

## Example 4: Component-Scoped State with Auto-Cleanup

Create signals that live with your component and automatically cleanup:

```tsx
import { signal, disposable, rx, useScope } from "rextive/react";

function createTodoListScope() {
  const todos = signal([
    { id: 1, text: "Learn Rextive", status: "done" },
    { id: 2, text: "Build app", status: "active" },
  ]);
  const filter = signal("all");

  const filteredTodos = signal({ todos, filter }, ({ deps }) => {
    if (deps.filter === "all") return deps.todos;
    return deps.todos.filter((t) => t.status === deps.filter);
  });

  const activeCount = todos.to((list) =>
    list.filter((t) => t.status === "active").length
  );

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

  return disposable({ todos, filter, filteredTodos, activeCount, addTodo, toggleTodo });
}

function TodoList() {
  const scope = useScope(createTodoListScope);

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

---

## Example 5: React Query-like Data Fetching

Build a reusable query pattern:

```tsx
import { signal, disposable, rx, useScope, loadable } from "rextive/react";

function createQuery(endpoint, options = {}) {
  const params = signal();

  const result = signal({ params }, async ({ deps, abortSignal }) => {
    if (!deps.params) return null;

    const res = await fetch(endpoint, {
      method: options.method || "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deps.params),
      signal: abortSignal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

  const query = (newParams) => {
    params.set(newParams);
    return result();
  };

  return {
    params,
    result,
    query,
    refetch: result.refresh,
    dispose: disposable({ result, params }).dispose,
  };
}

function UserProfile({ userId }) {
  const userQuery = useScope(() => createQuery("/api/user"), {
    update: [(q) => q.query({ id: userId }), userId],
  });

  return (
    <div>
      <button onClick={() => userQuery.refetch()}>Refresh</button>

      {rx(() => {
        const state = loadable(userQuery.result());
        if (state.loading) return <div>Loading...</div>;
        if (state.error) return <div>Error: {state.error.message}</div>;
        if (!state.value) return <div>No user selected</div>;
        return <div><h3>{state.value.name}</h3></div>;
      })}
    </div>
  );
}
```

---

## Example 6: Form Validation with Async Checks

Build a registration form with sync and async validation:

```tsx
import { signal, disposable, rx, useScope, loadable } from "rextive/react";

function createRegistrationFormScope() {
  const existingUsernames = ["admin", "testuser", "john123"];

  const fields = {
    name: signal(""),
    username: signal(""),
  };

  const errors = {
    // Sync validation
    name: fields.name.to((value) => {
      if (value.length === 0) return "Name is required";
      if (value.length < 2) return "Name must be at least 2 characters";
      return undefined;
    }),

    // Async validation with safe() for cancellation
    username: fields.username.to(async (value, { safe }) => {
      if (value.length === 0) return "Username is required";
      await safe(wait.delay(500)); // Debounce
      if (existingUsernames.includes(value)) return "Username already taken";
      return undefined;
    }),
  };

  return disposable({ fields, errors });
}

function RegistrationForm() {
  const scope = useScope(createRegistrationFormScope);

  const Field = ({ label, field, validation }) =>
    rx(() => {
      const fieldValue = field();
      const validationState = loadable(validation);

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
          {validationState.value && <div style={{ color: "red" }}>{validationState.value}</div>}
        </div>
      );
    });

  return (
    <form>
      <Field label="Name" field={scope.fields.name} validation={scope.errors.name} />
      <Field label="Username" field={scope.fields.username} validation={scope.errors.username} />
      <button type="submit">Register</button>
    </form>
  );
}
```

---

## Example 7: Debounced Search

Build a search box with debouncing and automatic cancellation:

```tsx
import { signal, disposable, rx, useScope, wait, loadable } from "rextive/react";

function SearchBox() {
  const scope = useScope(() => {
    const searchInput = signal("");

    const results = signal(
      { searchInput },
      async ({ deps, abortSignal, safe }) => {
        const query = deps.searchInput.trim();
        if (!query || query.length < 2) return [];

        // Debounce: wait 300ms
        await safe(wait.delay(300));

        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: abortSignal,
        });
        return res.json();
      }
    );

    return disposable({ searchInput, results });
  });

  return (
    <div>
      <input
        value={rx(scope.searchInput)}
        onChange={(e) => scope.searchInput.set(e.target.value)}
        placeholder="Search (min 2 characters)..."
      />

      {rx(() => {
        const resultsState = loadable(scope.results());
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

---

## Example 8: Batch Updates for Performance

When updating multiple signals at once, use batching:

```tsx
import { signal } from "rextive";

const firstName = signal("John");
const lastName = signal("Doe");
const email = signal("john@example.com");

const summary = signal(
  { firstName, lastName, email },
  ({ deps }) => `${deps.firstName} ${deps.lastName} <${deps.email}>`
);

summary.on((value) => console.log("Summary updated:", value));

// ❌ Without batch: 3 separate notifications
firstName.set("Jane");
lastName.set("Smith");
email.set("jane@example.com");

// ✅ With batch: Single notification
signal.batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
  email.set("jane@example.com");
});
// Only ONE notification!
```

---

## Example 9: Persist to LocalStorage

Automatically save and load signal state:

```tsx
import { signal } from "rextive";
import { persistor } from "rextive/plugins";

type AppSettings = {
  theme: string;
  fontSize: number;
};

const persist = persistor<AppSettings>({
  load: () => {
    const stored = localStorage.getItem("appSettings");
    return stored ? JSON.parse(stored) : {};
  },
  save: (args) => {
    const existing = JSON.parse(localStorage.getItem("appSettings") || "{}");
    localStorage.setItem("appSettings", JSON.stringify({ ...existing, ...args.values }));
  },
});

// Type-safe persistence
const theme = signal("dark", { use: [persist("theme")] });
const fontSize = signal(16, { use: [persist("fontSize")] });

// On page load: Signals are hydrated from localStorage
// On change: Automatically saved
theme.set("light"); // Saved automatically
```

---

## Example 10: React to Other Signals with `when` Plugin

Let a signal react to changes in other signals:

```tsx
import { signal } from "rextive";
import { when } from "rextive/plugins";

const userId = signal(1);
const refreshTrigger = signal(0);

const userData = signal(
  { userId },
  async ({ deps }) => fetchUser(deps.userId),
  {
    use: [
      // Refresh when refreshTrigger changes
      when(refreshTrigger, (sig) => sig.refresh()),
    ],
  }
);

// Trigger a refresh
refreshTrigger.set((n) => n + 1);

// Multiple triggers
const filter = signal("all");
const sort = signal("date");

const todos = signal(async () => fetchTodos(), {
  use: [
    when([filter, sort], (sig) => sig.refresh()),
  ],
});
```

---

## Next Steps

- **[Patterns](./PATTERNS.md)** - Advanced patterns & best practices
- **[Error Handling](./ERROR_HANDLING.md)** - Error handling & tracing
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation


