# Error Handling

Rextive provides comprehensive error handling for both synchronous and asynchronous operations, with powerful debugging capabilities.

---

## Basic Error Handling

### `fallback` - Provide Fallback Values

```tsx
const userData = signal(
  async () => {
    const res = await fetch("/api/user");
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },
  {
    fallback: (error) => ({ name: "Guest", isGuest: true }),
  }
);

// Always returns a value - either real data or fallback
const user = userData(); // Never throws!
```

### `onError` - Handle Errors with Callbacks

```tsx
const apiData = signal(async () => fetchData(), {
  onError: (error) => {
    analytics.track("api-error", { error: error.message });
    toast.error("Failed to load data");
  },
});
```

---

## Safe Error Access

### `signal.error()` - Get Error Without Throwing

```tsx
const mayFail = signal(() => {
  if (Math.random() > 0.5) throw new Error("Random failure");
  return 42;
});

// ✅ Safely check for errors
const error = mayFail.error();
if (error) {
  console.error("Signal has error:", error);
} else {
  console.log("Signal value:", mayFail());
}
```

### `signal.tryGet()` - Get Value Without Throwing

```tsx
const computed = signal({ source }, ({ deps }) => {
  if (deps.source < 0) throw new Error("Negative not allowed");
  return deps.source * 2;
});

// ✅ Returns undefined on error
const safeValue = computed.tryGet(); // number | undefined

if (safeValue !== undefined) {
  console.log("Value:", safeValue);
} else {
  console.log("Error:", computed.error());
}
```

---

## Async Error Handling

When a signal's value is a Promise, Rextive:

1. **Detects** the Promise
2. **Notifies** subscribers when the Promise settles (resolve or reject)
3. **Ignores** stale Promise results after refresh

Use `task.from()` to access the loading/error/success state:

```tsx
const asyncSignal = signal(async () => {
  await delay(100);
  throw new Error("Async error");
});

// Trigger computation - value is a Promise
const promise = asyncSignal();

// Wait for rejection
await delay(150);

// Access error via task.from()
const state = task.from(promise);
console.log(state.error); // Error: Async error
```

### Stale Promise Handling

If you refresh before a Promise rejects, the old error is ignored:

```tsx
const fetchData = signal(async () => {
  await delay(1000);
  throw new Error("Old error");
});

fetchData(); // Start first computation
fetchData.refresh(); // New computation starts

// Old Promise rejects but error is ignored
// because it's no longer the current value
```

### With `task.from()` - Full Loading State Control

```tsx
function UserProfile() {
  return rx(() => {
    const state = task.from(userData());

    switch (state.status) {
      case "loading":
        return <Spinner />;
      case "error":
        return (
          <div className="error">
            <p>Error: {state.error.message}</p>
            <button onClick={() => userData.refresh()}>Retry</button>
          </div>
        );
      case "success":
        return <UserCard user={state.value} />;
    }
  });
}
```

---

## Error Tracing with `signal.trace()`

When errors propagate through signal chains, Rextive tracks the path:

```tsx
// Chain: dbConnection → userService → dashboard
const dbConnection = signal(async () => {
  throw new Error("Database connection failed");
});

const userService = signal({ dbConnection }, ({ deps }) => {
  return { users: deps.dbConnection.users };
});

const dashboard = signal({ userService }, ({ deps }) => {
  return { stats: deps.userService.users.length };
});

try {
  dashboard();
} catch (error) {
  const traces = signal.trace(error);

  console.log(traces);
  // [
  //   { signal: "dbConnection", when: "compute:initial", async: true },
  //   { signal: "userService", when: "compute:dependency", async: false },
  //   { signal: "dashboard", when: "compute:dependency", async: false }
  // ]

  const errorPath = traces.map((t) => t.signal).join(" → ");
  console.log("Error path:", errorPath);
  // "dbConnection → userService → dashboard"
}
```

### Trace Properties

| Property | Type | Description |
|----------|------|-------------|
| `signal` | `string` | Signal's display name |
| `when` | `string` | When the error occurred |
| `async` | `boolean` | From Promise rejection? |
| `timestamp` | `number` | When error was captured |

### `when` Values

| Value | Description |
|-------|-------------|
| `compute:initial` | First lazy computation |
| `compute:dependency` | Dependency change triggered recompute |
| `compute:refresh` | Manual `.refresh()` call |
| `set` | During `.set()` |

---

## Error Recovery

### Refresh After Error

```tsx
const data = signal(async () => fetchData());

// Check error via task.from()
const state = task.from(data());
if (state.error) {
  data.refresh(); // Retry with new computation
  // or
  data.reset(); // Reset to initial state
}
```

### Conditional Error Handling

```tsx
const source = signal(-1);

const processed = signal({ source }, ({ deps }) => {
  if (deps.source < 0) throw new Error("Invalid value");
  return deps.source * 2;
});

// Fix by changing source
source.set(5);

// Error automatically cleared
console.log(processed.error()); // undefined
console.log(processed()); // 10
```

---

## Best Practices

```tsx
// ✅ Use fallback for graceful degradation
const config = signal(async () => fetchConfig(), {
  fallback: () => DEFAULT_CONFIG,
});

// ✅ Use onError for side effects
const data = signal(async () => fetchData(), {
  onError: (error) => logToSentry(error),
});

// ✅ Use tryGet() for inline handling
const value = mayFail.tryGet() ?? "default";

// ✅ Use signal.trace() for debugging
catch (error) {
  const traces = signal.trace(error);
  console.error("Path:", traces?.map(t => t.signal).join(" → "));
}

// ❌ Don't ignore errors in async signals
const bad = signal(async () => fetch("/api"));

// ✅ Always handle potential errors
const good = signal(async () => fetch("/api"), {
  onError: (e) => console.error(e),
});
```

---

## React Error Boundaries

Combine with React Error Boundaries for comprehensive error handling:

```tsx
import { ErrorBoundary, Suspense } from "react";

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        {rx(() => {
          const data = wait(asyncSignal());
          return <DataView data={data} />;
        })}
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## Next Steps

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Patterns](./PATTERNS.md)** - Advanced patterns & best practices


