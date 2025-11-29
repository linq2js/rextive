# Advanced Topics

Advanced patterns and techniques for power users.

---

## Signals with React Context

Combine signals with React Context for optimized rendering:

```tsx
import { signal, rx, provider, disposable } from "rextive/react";

// Create signal-based context
const [useTheme, ThemeProvider] = provider({
  name: "Theme",
  create: (initial: "light" | "dark") => {
    const theme = signal(initial);
    const toggle = () => theme.set((t) => (t === "light" ? "dark" : "light"));
    return disposable({ theme, toggle });
  },
});

// Provider at root
function App() {
  return (
    <ThemeProvider value="dark">
      <Header />
      <Content />
    </ThemeProvider>
  );
}

// Consumers only re-render when they access signal values
function Header() {
  const { theme, toggle } = useTheme();

  // Only this rx() block re-renders on theme change
  return (
    <header>
      {rx(() => (
        <span>Theme: {theme()}</span>
      ))}
      <button onClick={toggle}>Toggle</button>
    </header>
  );
}
```

### Benefits Over Traditional Context

```tsx
// ❌ Traditional Context: ALL consumers re-render
const ThemeContext = createContext({ theme: "dark" });

function Consumer() {
  const { theme } = useContext(ThemeContext);
  return <div>{theme}</div>; // Re-renders when ANY context value changes
}

// ✅ Rextive: Only rx() blocks that access changed signals re-render
function Consumer() {
  const { theme } = useTheme();
  return rx(() => <div>{theme()}</div>); // Only re-renders when theme changes
}
```

---

## Service Pattern

Organize state into reusable services:

```tsx
import { signal, disposable } from "rextive";

// Define a service
function createAuthService() {
  const user = signal<User | null>(null);
  const isAuthenticated = user.to((u) => u !== null);
  const isAdmin = user.to((u) => u?.role === "admin");

  const login = async (credentials: Credentials) => {
    const userData = await api.login(credentials);
    user.set(userData);
  };

  const logout = () => {
    user.set(null);
  };

  return disposable({
    user,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  });
}

// Use globally
export const authService = createAuthService();

// Or per-component with useScope
function LoginPage() {
  const auth = useScope(createAuthService);
  // ...
}
```

---

## Generic Type Utilities

### `AnySignal<T>` for Generic Functions

```tsx
import { AnySignal, signal } from "rextive";

// Works with both mutable and computed signals
function logChanges<T>(s: AnySignal<T>, label: string) {
  return s.on(() => console.log(`[${label}]`, s()));
}

// Type narrowing for specific operations
function maybeReset<T>(s: AnySignal<T>) {
  if (signal.is(s, "mutable")) {
    s.reset(); // Only available on mutable
  }
}
```

### Signal Registries

```tsx
class SignalRegistry {
  private signals = new Map<string, AnySignal<any>>();

  register<T>(name: string, sig: AnySignal<T>) {
    this.signals.set(name, sig);
    sig.on(() => console.log(`${name} changed`));
  }

  dispose(name: string) {
    this.signals.get(name)?.dispose();
    this.signals.delete(name);
  }

  disposeAll() {
    this.signals.forEach((s) => s.dispose());
    this.signals.clear();
  }
}
```

---

## Custom Operators

Create your own operators:

```tsx
import { signal } from "rextive";

// Simple operator
const double = (source: Signal<number>) => {
  return source.to((x) => x * 2);
};

// Configurable operator
const clamp = (min: number, max: number) => (source: Signal<number>) => {
  return source.to((x) => Math.min(max, Math.max(min, x)));
};

// Usage
const count = signal(50);
const clamped = count.pipe(clamp(0, 100), double);
```

### Custom Timing Operators

```tsx
// Idle callback scheduler
const idleScheduler = (notify) => {
  let scheduled = false;
  return () => {
    if (!scheduled) {
      scheduled = true;
      requestIdleCallback(() => {
        scheduled = false;
        notify();
      });
    }
  };
};

const batchedUpdates = source.pipe(pace(idleScheduler));
```

---

## Effect Signals

Create signals that perform side effects:

```tsx
// Auto-incrementing counter
const count = signal(0);

const autoIncrement = signal(
  ({ refresh }) => {
    count.set((prev) => prev + 1);
    setTimeout(refresh, 5000); // Refresh every 5 seconds
    return count(); // Must return a value
  },
  { lazy: false } // Start immediately
);

// Polling data
const pollData = signal(
  async ({ refresh, abortSignal }) => {
    const data = await fetch("/api/data", { signal: abortSignal });
    setTimeout(refresh, 30000); // Poll every 30 seconds
    return data.json();
  },
  { lazy: false }
);
```

