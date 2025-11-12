# 🎯 rxblox

Fine-grained reactive state management for React with signals, computed values, and reactive components.

[![npm version](https://img.shields.io/npm/v/rxblox.svg)](https://www.npmjs.com/package/rxblox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why rxblox?

Traditional React state management re-renders entire component trees when state changes. **rxblox** provides fine-grained reactivity - only the exact UI elements that depend on changed state will update.

```tsx
// ❌ Traditional React - entire component re-renders
function Counter() {
  const [count, setCount] = useState(0);
  console.log("Component rendered"); // Logs on every state change
  return <div>{count}</div>;
}

// ✅ rxblox - only the reactive expression updates
function Counter() {
  const count = signal(0);
  console.log("Component rendered"); // Logs once
  return <div>{rx(() => count())}</div>; // Only this updates
}
```

### Key Features

- 🎯 **Fine-grained reactivity** - Update only what changed, not entire components
- 🚀 **Signals** - Simple, powerful reactive primitives
- 🔄 **Computed values** - Automatic dependency tracking and memoization
- ⚡ **Zero-cost abstractions** - Efficient updates with minimal overhead
- 🎨 **Reactive components** - Build components that automatically track dependencies
- 🔌 **Dependency injection** - Provider pattern without Context re-render overhead
- 🧹 **Automatic cleanup** - No memory leaks, subscriptions cleaned up automatically
- 📦 **TypeScript first** - Full type safety out of the box
- 🪶 **Lightweight** - Minimal bundle size

## Installation

```bash
npm install rxblox
# or
pnpm add rxblox
# or
yarn add rxblox
```

## Quick Start

```tsx
import { signal, rx } from "rxblox";

const count = signal(0);

function Counter() {
  return (
    <div>
      {/* Only this reactive expression updates when count changes */}
      {rx(() => (
        <h1>Count: {count()}</h1>
      ))}

      <button onClick={() => count.set(count() + 1)}>Increment</button>
    </div>
  );
}
```

## Core Concepts

### 1. Signals - Reactive State Primitives

Signals are reactive containers for values. They track subscribers and notify them when values change.

```tsx
import { signal } from "rxblox";

// Create a signal
const count = signal(0);

// Read the current value
const value = count(); // 0

// Update the value
count.set(10);

// Update with a function (immutable updates via immer)
count.set((prev) => prev + 1);

// Peek without tracking as dependency
const current = count.peek();

// Subscribe to changes
const unsubscribe = count.on((newValue) => {
  console.log("Count changed:", newValue);
});

// Cleanup
unsubscribe();
```

### 2. Computed Signals - Derived State

Computed signals automatically track dependencies and recompute when dependencies change.

```tsx
const firstName = signal("John");
const lastName = signal("Doe");

// Automatically recomputes when firstName or lastName changes
const fullName = signal(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "John Doe"

firstName.set("Jane");
console.log(fullName()); // "Jane Doe" - recomputed automatically
```

**Computed signals are lazy** - they only recompute when accessed and cache their result.

### 3. Effects - Side Effects with Auto-Tracking

Effects run side effects when their signal dependencies change. They automatically track which signals they access.

```tsx
import { signal, effect } from "rxblox";

const count = signal(0);

effect(() => {
  console.log("Count is:", count());

  // Optional: return cleanup function
  return () => {
    console.log("Effect cleanup");
  };
});

count.set(5); // Logs: "Count is: 5"
```

### 4. Reactive Expressions - `rx()`

Use `rx()` to create reactive UI that updates when signals change, without re-rendering the parent component.

```tsx
import { signal, rx } from "rxblox";

const count = signal(0);
const doubled = signal(() => count() * 2);

function App() {
  // Parent component renders once
  console.log("App rendered");

  return (
    <div>
      {/* Only this updates when signals change */}
      {rx(() => (
        <div>
          <p>Count: {count()}</p>
          <p>Doubled: {doubled()}</p>
        </div>
      ))}
      <button onClick={() => count.set(count() + 1)}>+1</button>
    </div>
  );
}
```

### 5. Reactive Components - `blox()`

`blox()` creates reactive components where props become signals and effects are automatically managed.

```tsx
import { blox, signal, rx, effect } from "rxblox";

interface CounterProps {
  initialCount: number;
  label: string;
}

const Counter = blox<CounterProps>((props) => {
  // Local state as signal
  const count = signal(props.initialCount);

  // Effect with automatic cleanup
  effect(() => {
    if (count() === 10) {
      console.log("Reached 10!");
    }
  });

  // Props are automatically signals
  effect(() => {
    console.log("Label changed:", props.label);
  });

  return (
    <div>
      <h3>{props.label}</h3>
      {rx(() => (
        <div>Count: {count()}</div>
      ))}
      <button onClick={() => count.set(count() + 1)}>+</button>
    </div>
  );
});

// Use it
<Counter initialCount={0} label="My Counter" />;
```

**Key differences from regular React components:**

- Props are accessed as signals - `props.label` tracks the prop as a dependency
- Effects created inside are automatically cleaned up on unmount
- Local signals persist across prop changes (only re-initialize on mount)

### 6. Providers - Dependency Injection

Providers inject values down the component tree without causing re-renders like React Context.

```tsx
import { provider, blox, rx, useState } from "rxblox";

// Create provider (returns [useValue, Provider])
const [useTheme, ThemeProvider] = provider(
  "theme",
  "light" as "light" | "dark"
);

// Consumer component
const ThemeDisplay = blox(() => {
  const theme = useTheme(); // Returns Signal<"light" | "dark"> (read-only)

  // ✅ Can read the value
  // ❌ Cannot set: theme.set("dark") would be a TypeScript error

  // Only this rx() updates when theme changes
  return rx(() => (
    <div
      style={{
        background: theme() === "light" ? "#fff" : "#333",
        color: theme() === "light" ? "#000" : "#fff",
      }}
    >
      Current theme: {theme()}
    </div>
  ));
});

function App() {
  const [theme, setTheme] = useState("light");

  return (
    <ThemeProvider value={theme}>
      <ThemeDisplay />
      <button
        onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
      >
        Toggle Theme
      </button>
    </ThemeProvider>
  );
}
```

**Important Notes:**

- **Read-only for consumers**: `useTheme()` returns `Signal<T>` (read-only), not `MutableSignal<T>`. Consumers can only read values, not update them. Only the parent component providing the value can change it.
- **Selective reactivity**: Unlike React Context, the component itself doesn't re-render when provider value changes. Only `rx()` expressions or `effect()` calls that access the value will react.

## API Reference

### `signal<T>(value, options?)`

Creates a reactive signal.

```tsx
// Static value
const count = signal(0);

// Computed value (auto-tracks dependencies)
const doubled = signal(() => count() * 2);

// With custom equality
const user = signal(
  { id: 1, name: "John" },
  { equals: (a, b) => a.id === b.id }
);
```

**Methods:**

- `signal()` - Read value and track as dependency
- `signal.peek()` - Read value without tracking
- `signal.set(value | updater)` - Update value
- `signal.on(listener)` - Subscribe to changes (returns unsubscribe function)
- `signal.reset()` - Clear cache and recompute (for computed signals)

### `effect(fn)`

Creates a reactive effect that runs when dependencies change.

```tsx
const cleanup = effect(() => {
  console.log("Count:", count());

  // Optional cleanup
  return () => console.log("Cleanup");
});

// Manually run effect
cleanup.run();
```

**Returns:** Effect object with `run()` method

### `rx(expression)`

Creates a reactive expression that re-renders when dependencies change.

```tsx
{
  rx(() => <div>{count()}</div>);
}

// Can access multiple signals
{
  rx(() => (
    <div>
      {firstName()} {lastName()} - Count: {count()}
    </div>
  ));
}
```

**Returns:** ReactNode

### `blox<Props>(builder)`

Creates a reactive component.

```tsx
const MyComponent = blox<{ value: number }>((props) => {
  const local = signal(props.value);

  effect(() => {
    console.log("Props changed:", props.value);
  });

  return <div>{rx(() => local())}</div>;
});

// With imperative handle
interface Handle {
  reset: () => void;
}

const MyComponent = blox<Props, Handle>((props, handle) => {
  const count = signal(0);

  handle.current = {
    reset: () => count.set(0),
  };

  return <div>{rx(() => count())}</div>;
});

const ref = useRef<Handle>();
<MyComponent ref={ref} />;
ref.current?.reset();
```

**Returns:** Memoized React component

### `provider<T>(name, initialValue, options?)`

Creates a provider for dependency injection.

```tsx
const [useValue, Provider] = provider("myValue", 0);

// In parent
<Provider value={currentValue}>
  <Child />
</Provider>;

// In child (inside blox component)
const MyChild = blox(() => {
  const value = useValue(); // Returns Signal<T> (read-only, no .set() or .reset())

  // ✅ Can read the value
  return rx(() => <div>{value()}</div>);

  // ❌ Cannot mutate (TypeScript error)
  // value.set(newValue); // Error: Property 'set' does not exist
});
```

**Returns:** Tuple of `[useValue, ProviderComponent]`

### `unmount(callback)`

Register cleanup callback that runs on component unmount (inside `blox` only).

```tsx
const MyComponent = blox(() => {
  unmount(() => {
    console.log("Cleanup on unmount");
  });

  return <div>Content</div>;
});
```

## Composable Logic with `blox`

One of the most powerful features of `blox` is the ability to extract and reuse reactive logic. Since signals, effects, and `unmount` can be used anywhere (not just in React components), you can create composable logic functions.

### Basic Composable Logic

```tsx
import { signal, effect, unmount, blox } from "rxblox";

// Reusable logic function
function useCounter(initialValue = 0) {
  const count = signal(initialValue);
  const doubled = signal(() => count() * 2);

  effect(() => {
    console.log("Count changed:", count());
  });

  const increment = () => count.set(count() + 1);
  const decrement = () => count.set(count() - 1);
  const reset = () => count.set(initialValue);

  return {
    count,
    doubled,
    increment,
    decrement,
    reset,
  };
}

// Use in multiple components
const Counter1 = blox(() => {
  const counter = useCounter(0);

  return (
    <div>
      {rx(() => (
        <div>Count: {counter.count()}</div>
      ))}
      <button onClick={counter.increment}>+</button>
    </div>
  );
});

const Counter2 = blox(() => {
  const counter = useCounter(10);

  return (
    <div>
      {rx(() => (
        <div>Doubled: {counter.doubled()}</div>
      ))}
      <button onClick={counter.decrement}>-</button>
    </div>
  );
});
```

### Logic with Cleanup

Use `unmount()` to register cleanup callbacks that run when the component unmounts:

```tsx
function useWebSocket(url: string) {
  const messages = signal<string[]>([]);
  const connected = signal(false);

  const ws = new WebSocket(url);

  ws.onopen = () => connected.set(true);
  ws.onclose = () => connected.set(false);
  ws.onmessage = (event) => {
    messages.set((prev) => [...prev, event.data]);
  };

  // Register cleanup - ws will be closed when component unmounts
  unmount(() => {
    ws.close();
  });

  const send = (message: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  };

  return {
    messages,
    connected,
    send,
  };
}

// Use in component
const Chat = blox<{ roomId: string }>((props) => {
  const ws = useWebSocket(`wss://example.com/room/${props.roomId}`);

  return (
    <div>
      {rx(() => (
        <div>
          {ws.connected() ? "Connected" : "Disconnected"}
          <ul>
            {ws.messages().map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      ))}
      <button onClick={() => ws.send("Hello")}>Send</button>
    </div>
  );
});
```

### Multiple Subscriptions with Cleanup

You can register multiple cleanup callbacks using `unmount()`:

```tsx
function useMultipleSubscriptions() {
  const s1 = signal(0);
  const s2 = signal(0);
  const combined = signal(() => s1() + s2());

  // Subscribe to external signal and cleanup on unmount
  const externalSignal = globalStore.someSignal;
  unmount(
    externalSignal.on((value) => {
      s1.set(value);
    })
  );

  // Subscribe to another signal
  const anotherSignal = globalStore.anotherSignal;
  unmount(
    anotherSignal.on((value) => {
      s2.set(value);
    })
  );

  // You can also register non-subscription cleanup
  unmount(() => {
    console.log("Component unmounted, cleaning up");
  });

  return {
    s1,
    s2,
    combined,
  };
}

const Component = blox(() => {
  const data = useMultipleSubscriptions();

  return rx(() => <div>Combined: {data.combined()}</div>);
});
```

### Complex State Logic

Extract complex state machines or business logic:

```tsx
function useAuthState() {
  const user = signal<User | null>(null);
  const loading = signal(false);
  const error = signal<string | null>(null);

  const isAuthenticated = signal(() => user() !== null);
  const isGuest = signal(() => user() === null);

  effect(() => {
    // Auto-save user to localStorage
    const currentUser = user();
    if (currentUser) {
      localStorage.setItem("user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("user");
    }
  });

  const login = async (email: string, password: string) => {
    loading.set(true);
    error.set(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error("Login failed");

      const userData = await response.json();
      user.set(userData);
    } catch (err) {
      error.set(err instanceof Error ? err.message : "Login failed");
    } finally {
      loading.set(false);
    }
  };

  const logout = () => {
    user.set(null);
  };

  // Load user from localStorage on initialization
  const savedUser = localStorage.getItem("user");
  if (savedUser) {
    user.set(JSON.parse(savedUser));
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isGuest,
    login,
    logout,
  };
}

// Use in any component
const LoginForm = blox(() => {
  const auth = useAuthState();

  return rx(() => {
    if (auth.isAuthenticated()) {
      return <div>Welcome, {auth.user()!.name}</div>;
    }

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          auth.login(
            formData.get("email") as string,
            formData.get("password") as string
          );
        }}
      >
        {auth.error() && <div className="error">{auth.error()}</div>}
        <input name="email" type="email" />
        <input name="password" type="password" />
        <button disabled={auth.loading()}>
          {auth.loading() ? "Loading..." : "Login"}
        </button>
      </form>
    );
  });
});
```

### Key Benefits of Composable Logic

1. **Reusability** - Write logic once, use in multiple components
2. **Testability** - Logic functions can be tested independently
3. **Separation of concerns** - Keep business logic separate from UI
4. **No hooks rules** - Call these functions anywhere, in any order
5. **Automatic cleanup** - `unmount()` ensures resources are freed
6. **Type safety** - Full TypeScript support for logic composition

### Tips for Composable Logic

- **Start with `use` prefix** - Convention to indicate it's a logic function (not a React hook)
- **Return an object** - Makes it easy to destructure what you need
- **Use `unmount()` for cleanup** - Subscriptions, timers, event listeners, etc.
- **Keep signals private if needed** - Return only what consumers need
- **Combine multiple logic functions** - Compose small pieces into larger ones

```tsx
function useTimer(interval = 1000) {
  const elapsed = signal(0);

  const timer = setInterval(() => {
    elapsed.set((prev) => prev + interval);
  }, interval);

  unmount(() => clearInterval(timer));

  return { elapsed };
}

