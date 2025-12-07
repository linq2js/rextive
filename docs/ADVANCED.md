# Advanced Topics

This guide covers advanced patterns and techniques for power users who want to get the most out of Rextive. These patterns help with performance optimization, code organization, and building complex reactive systems.

---

## Table of Contents

- [Signals with React Context](#signals-with-react-context)
- [Service Pattern](#service-pattern)
- [Generic Type Utilities](#generic-type-utilities)
- [Custom Operators](#custom-operators)
- [Effect Signals](#effect-signals)
- [Performance Optimization](#performance-optimization)
- [Error Boundaries with Signals](#error-boundaries-with-signals)
- [Testing Signals](#testing-signals)
- [Debugging Tips](#debugging-tips)
- [Internal Architecture](#internal-architecture)

---

## Signals with React Context

React Context causes all consumers to re-render when any value changes. By combining signals with the `provider()` API, you get **surgical re-renders** - only components that access changed values update.

### Creating a Signal-Based Context

```tsx
import { signal, rx, provider, disposable } from "rextive/react";

// provider() returns a tuple: [useHook, Provider]
// - name: identifies the context in DevTools
// - create: factory function that receives the Provider's value prop
const [useTheme, ThemeProvider] = provider({
  name: "Theme",
  create: (initial: "light" | "dark") => {
    // Create reactive state
    const theme = signal(initial);

    // Create actions that modify state
    const toggle = () => theme.set((t) => (t === "light" ? "dark" : "light"));

    // disposable() ensures cleanup when provider unmounts
    return disposable({ theme, toggle });
  },
});

// Wrap your app (or part of it) with the Provider
// The value prop is passed to the create() function
function App() {
  return (
    <ThemeProvider value="dark">
      <Header />
      <Content />
    </ThemeProvider>
  );
}

// Consumers get access to the signals and actions
function Header() {
  // useTheme() returns what create() returned
  const { theme, toggle } = useTheme();

  return (
    <header>
      {/* Only this rx() block re-renders when theme changes */}
      {/* The button outside rx() never re-renders */}
      {rx(() => (
        <span>Theme: {theme()}</span>
      ))}
      <button onClick={toggle}>Toggle</button>
    </header>
  );
}
```

### Why This Is Better Than Traditional Context

```tsx
// ❌ Traditional Context: ALL consumers re-render when context changes
// Even if a consumer only uses 'theme', it re-renders when 'user' changes
const ThemeContext = createContext({ theme: "dark", user: null });

function Consumer() {
  const { theme } = useContext(ThemeContext);
  return <div>{theme}</div>; // Re-renders when ANY context value changes!
}

// ✅ Rextive: Only rx() blocks that access changed signals re-render
// If 'user' changes but 'theme' doesn't, this component stays untouched
function Consumer() {
  const { theme } = useTheme();
  return rx(() => <div>{theme()}</div>); // Only re-renders when theme changes
}
```

---

## Service Pattern

The service pattern organizes related state, computed values, and actions into cohesive units. Services can be:

- **Global singletons** - Shared across the entire app
- **Scoped instances** - Created per component with `useScope(key, factory)`

This pattern is similar to Zustand stores but with automatic dependency tracking.

### Creating a Service

```tsx
import { signal, disposable } from "rextive";

// A service is just a factory function that returns signals and actions
function createAuthService() {
  // Primary state - the source of truth
  const user = signal<User | null>(null);

  // Derived state - automatically updates when user changes
  // No need to manually sync these values!
  const isAuthenticated = user.to((u) => u !== null);
  const isAdmin = user.to((u) => u?.role === "admin");

  // Actions - functions that modify state
  const login = async (credentials: Credentials) => {
    const userData = await api.login(credentials);
    user.set(userData);
    // isAuthenticated and isAdmin automatically update!
  };

  const logout = () => {
    user.set(null);
  };

  // disposable() collects all signals for automatic cleanup
  // It also provides a dispose() method to clean up everything
  return disposable({
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  });
}

// OPTION 1: Global singleton - shared across entire app
// Create once at module level, import anywhere
export const authService = createAuthService();

// OPTION 2: Scoped instance - created per component
// Automatically disposed when component unmounts
function LoginPage() {
  const auth = useScope("loginPage", createAuthService);
  // auth is a fresh instance, disposed on unmount
}
```

---

## Generic Type Utilities

When building utilities or libraries that work with signals, you need types that accept both mutable and computed signals.

### `AnySignal<T>` - Accept Any Signal Type

```tsx
import { AnySignal, signal } from "rextive";

// AnySignal<T> is a union of Mutable<T> and Computed<T>
// Use it when your function works with both types

function logChanges<T>(s: AnySignal<T>, label: string) {
  // .on() and .get() work on both mutable and computed
  return s.on(() => console.log(`[${label}]`, s()));
}

// Type narrowing with is()
import { is } from "rextive";

function maybeReset<T>(s: AnySignal<T>) {
  // is() narrows the type so TypeScript knows .reset() is available
  if (is(s, "mutable")) {
    s.reset(); // ✅ TypeScript knows this is a Mutable signal
  }
  // For computed signals, you might use .refresh() instead
  if (is(s, "computed")) {
    s.refresh(); // ✅ TypeScript knows this is a Computed signal
  }
}
```

### Building a Signal Registry

A common pattern is tracking signals for debugging or cleanup:

```tsx
class SignalRegistry {
  private signals = new Map<string, AnySignal<any>>();

  // Register a signal with a name for tracking
  register<T>(name: string, sig: AnySignal<T>) {
    this.signals.set(name, sig);
    // Log all changes for debugging
    sig.on(() => console.log(`${name} changed:`, sig()));
  }

  // Dispose a specific signal
  dispose(name: string) {
    this.signals.get(name)?.dispose();
    this.signals.delete(name);
  }

  // Clean up everything (e.g., on app shutdown)
  disposeAll() {
    this.signals.forEach((s) => s.dispose());
    this.signals.clear();
  }
}

// Usage
const registry = new SignalRegistry();
registry.register("user", userSignal);
registry.register("cart", cartSignal);
// Later: registry.disposeAll();
```

---

## Custom Operators

Operators are functions that transform one signal into another. Rextive includes built-in operators (`debounce`, `throttle`, `filter`, etc.), but you can create your own.

### Simple Operator

An operator is a function that takes a signal and returns a new signal:

```tsx
import { signal, AnySignal } from "rextive";

// Simple operator - just wraps .to()
const double = (source: AnySignal<number>) => {
  return source.to((x) => x * 2);
};

// Usage with .pipe()
const count = signal(5);
const doubled = count.pipe(double); // 10
```

### Configurable Operator (Factory Pattern)

For operators that need configuration, use a factory function:

```tsx
// Factory returns the actual operator
// This is called "currying" - clamp(0, 100) returns an operator function
const clamp = (min: number, max: number) => (source: AnySignal<number>) => {
  return source.to((x) => Math.min(max, Math.max(min, x)));
};

// Usage - chain multiple operators
const count = signal(50);
const result = count.pipe(
  clamp(0, 100), // First: clamp between 0-100
  double // Then: double the result
);
// count=50 → clamped=50 → doubled=100
```

### Custom Timing Operators

For advanced scheduling, you can create operators that control when updates happen:

```tsx
// Schedule updates during browser idle time
// Great for non-critical updates that shouldn't block the UI
const idleScheduler = (notify: () => void) => {
  let scheduled = false;
  return () => {
    if (!scheduled) {
      scheduled = true;
      // requestIdleCallback runs when browser is idle
      requestIdleCallback(() => {
        scheduled = false;
        notify();
      });
    }
  };
};

// pace() accepts a custom scheduler
const batchedUpdates = source.pipe(pace(idleScheduler));
```

---

## Effect Signals

While signals are primarily for state, you can create signals that trigger side effects. This is useful for:

- **Polling** - Periodically fetching data
- **Auto-refresh** - Updating data on a timer
- **Self-updating values** - Clocks, counters, etc.

### Auto-Incrementing Counter

```tsx
const count = signal(0);

// This computed signal has a side effect: it increments count
// and schedules itself to run again
const autoIncrement = signal(
  ({ refresh }) => {
    // Side effect: increment the counter
    count.set((prev) => prev + 1);

    // Schedule next refresh in 5 seconds
    // refresh() triggers recomputation
    setTimeout(refresh, 5000);

    // Computed signals must return a value
    return count();
  },
  { lazy: false } // lazy: false means compute immediately on creation
);
```

### Polling Data

A common pattern for keeping data fresh:

```tsx
const pollData = signal(
  async ({ refresh, abortSignal }) => {
    // Fetch data (abortSignal cancels if signal is disposed)
    const response = await fetch("/api/data", { signal: abortSignal });
    const data = await response.json();

    // Schedule next poll in 30 seconds
    setTimeout(refresh, 30000);

    return data;
  },
  { lazy: false } // Start polling immediately
);

// To stop polling, just dispose the signal
// pollData.dispose();
```

> **Note:** For production apps, consider using `rextive/cache` with TTL options instead of manual polling.

---

## Performance Optimization

Rextive is fast by default, but these techniques help with demanding scenarios.

### Batch Updates

When updating multiple signals, notifications are batched automatically within the same synchronous execution. For explicit control:

```tsx
// Without batch: could trigger 3 separate notifications
field1.set("value1");
field2.set("value2");
field3.set("value3");

// With batch: guaranteed single notification
signal.batch(() => {
  field1.set("value1");
  field2.set("value2");
  field3.set("value3");
});
// Subscribers are notified once, AFTER the batch completes
```

### Custom Equality

Prevent unnecessary updates by customizing how signals detect changes:

```tsx
// PROBLEM: lastSeen changes constantly but we only care about ID changes
const user = signal({ id: 1, name: "Alice", lastSeen: Date.now() });
user.set({ id: 1, name: "Alice", lastSeen: Date.now() }); // Triggers update!

// SOLUTION: Custom equality that only compares ID
const user = signal(
  { id: 1, name: "Alice", lastSeen: Date.now() },
  {
    equals: (a, b) => a.id === b.id, // Only update when ID changes
  }
);
user.set({ id: 1, name: "Alice", lastSeen: Date.now() }); // No update!

// Built-in equality strategies:
const config = signal(complexConfig, "deep"); // Deep comparison (slow but thorough)
const form = signal({ name: "", email: "" }, "shallow"); // Compare top-level keys
const count = signal(0, "strict"); // Object.is (default)
```

### Pause Expensive Computations

Temporarily disable a computed signal during bulk updates:

```tsx
const data = signal(largeDataset);
const expensive = signal({ data }, ({ deps }) => {
  return expensiveComputation(deps.data); // Takes 100ms
});

// PROBLEM: 10 data updates = 10 expensive recomputations = 1 second!
for (const item of items) {
  data.set(updateData(item));
}

// SOLUTION: Pause, update, resume - computes only once
expensive.pause(); // Disable recomputation
for (const item of items) {
  data.set(updateData(item)); // No recomputation
}
expensive.resume(); // Single recomputation with final data
```

---

## Error Boundaries with Signals

React Error Boundaries catch errors during rendering. When combined with async signals and Suspense, you get a clean error recovery pattern.

```tsx
import { signal, rx, wait } from "rextive/react";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";

// Async signal that might fail
const asyncSignal = signal(async ({ abortSignal }) => {
  const response = await fetch("/api/data", { signal: abortSignal });
  if (!response.ok) throw new Error("Failed to fetch");
  return response.json();
});

function DataComponent() {
  return (
    <ErrorBoundary
      // Render when error is caught
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
      // Called when user clicks "Retry" - refresh the signal
      onReset={() => asyncSignal.refresh()}
    >
      {/* Suspense shows loading state while Promise is pending */}
      <Suspense fallback={<Loading />}>
        {rx(() => {
          // wait() throws Promise for Suspense, or re-throws errors
          const data = wait(asyncSignal());
          return <DataView data={data} />;
        })}
      </Suspense>
    </ErrorBoundary>
  );
}

// Flow:
// 1. Signal starts loading → Suspense shows <Loading />
// 2. If success → DataView renders
// 3. If error → ErrorBoundary catches, shows error + retry button
// 4. User clicks retry → onReset calls refresh() → back to step 1
```

---

## Testing Signals

Signals are easy to test - they're just objects with methods. No special test utilities needed.

```tsx
import { signal } from "rextive";
import { vi, describe, it, expect } from "vitest";

describe("Counter", () => {
  // Test basic state management
  it("should increment", () => {
    const count = signal(0);
    count.set((x) => x + 1);
    expect(count()).toBe(1);
  });

  // Test subscriptions with mocks
  it("should notify on change", () => {
    const count = signal(0);
    const listener = vi.fn(); // Mock function

    count.on(listener);
    count.set(5);

    // Listener called once (not for initial value, only for changes)
    expect(listener).toHaveBeenCalledTimes(1);
  });

  // Test computed/derived signals
  it("should compute derived values", () => {
    const count = signal(5);
    const doubled = count.to((x) => x * 2);

    expect(doubled()).toBe(10);

    // Change source → derived updates automatically
    count.set(10);
    expect(doubled()).toBe(20);
  });

  // Test async signals - just await the value
  it("should handle async", async () => {
    const userId = signal(1);
    const user = signal({ userId }, async ({ deps }) => {
      // In real tests, you'd mock the API call
      return { id: deps.userId, name: `User ${deps.userId}` };
    });

    // Async signals return Promises - just await them
    const result = await user();
    expect(result.name).toBe("User 1");
  });

  // Test cleanup
  it("should clean up on dispose", () => {
    const count = signal(0);
    const listener = vi.fn();

    count.on(listener);
    count.dispose();
    count.set(5); // No-op after dispose

    expect(listener).not.toHaveBeenCalled();
  });
});
```

---

## Debugging Tips

### Name Your Signals

Names appear in DevTools and error messages. Always name signals in production code:

```tsx
// Without names - hard to debug
const count = signal(0);
const user = signal(null);

// With names - appears in DevTools and error traces
const count = signal(0, { name: "counter" });
const user = signal(null, { name: "currentUser" });

// Names are also used in auto-generated computed signals
const doubled = count.to((x) => x * 2); // Auto-named "counter.to"
```

### Error Traces

When errors propagate through signals, Rextive attaches trace information:

```tsx
try {
  dashboard(); // Computed signal that might throw
} catch (error) {
  // signal.trace() returns the error path through signals
  const traces = signal.trace(error);

  // traces = [
  //   { signal: "api", when: "compute:initial", async: true },
  //   { signal: "userData", when: "compute:dependency", async: false },
  //   { signal: "dashboard", when: "compute:dependency", async: false }
  // ]

  console.log("Error path:", traces.map((t) => t.signal).join(" → "));
  // "api → userData → dashboard"

  console.log("Origin:", traces[0].signal); // "api" - where error started
  console.log("Context:", traces[0].when); // "compute:initial"
  console.log("Async?:", traces[0].async); // true - was a Promise rejection
}
```

### DevTools Panel

Visual debugging for all signals in your app:

```tsx
import { enableDevTools, DevToolsPanel } from "rextive/devtools";

// Call this BEFORE creating signals (e.g., in your entry file)
enableDevTools();

function App() {
  return (
    <>
      <YourApp />
      {/* Show panel only in development */}
      {process.env.NODE_ENV === "development" && <DevToolsPanel />}
    </>
  );
}

// DevTools shows:
// - All signals with current values
// - Value history for each signal
// - Error states with context (when:filter, when:reducer, etc.)
// - Chain reactions (which signals trigger which)
// - Tags and signal groupings
```

---

## Internal Architecture

> **Note:** This section is for library contributors and advanced users who want to extend Rextive. Most users don't need this.

### Hooks System (`src/hooks.ts`)

The hooks system provides integration points for:

1. **Render tracking** - How `rx()` knows which signals were accessed
2. **DevTools monitoring** - How DevTools tracks signal lifecycle events

#### Render Hooks (for `rx()` auto-tracking)

When you use `rx(() => ...)`, Rextive needs to know which signals are accessed inside the function. It does this by temporarily installing "render hooks":

```tsx
import { RenderHooks, getRenderHooks, withRenderHooks } from "./hooks";

// RenderHooks interface - called when signals are read
interface RenderHooks {
  onSignalAccess: (signal: AnySignal<any>) => void;
  onTaskAccess: (task: Task<any>) => void;
}

// How rx() works internally:
function rx(fn: () => ReactNode) {
  const accessedSignals = new Set<AnySignal<any>>();

  // Execute fn with hooks that track which signals are accessed
  const result = withRenderHooks(
    {
      onSignalAccess: (signal) => accessedSignals.add(signal),
    },
    () => fn() // Any signal() calls inside fn trigger onSignalAccess
  );

  // Now accessedSignals contains all signals used in fn
  // Subscribe to them for re-renders
  accessedSignals.forEach((s) => s.on(() => rerender()));

  return result;
}
```

#### DevTools Hooks (for monitoring)

DevTools registers hooks to monitor all signal activity:

```tsx
import { DevToolsHooks, setDevToolsHooks, hasDevTools, emit } from "./hooks";

// DevToolsHooks interface - all lifecycle events
interface DevToolsHooks {
  onSignalCreate: (signal: SignalRef) => void;
  onSignalChange: (signal: SignalRef, value: unknown) => void;
  onSignalError: (signal: SignalRef, error: unknown) => void;
  onSignalDispose: (signal: SignalRef) => void;
  onSignalRename: (signal: SignalRef) => void;
  onTagCreate: (tag: TagRef) => void;
  onTagAdd: (tag: TagRef, signal: AnySignal<any>) => void;
  onTagRemove: (tag: TagRef, signal: AnySignal<any>) => void;
}

// enableDevTools() registers these hooks
setDevToolsHooks({
  onSignalCreate: (signal) => {
    /* add to registry */
  },
  onSignalChange: (signal, value) => {
    /* log to history */
  },
  onSignalError: (signal, error) => {
    /* track error with context */
  },
});

// Core signal code emits events via emit.*
// These are no-ops if DevTools isn't enabled
emit.signalCreate(signalRef);
emit.signalChange(signalRef, newValue);
emit.signalError(signalRef, error); // Includes error context (when, async)
```

#### API Reference

| Export               | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `RenderHooks`        | Interface for render-time signal access tracking |
| `getRenderHooks()`   | Get current render hooks (or default no-ops)     |
| `withRenderHooks()`  | Execute function with custom render hooks        |
| `DevToolsHooks`      | Interface for devtools monitoring                |
| `setDevToolsHooks()` | Register devtools hooks (called once at startup) |
| `hasDevTools()`      | Check if devtools is enabled                     |
| `emit`               | Object with methods to emit devtools events      |

---

## Next Steps

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Examples](./EXAMPLES.md)** - Real-world examples
- **[Patterns](./PATTERNS.md)** - Common patterns
