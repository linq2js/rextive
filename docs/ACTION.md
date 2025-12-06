# signal.action - Dispatchable Actions

`signal.action` creates dispatchable actions that combine a payload signal with a computed result. Perfect for mutations, API calls, and any operation triggered by explicit dispatch.

## Three Patterns

### 1. Mutation (No Dependencies)

For operations that should **only run when explicitly dispatched**:

```ts
const submitForm = signal.action(async (ctx: AC<FormData>) => {
  return fetch("/api/submit", {
    method: "POST",
    body: JSON.stringify(ctx.payload),
  });
});

// Only runs when you dispatch
submitForm.dispatch(formData);
```

### 2. Lazy Query (With Dependencies)

For data fetching that **waits for dispatch, but auto-updates when deps change**:

```ts
const userId = signal("user-123");

const fetchUserPosts = signal.action(
  { userId },
  async (ctx: AC<{ status: string }>, deps) => {
    return fetch(`/users/${deps.userId}/posts?filter=${ctx.payload.status}`);
  }
);

// First fetch - manual trigger required
fetchUserPosts.dispatch({ status: "published" });

// Auto-refetches when userId changes
userId.set("user-456");
```

### 3. Eager Query (With Initial Payload)

For data that should **fetch immediately on creation**:

```ts
const userId = signal("user-123");

const fetchUserPosts = signal.action(
  { userId },
  async (ctx: AC<{ status: string }>, deps) => {
    return fetch(`/users/${deps.userId}/posts?filter=${ctx.payload.status}`);
  },
  { initialPayload: { status: "all" } } // Auto-dispatches at init
);

// Data starts fetching immediately!
// Also auto-refetches when userId changes
```

| Pattern         | Dependencies | Initial Payload | Behavior                                           |
| --------------- | ------------ | --------------- | -------------------------------------------------- |
| **Mutation**    | ❌ None      | ❌ None         | Only runs on `dispatch()`                          |
| **Lazy Query**  | ✅ Yes       | ❌ None         | Waits for `dispatch()`, auto-updates on dep change |
| **Eager Query** | ✅ Yes       | ✅ Yes          | Runs immediately, auto-updates on dep change       |

---

## Basic Usage

```ts
import { signal, AC } from "rextive";

// Create an action - use AC<TPayload> to type the context
const login = signal.action(async (ctx: AC<Credentials>) => {
  const response = await fetch("/api/login", {
    method: "POST",
    body: JSON.stringify(ctx.payload),
    signal: ctx.abortSignal, // Auto-cancels on re-dispatch
  });
  return response.json() as User;
});

// Dispatch the action
login.dispatch({ username: "admin", password: "secret" });

// Access result reactively
rx(() => {
  const state = task.from(login.result());
  if (state.loading) return <Spinner />;
  if (state.error) return <Error error={state.error} />;
  return <Dashboard user={state.value} />;
});
```

## API Reference

### `signal.action(handler, options?)`

Creates an action without dependencies. Use `AC<TPayload>` to type the context and let TypeScript infer the result.

```ts
const action = signal.action(
  (ctx: AC<TPayload>) => TResult,
  options?: ActionOptions
);
```

### `signal.action(deps, handler, options?)`

Creates an action with reactive dependencies.

```ts
const action = signal.action(
  dependencies,
  (ctx: AC<TPayload>, deps) => TResult,
  options?: ActionOptions
);
```

### Returns: `Action<TPayload, TResult>`

| Property            | Type                             | Description                         |
| ------------------- | -------------------------------- | ----------------------------------- |
| `dispatch(payload)` | `(payload: TPayload) => TResult` | Dispatch the action                 |
| `payload`           | `Signal<TPayload, undefined>`    | Signal with last dispatched payload |
| `result`            | `Computed<TResult>`              | Computed signal with handler result |

**Note:** `action.payload` is read-only. Use `dispatch()` to update the payload.

---

## ActionContext

The context object passed to your handler:

```ts
interface ActionContext<TPayload> extends SignalContext {
  payload: TPayload; // The dispatched payload
  abortSignal: AbortSignal; // Cancels on re-dispatch
  safe<T>(promise: Promise<T>): Promise<T>; // Abort-safe execution
  onCleanup(fn: () => void): void; // Register cleanup
  // ... other SignalContext methods
}
```

### `ctx.payload`

The payload passed to `dispatch()`. Always defined when handler runs via dispatch.

```ts
const fetchUser = signal.action(async (ctx: AC<string>) => {
  // ctx.payload is always the dispatched value (string)
  return fetch(`/users/${ctx.payload}`).then((r) => r.json()) as User;
});

fetchUser.dispatch("user-123"); // ctx.payload = "user-123"
```