---

## Performance Optimization

### Batch Updates

```tsx
signal.batch(() => {
  field1.set("value1");
  field2.set("value2");
  field3.set("value3");
});
// Single notification instead of 3
```

### Custom Equality

```tsx
// Only update when ID changes
const user = signal(
  { id: 1, name: "Alice", lastSeen: Date.now() },
  {
    equals: (a, b) => a.id === b.id,
  }
);

// Deep equality for complex objects
const config = signal(complexConfig, "deep");

// Shallow for simple objects
const form = signal({ name: "", email: "" }, "shallow");
```

### Pause Expensive Computations

```tsx
const expensive = signal({ data }, ({ deps }) => {
  return expensiveComputation(deps.data);
});

// Pause during batch operations
expensive.pause();
// ... multiple data updates ...
expensive.resume(); // Computes once
```

---

## Error Boundaries with Signals

```tsx
import { signal, rx, wait, loadable } from "rextive/react";
import { ErrorBoundary } from "react-error-boundary";

function DataComponent() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
      onReset={() => asyncSignal.refresh()}
    >
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

## Testing Signals

```tsx
import { signal } from "rextive";
import { vi, describe, it, expect } from "vitest";

describe("Counter", () => {
  it("should increment", () => {
    const count = signal(0);
    count.set((x) => x + 1);
    expect(count()).toBe(1);
  });

  it("should notify on change", () => {
    const count = signal(0);
    const listener = vi.fn();

    count.on(listener);
    count.set(5);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should compute derived values", () => {
    const count = signal(5);
    const doubled = count.to((x) => x * 2);

    expect(doubled()).toBe(10);

    count.set(10);
    expect(doubled()).toBe(20);
  });

  it("should handle async", async () => {
    const userId = signal(1);
    const user = signal({ userId }, async ({ deps }) => {
      return { id: deps.userId, name: `User ${deps.userId}` };
    });

    const result = await user();
    expect(result.name).toBe("User 1");
  });
});
```

---

## Debugging Tips

### Named Signals

```tsx
const count = signal(0, { name: "counter" });
const user = signal(null, { name: "currentUser" });
```

### Error Traces

```tsx
try {
  dashboard();
} catch (error) {
  const traces = signal.trace(error);
  console.log("Error path:", traces.map((t) => t.signal).join(" → "));
  console.log("Origin:", traces[0]);
  console.log("Full trace:", traces);
}
```

### DevTools

```tsx
import { enableDevTools, DevToolsPanel } from "rextive/devtools";

enableDevTools();

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && <DevToolsPanel />}
    </>
  );
}
```

---

## Internal Architecture

### Hooks System (`src/hooks.ts`)

The hooks system provides centralized integration points for render tracking and devtools. This is useful for contributors or those extending the library.

#### Render Hooks (for `rx()` auto-tracking)

```tsx
import { RenderHooks, getRenderHooks, withRenderHooks } from "./hooks";

// RenderHooks interface
interface RenderHooks {
  onSignalAccess: (signal: AnySignal<any>) => void;
  onLoadableAccess: (loadable: Loadable<any>) => void;
}

// Get current render hooks
const hooks = getRenderHooks();

// Execute with custom render hooks (used by rx())
withRenderHooks(
  {
    onSignalAccess: (signal) => accessedSignals.add(signal),
  },
  () => {
    return renderFn();
  }
);
```

#### DevTools Hooks (for monitoring)

```tsx
import { DevToolsHooks, setDevToolsHooks, hasDevTools, emit } from "./hooks";

// DevToolsHooks interface
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

// Register devtools hooks (called by enableDevTools)
setDevToolsHooks({
  onSignalCreate: (signal) => {
    /* track */
  },
  onSignalChange: (signal, value) => {
    /* log */
  },
});

// Emit events from core code
emit.signalCreate(signalRef);
emit.signalChange(signalRef, newValue);
emit.signalError(signalRef, error);
```

#### Key Concepts

| Export               | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `RenderHooks`        | Interface for render-time signal access tracking |
| `getRenderHooks()`   | Get current render hooks                         |
| `withRenderHooks()`  | Execute function with custom render hooks        |
| `DevToolsHooks`      | Interface for devtools monitoring                |
| `setDevToolsHooks()` | Register devtools hooks (called once)            |
| `hasDevTools()`      | Check if devtools is enabled                     |
| `emit`               | Object with methods to emit devtools events      |

---

## Next Steps

- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Examples](./EXAMPLES.md)** - Real-world examples
- **[Patterns](./PATTERNS.md)** - Common patterns