function useTimedCounter() {
  const counter = useCounter(0);
  const timer = useTimer(1000);

  // Auto-increment every second
  effect(() => {
    counter.increment();
  });

  return {
    ...counter,
    elapsed: timer.elapsed,
  };
}
```

## Patterns & Best Practices

### Pattern: Global State

```tsx
// store.ts
export const userStore = {
  user: signal<User | null>(null),
  isLoggedIn: signal(() => userStore.user() !== null),

  login(user: User) {
    this.user.set(user);
  },

  logout() {
    this.user.set(null);
  },
};

// Component.tsx
const UserProfile = blox(() => {
  return rx(() => {
    const user = userStore.user();
    if (!user) return <div>Not logged in</div>;
    return <div>Hello, {user.name}</div>;
  });
});
```

### Pattern: Form State

```tsx
const FormExample = blox(() => {
  const name = signal("");
  const email = signal("");
  const isValid = signal(() => name().length > 0 && email().includes("@"));

  const handleSubmit = () => {
    if (!isValid()) return;
    console.log({ name: name(), email: email() });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <input
        value={name()}
        onChange={(e) => name.set(e.target.value)}
        placeholder="Name"
      />
      <input
        value={email()}
        onChange={(e) => email.set(e.target.value)}
        placeholder="Email"
      />
      <button disabled={!isValid()}>Submit</button>
    </form>
  );
});
```

### Pattern: Async Data Loading

```tsx
const UserList = blox(() => {
  const users = signal<User[]>([]);
  const loading = signal(true);
  const error = signal<Error | null>(null);

  effect(() => {
    loading.set(true);
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => users.set(data))
      .catch((err) => error.set(err))
      .finally(() => loading.set(false));
  });

  return rx(() => {
    if (loading()) return <div>Loading...</div>;
    if (error()) return <div>Error: {error()!.message}</div>;
    return (
      <ul>
        {users().map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    );
  });
});
```

### Pattern: Optimistic Updates

```tsx
const TodoItem = blox<{ todo: Todo }>((props) => {
  const completed = signal(props.todo.completed);

  const toggle = async () => {
    // Optimistic update
    completed.set(!completed());

    try {
      await fetch(`/api/todos/${props.todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: completed() }),
      });
    } catch (error) {
      // Revert on error
      completed.set(!completed());
      console.error("Failed to update:", error);
    }
  };

  return (
    <div>
      <input type="checkbox" checked={completed()} onChange={toggle} />
      {rx(() => (
        <span
          style={{
            textDecoration: completed() ? "line-through" : "none",
          }}
        >
          {props.todo.title}
        </span>
      ))}
    </div>
  );
});
```

## Comparison with Other Solutions

| Feature                  | rxblox | React useState | Zustand | Jotai | Solid Signals |
| ------------------------ | ------ | -------------- | ------- | ----- | ------------- |
| Fine-grained reactivity  | ✅     | ❌             | ❌      | ✅    | ✅            |
| Computed values          | ✅     | ❌             | ❌      | ✅    | ✅            |
| Auto dependency tracking | ✅     | ❌             | ❌      | ✅    | ✅            |
| No hooks rules           | ✅     | ❌             | ❌      | ❌    | ✅            |
| Works in React           | ✅     | ✅             | ✅      | ✅    | ❌            |
| Built-in DI              | ✅     | ❌             | ❌      | ❌    | ✅            |

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Build library
pnpm build

# Build in watch mode
pnpm dev
```

## License

MIT © 2024

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Guidelines

1. Write tests for new features
2. Maintain TypeScript type safety
3. Follow existing code style
4. Update documentation as needed

---

Made with ❤️ for the React community