### `action.payload` vs `ctx.payload`

| Property         | Type                          | Description                            |
| ---------------- | ----------------------------- | -------------------------------------- |
| `action.payload` | `Signal<TPayload, undefined>` | Read-only, `undefined` before dispatch |
| `ctx.payload`    | `TPayload`                    | Always defined when handler runs       |

```ts
const action = signal.action((ctx: AC<string>) => {
  console.log(ctx.payload); // Always string when handler runs
});

action.payload(); // undefined before dispatch
action.dispatch("hello");
action.payload(); // "hello"
```

### Shorthand: `AC<TPayload>`

```ts
import { AC } from "rextive";

const action = signal.action({ userId }, (ctx: AC<string>, deps) => {
  return fetch(`/users/${deps.userId}`);
});
```

---

## Options

```ts
type ActionOptions<TPayload, TResult> = {
  name?: string; // Debug name
  equals?: ActionEquals<TPayload, TResult>; // Custom equality
  use?: UseList<TResult, "computed">; // Plugins
  initialPayload?: TPayload; // Run immediately with this payload
  onDispatch?: (payload: TPayload) => void; // Before handler runs
  onSuccess?: (result: Awaited<TResult>) => void; // On success
  onError?: (error: unknown) => void; // On error
};
```

### `name`

Debug name for DevTools. Creates `${name}.payload` and `${name}.result` signals.

```ts
const login = signal.action(handler, { name: "auth.login" });
// Creates: auth.login.payload, auth.login.result
```

### `equals`

Custom equality for payload and/or result:

```ts
// String shortcut (applies to result only)
signal.action(handler, { equals: "shallow" });

// Separate options
signal.action(handler, {
  equals: {
    payload: "strict", // Default: notifier (always triggers)
    result: "deep",
  },
});
```

### `initialPayload`

Set an initial payload (handler runs lazily when result is accessed):

```ts
const search = signal.action(
  async (ctx: AC<string>) => fetchResults(ctx.payload) as Results,
  { initialPayload: "" }
);

// payload() is "" immediately
// result() triggers search with ""
```

### Event Callbacks

```ts
const submitForm = signal.action(handler, {
  onDispatch: (payload) => {
    console.log("Dispatching:", payload);
    analytics.track("form_submit_start");
  },
  onSuccess: (result) => {
    console.log("Success:", result);
    toast.success("Saved!");
  },
  onError: (error) => {
    console.error("Error:", error);
    toast.error("Failed to save");
  },
});
```

**Event Flow:**

```
dispatch(payload)
    │
    ├─→ onDispatch(payload)     // Before handler
    │
    ├─→ handler(ctx) runs
    │       │
    │       ├─→ sync success → onSuccess(result)
    │       ├─→ sync error   → onError(error)
    │       │
    │       └─→ async (Promise)
    │               ├─→ resolve → onSuccess(result)
    │               └─→ reject  → onError(error)
    │
    └─→ result signal updated
```

---

## Dependencies (Reactive vs Non-Reactive)

### Reactive Dependencies

Add signals to the deps object for **automatic re-computation** when they change:

```ts
const userId = signal("user-123");
const authToken = signal("token-abc");

const fetchPosts = signal.action(
  { userId, authToken }, // Reactive deps
  async (ctx: AC<void>, deps) => {
    return fetch(`/users/${deps.userId}/posts`, {
      headers: { Authorization: deps.authToken },
    }).then((r) => r.json());
  }
);

// When userId or authToken changes, result auto-updates!
```

### Non-Reactive Reads

Call signals directly for **dispatch-only** behavior (no auto-recompute):

```ts
const authToken = signal("token-abc");

const submitForm = signal.action(async (ctx: AC<FormData>) => {
  // Read token at dispatch time (not reactive)
  return fetch("/submit", {
    headers: { Authorization: authToken() },
    body: JSON.stringify(ctx.payload),
  });
});

// authToken changes won't re-submit the form
// Only dispatch() triggers the handler
```

**Rule of thumb:**

- **Queries** (fetching data) → Use reactive deps
- **Mutations** (submitting data) → Call signals directly

---

## Async Actions

### Auto-Cancellation

Previous dispatches are automatically aborted when you dispatch again:

```ts
const search = signal.action(async (ctx: AC<string>) => {
  // This fetch is cancelled if user types again
  const response = await fetch(`/search?q=${ctx.payload}`, {
    signal: ctx.abortSignal,
  });
  return response.json() as Results;
});

// Rapid dispatches - only last one completes
search.dispatch("a");
search.dispatch("ab");
search.dispatch("abc"); // Only this one returns results
```

### Debouncing with `ctx.safe()`

```ts
const search = signal.action(async (ctx: AC<string>) => {
  // Wait 300ms - aborts if re-dispatched
  await ctx.safe(new Promise((r) => setTimeout(r, 300)));

  const response = await fetch(`/search?q=${ctx.payload}`, {
    signal: ctx.abortSignal,
  });
  return response.json() as Results;
});
```

### Accessing Async State

```ts
rx(() => {
  const promise = search.result();
  const state = task.from(promise);

  if (state.loading) return <Spinner />;
  if (state.error) return <Error error={state.error} />;
  return <ResultsList results={state.value} />;
});
```

---

## Examples

### Login Form

```ts
type Credentials = { username: string; password: string };
type User = { id: string; name: string };

const loginAction = signal.action(
  async (ctx: AC<Credentials>) => {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ctx.payload),
      signal: ctx.abortSignal,
    });

    if (!response.ok) throw new Error("Login failed");
    return response.json() as User;
  },
  {
    name: "auth.login",
    onSuccess: (user) => {
      localStorage.setItem("user", JSON.stringify(user));
    },
    onError: (error) => {
      console.error("Login failed:", error);
    },
  }
);

// In component
function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    loginAction.dispatch({ username, password });
  };

  return rx(() => {
    const state = task.from(loginAction.result());

    if (state.loading) return <div>Logging in...</div>;
    if (state.error) return <div>Error: {state.error.message}</div>;
    if (state.value) return <Redirect to="/dashboard" />;

    return (
      <form onSubmit={handleSubmit}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
    );
  });
}
```

### Data Fetching with Filters

```ts
const page = signal(1);
const sortBy = signal<"name" | "date">("name");

const fetchUsers = signal.action(
  { page, sortBy }, // Reactive - auto-refetches when these change
  async (ctx: AC<string>, deps) => {
    const response = await fetch(
      `/api/users?page=${deps.page}&sort=${deps.sortBy}&search=${ctx.payload}`,
      { signal: ctx.abortSignal }
    );
    return response.json();
  }
);

// Initial fetch
fetchUsers.dispatch("");

// Auto-refetches when page or sortBy changes
page.set(2); // Triggers refetch
sortBy.set("date"); // Triggers refetch

// Manual search
fetchUsers.dispatch("john"); // Fetches with search term
```

### Refresh Button

```ts
const refreshData = signal.action(async (ctx: AC<void>) => {
  // ctx.payload not used - just a trigger
  const response = await fetch("/api/data", { signal: ctx.abortSignal });
  return response.json() as Data[];
});

function RefreshButton() {
  return <button onClick={() => refreshData.dispatch()}>Refresh</button>;
}
```

### Form with Optimistic Updates

```ts
const todos = signal<Todo[]>([]);

const addTodo = signal.action(
  async (ctx: AC<string>) => {
    const text = ctx.payload;

    // Optimistic update
    const tempTodo = { id: "temp", text, done: false };
    todos.set((prev) => [...prev, tempTodo]);

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        body: JSON.stringify({ text }),
        signal: ctx.abortSignal,
      });
      const newTodo = (await response.json()) as Todo;

      // Replace temp with real
      todos.set((prev) => prev.map((t) => (t.id === "temp" ? newTodo : t)));
      return newTodo;
    } catch (error) {
      // Rollback on error
      todos.set((prev) => prev.filter((t) => t.id !== "temp"));
      throw error;
    }
  },
  {
    onError: () => toast.error("Failed to add todo"),
  }
);
```

---

## Best Practices

### 1. Use `abortSignal` for fetch

```ts
// ✅ Good - cancellable
const action = signal.action(async (ctx: AC<void>) => {
  return fetch(url, { signal: ctx.abortSignal });
});

// ❌ Bad - not cancellable
const action = signal.action(async (ctx: AC<void>) => {
  return fetch(url);
});
```

### 3. Choose the right pattern

```ts
// ✅ Mutation - no deps, explicit dispatch only
const deletePost = signal.action(async (ctx: AC<string>) => {
  return fetch(`/posts/${ctx.payload}`, { method: "DELETE" });
});

// ✅ Lazy Query - deps for reactivity, manual first fetch
const fetchPosts = signal.action({ userId }, async (ctx: AC<number>, deps) => {
  return fetch(`/posts?user=${deps.userId}&page=${ctx.payload}`);
});

// ✅ Eager Query - deps + initialPayload for immediate fetch
const fetchUserProfile = signal.action(
  { userId },
  async (ctx: AC<{}>, deps) => fetch(`/users/${deps.userId}`),
  { initialPayload: {} } // Starts fetching immediately
);
```

### 4. Name your actions for debugging

```ts
const action = signal.action(handler, { name: "users.fetch" });
// DevTools shows: users.fetch.payload, users.fetch.result
```
