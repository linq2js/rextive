# Logic - Service Pattern for Testable Signal Bundles

## Overview

`logic()` is a factory pattern for creating **testable bundles of signals and methods**. It solves the challenge of testing reactive code with side effects by providing built-in dependency injection and isolation.

```ts
import { logic, signal } from "rextive";

const counter = logic("counter", () => {
  const count = signal(0);
  return {
    count,
    increment: () => count.set((x) => x + 1),
    decrement: () => count.set((x) => x - 1),
  };
});
```

## Why Logic?

### The Problem: Testing Signals with Side Effects

Signals have **side effects** that make testing challenging:

1. **Subscriptions persist** - `.on()`, `.when()`, `signal.on()` create listeners
2. **Computed signals cache values** - Stale state between tests
3. **Global state leaks** - One test affects another
4. **Dependencies are implicit** - Hard to override/replace

```ts
// ❌ Problem: Shared state between tests
const count = signal(0);
const doubled = count.to((x) => x * 2);

it("test 1", () => {
  count.set(10);
  expect(doubled()).toBe(20);
});

it("test 2", () => {
  // 💥 count is still 10 from test 1!
  expect(count()).toBe(0); // Fails!
});
```

### The Solution: Logic Units

`logic()` provides:

| Feature                  | Benefit                                                   |
| ------------------------ | --------------------------------------------------------- |
| **Singleton pattern**    | `myLogic()` - Lazy, cached instance (persists)            |
| **Instance creation**    | `myLogic.create()` - Fresh instance per call              |
| **Dependency injection** | `logic.provide(dep, fn)` - Global override                |
| **Test isolation**       | `logic.clear()` - Clear overrides + dispose tracked       |
| **Auto-disposal**        | Instances wrapped with `disposable()`                     |
| **Abstract logics**      | `logic.abstract<T>()` - Contracts that must be overridden |
| **Error wrapping**       | `LogicCreateError` - Clear error context                  |

---

## Basic Usage

### Creating a Logic Unit

```ts
import { logic, signal } from "rextive";

// Name is required as the first argument
const todoStore = logic("todoStore", () => {
  const todos = signal<Todo[]>([]);
  const filter = signal<"all" | "active" | "done">("all");

  const filtered = signal({ todos, filter }, ({ deps }) =>
    deps.filter === "all"
      ? deps.todos
      : deps.todos.filter((t) => t.done === (deps.filter === "done"))
  );

  return {
    todos,
    filter,
    filtered,
    addTodo: (text: string) =>
      todos.set((prev) => [...prev, { id: Date.now(), text, done: false }]),
    toggleTodo: (id: number) =>
      todos.set((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      ),
  };
});
```

### Singleton Access

```ts
// First call creates the instance
const store = todoStore();

// Subsequent calls return the same instance
const sameStore = todoStore();
console.log(store === sameStore); // true

// State is shared
store.addTodo("Buy milk");
console.log(sameStore.todos().length); // 1
```

### Creating Instances

```ts
// Each call creates a fresh instance
const store1 = todoStore.create();
const store2 = todoStore.create();

console.log(store1 === store2); // false

// State is independent
store1.addTodo("Task A");
store2.addTodo("Task B");
console.log(store1.todos().length); // 1
console.log(store2.todos().length); // 1

// Don't forget to dispose!
store1.dispose();
store2.dispose();
```

---

## Abstract Logics

Use `logic.abstract<T>()` to define logics that **must be overridden** before use. This is cleaner than defining each method individually.

### Defining Abstract Logics

```ts
import { logic } from "rextive";

// Define with just the type - no factory needed!
const authProvider = logic.abstract<{
  getToken: () => Promise<string>;
  refreshToken: () => Promise<void>;
  logout: () => void;
}>("authProvider");

// Can pass around without error
const auth = authProvider(); // ✅ OK

// Error only when property is accessed
auth.getToken();
// NotImplementedError: "authProvider.getToken" is not implemented -
// use logic.provide(authProvider, ...) to provide implementation
```

### Overriding Abstract Logics

```ts
// Consumer must provide implementation
logic.provide(authProvider, () => ({
  getToken: async () => localStorage.getItem("token") ?? "",
  refreshToken: async () => {
    const token = await fetchNewToken();
    localStorage.setItem("token", token);
  },
  logout: () => localStorage.removeItem("token"),
}));

// Now it works!
const auth = authProvider();
const token = await auth.getToken(); // ✅ Works
```

### Using Abstract Logics as Dependencies

Abstract logics are perfect for defining contracts that consumers must implement:

```ts
// Define abstract dependency
const authHeaders = logic.abstract<{
  get: () => Record<string, string>;
}>("authHeaders");

// Use in other logics
const apiClient = logic("apiClient", () => {
  const auth = authHeaders(); // Dependency on abstract logic

  return {
    fetch: async (endpoint: string) => {
      const headers = auth.get(); // ✅ Clear dependency
      return fetch(endpoint, { headers });
    },
  };
});

// Consumer provides implementation
logic.provide(authHeaders, () => ({
  get: () => ({ Authorization: `Bearer ${getToken()}` }),
}));
```

### Key Differences: `logic()` vs `logic.abstract()`

| Feature           | `logic(name, fn)`        | `logic.abstract<T>(name)` |
| ----------------- | ------------------------ | ------------------------- |
| Factory function  | Required                 | None (type only)          |
| `create()` method | ✅ Yes                   | ❌ No                     |
| Default behavior  | Works immediately        | Throws on property access |
| Use case          | Concrete implementations | Contracts/interfaces      |

---

## Error Handling

### LogicCreateError

Errors during logic creation are wrapped with `LogicCreateError` for clear context:

```ts
import { logic, LogicCreateError } from "rextive";

const failing = logic("failing", () => {
  throw new Error("Something went wrong");
});

try {
  failing.create();
} catch (e) {
  if (e instanceof LogicCreateError) {
    console.log(e.message);
    // "Failed to create logic "failing": Something went wrong"

    console.log(e.cause);
    // Original Error("Something went wrong")
  }
}
```

### NotImplementedError

Virtual methods throw `NotImplementedError` when called without override:

```ts
import { logic, NotImplementedError } from "rextive";

const myApi = logic.abstract<{
  fetch: (url: string) => Promise<any>;
}>("myApi");

try {
  myApi().fetch("/test");
} catch (e) {
  if (e instanceof NotImplementedError) {
    console.log(e.message);
    // '"myApi.fetch" is not implemented - use logic.provide(myApi, ...) to provide implementation'
  }
}
```

---

## Dependencies Between Logics

Logics can depend on other logics:

```ts
// Settings logic
const settings = logic("settings", () => ({
  theme: signal<"light" | "dark">("dark"),
  apiUrl: "https://api.example.com",
}));

// API logic depends on settings
const api = logic("api", () => {
  const { apiUrl } = settings(); // Dependency!

  return {
    fetch: async (endpoint: string) => {
      const response = await fetch(`${apiUrl}${endpoint}`);
      return response.json();
    },
  };
});

// User logic depends on API
const userStore = logic("userStore", () => {
  const { fetch } = api(); // Dependency!

  const user = signal<User | null>(null);
  const loading = signal(false);

  return {
    user,
    loading,
    login: async (credentials: Credentials) => {
      loading.set(true);
      const data = await fetch("/login", credentials);
      user.set(data);
      loading.set(false);
    },
  };
});
```

### Dependency Resolution

When a logic calls another logic:

1. If it's during initialization, checks for **overrides** first
2. If no override, returns/creates the **singleton** of the dependency
3. **Circular dependencies** are detected and throw an error

```ts
// ❌ This will throw LogicCreateError!
const a = logic("a", () => {
  b(); // a depends on b
  return {};
});

const b = logic("b", () => {
  a(); // b depends on a - CIRCULAR!
  return {};
});

a(); // LogicCreateError: Circular dependency detected: "a" is already initializing
```

---

## Testing with Logic

### Basic Test Structure

Use `logic.create()` for test isolation - instances are tracked and auto-disposed:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { logic } from "rextive";
import { todoStore } from "./stores";

describe("todoStore", () => {
  afterEach(() => {
    logic.clear(); // Clears overrides + disposes all tracked instances
  });

  it("should add todos", () => {
    const store = logic.create(todoStore); // Tracked instance!

    store.addTodo("Buy milk");
    expect(store.todos()).toHaveLength(1);
    // No manual dispose needed - logic.clear() handles it
  });

  it("should start empty (isolated from previous test)", () => {
    const store = logic.create(todoStore); // Fresh tracked instance

    expect(store.todos()).toHaveLength(0); // ✅ Isolated state
  });
});
```

### Overriding Dependencies

Use `logic.provide()` for global overrides:

```ts
describe("userStore", () => {
  afterEach(() => {
    logic.clear(); // Clears overrides + disposes tracked instances
  });

  it("should login with overridden API", async () => {
    // Global override - all consumers see this
    logic.provide(api, () => ({
      fetch: async () => ({ id: 1, name: "Test User" }),
    }));

    const store = logic.create(userStore); // Tracked!
    await store.login({ username: "test", password: "test" });

    expect(store.user()).toEqual({ id: 1, name: "Test User" });
    // No manual dispose needed
  });

  it("should use custom API URL", async () => {
    // Override settings (API will use this)
    logic.provide(settings, () => ({
      theme: signal("light"),
      apiUrl: "http://localhost:3000",
    }));

    const apiInstance = logic.create(api); // Tracked!
    // ... test with overridden URL
  });
});
```

### Override Propagation

Global overrides propagate through the dependency chain:

```ts
const base = logic("base", () => ({ value: 1 }));
const middle = logic("middle", () => {
  const { value } = base();
  return { doubled: value * 2 };
});
const top = logic("top", () => {
  const { doubled } = middle();
  return { result: doubled + 10 };
});

// ✅ Global override affects all consumers
logic.provide(base, () => ({ value: 100 }));

const instance = logic.create(top); // Tracked!
// base.value = 100 (overridden)
// middle.doubled = 200
// top.result = 210
expect(instance.result).toBe(210);
// Disposed by logic.clear() in afterEach
```

### Chaining Overrides

```ts
describe("complex dependencies", () => {
  afterEach(() => logic.clear());

  it("should override multiple dependencies", () => {
    logic
      .provide(api, () => ({
        fetch: async () => testUser,
      }))
      .provide(settings, () => ({
        theme: signal("light"),
        apiUrl: "http://test",
      }));

    const store = logic.create(userStore); // Tracked!
    // Both API and settings are overridden
  });
});
```

---

## Real-World Override Examples

### Example 1: Overriding an API Client

**Production code:**

```ts
// api.logic.ts
export const apiClient = logic("apiClient", () => {
  const baseUrl = "https://api.myapp.com";

  return {
    get: async <T>(endpoint: string): Promise<T> => {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  };
});

// userStore.logic.ts
export const userStore = logic("userStore", () => {
  const { get, post } = apiClient();

  const user = signal<User | null>(null);
  const loading = signal(false);
  const error = signal<string | null>(null);

  return {
    user,
    loading,
    error,

    fetchUser: async (id: string) => {
      loading.set(true);
      error.set(null);
      try {
        const data = await get<User>(`/users/${id}`);
        user.set(data);
      } catch (e) {
        error.set(e instanceof Error ? e.message : "Unknown error");
      } finally {
        loading.set(false);
      }
    },

    updateUser: async (updates: Partial<User>) => {
      const currentUser = user();
      if (!currentUser) return;

      loading.set(true);
      try {
        const updated = await post<User>(`/users/${currentUser.id}`, updates);
        user.set(updated);
      } catch (e) {
        error.set(e instanceof Error ? e.message : "Unknown error");
      } finally {
        loading.set(false);
      }
    },
  };
});
```

**Test code:**

```ts
// userStore.test.ts
import { describe, it, expect, afterEach, vi } from "vitest";
import { logic } from "rextive";
import { userStore, apiClient } from "./stores";

describe("userStore", () => {
  afterEach(() => {
    logic.clear(); // Clear all global overrides
  });

  it("should fetch user successfully", async () => {
    const testUser = { id: "1", name: "John Doe", email: "john@example.com" };

    // Override the API client globally
    logic.provide(apiClient, () => ({
      get: vi.fn().mockResolvedValue(testUser),
      post: vi.fn(),
    }));

    const store = logic.create(userStore);

    await store.fetchUser("1");

    expect(store.user()).toEqual(testUser);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe(null);
  });

  it("should handle fetch error", async () => {
    logic.provide(apiClient, () => ({
      get: vi.fn().mockRejectedValue(new Error("Network error")),
      post: vi.fn(),
    }));

    const store = logic.create(userStore);

    await store.fetchUser("1");

    expect(store.user()).toBe(null);
    expect(store.error()).toBe("Network error");
    expect(store.loading()).toBe(false);
  });

  it("should update user", async () => {
    const initialUser = { id: "1", name: "John", email: "john@example.com" };
    const updatedUser = { ...initialUser, name: "John Updated" };

    const postSpy = vi.fn().mockResolvedValue(updatedUser);

    logic.provide(apiClient, () => ({
      get: vi.fn().mockResolvedValue(initialUser),
      post: postSpy,
    }));

    const store = logic.create(userStore);

    // First fetch the user
    await store.fetchUser("1");
    expect(store.user()?.name).toBe("John");

    // Then update
    await store.updateUser({ name: "John Updated" });

    expect(store.user()?.name).toBe("John Updated");
    expect(postSpy).toHaveBeenCalledWith("/users/1", { name: "John Updated" });
  });
});
```

---

### Example 2: Overriding Local Storage

**Production code:**

```ts
// storage.logic.ts
export const storage = logic("storage", () => ({
  get: <T>(key: string): T | null => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  set: <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
}));

// cartStore.logic.ts
export const cartStore = logic("cartStore", () => {
  const { get, set } = storage();

  // Load initial cart from storage
  const items = signal<CartItem[]>(get("cart") || []);

  // Auto-save to storage when items change
  items.on(() => {
    set("cart", items());
  });

  const total = items.to((list) =>
    list.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  return {
    items,
    total,

    addItem: (product: Product) => {
      items.set((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
          },
        ];
      });
    },

    removeItem: (productId: string) => {
      items.set((prev) => prev.filter((i) => i.productId !== productId));
    },

    clear: () => {
      items.set([]);
    },
  };
});
```

**Test code:**

```ts
// cartStore.test.ts
import { describe, it, expect, afterEach, vi } from "vitest";
import { logic } from "rextive";
import { cartStore, storage } from "./stores";

describe("cartStore", () => {
  afterEach(() => {
    logic.clear();
  });

  it("should load cart from storage on init", () => {
    const savedCart = [
      { productId: "1", name: "Widget", price: 10, quantity: 2 },
    ];

    // Override storage to return saved cart
    logic.provide(storage, () => ({
      get: vi.fn().mockReturnValue(savedCart),
      set: vi.fn(),
      remove: vi.fn(),
    }));

    const store = logic.create(cartStore);

    expect(store.items()).toEqual(savedCart);
    expect(store.total()).toBe(20);
  });

  it("should save to storage when items change", () => {
    const setSpy = vi.fn();

    logic.provide(storage, () => ({
      get: vi.fn().mockReturnValue([]),
      set: setSpy,
      remove: vi.fn(),
    }));

    const store = logic.create(cartStore);

    store.addItem({ id: "1", name: "Widget", price: 10 });

    expect(setSpy).toHaveBeenCalledWith("cart", [
      { productId: "1", name: "Widget", price: 10, quantity: 1 },
    ]);
  });

  it("should start with empty cart when storage is empty", () => {
    logic.provide(storage, () => ({
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      remove: vi.fn(),
    }));

    const store = logic.create(cartStore);

    expect(store.items()).toEqual([]);
    expect(store.total()).toBe(0);
  });
});
```

---

### Example 3: Overriding Time-Based Logic

**Production code:**

```ts
// timer.logic.ts
export const clock = logic("clock", () => ({
  now: () => Date.now(),
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (id: number) => clearTimeout(id),
}));

// session.logic.ts
export const sessionStore = logic("sessionStore", () => {
  const { now, setTimeout, clearTimeout } = clock();

  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const lastActivity = signal(now());
  const isExpired = signal(false);
  let timeoutId: number | null = null;

  const checkExpiry = () => {
    const elapsed = now() - lastActivity();
    if (elapsed >= SESSION_TIMEOUT) {
      isExpired.set(true);
    }
  };

  const scheduleCheck = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(checkExpiry, SESSION_TIMEOUT) as unknown as number;
  };

  // Start checking
  scheduleCheck();

  return {
    lastActivity,
    isExpired,

    touch: () => {
      lastActivity.set(now());
      isExpired.set(false);
      scheduleCheck();
    },

    dispose: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
});
```

**Test code:**

```ts
// session.test.ts
import { describe, it, expect, afterEach, vi } from "vitest";
import { logic } from "rextive";
import { sessionStore, clock } from "./stores";

describe("sessionStore", () => {
  afterEach(() => {
    logic.clear();
  });

  it("should track session expiry", () => {
    let currentTime = 0;
    let scheduledCallbacks: Array<{ fn: () => void; time: number }> = [];

    logic.provide(clock, () => ({
      now: () => currentTime,
      setTimeout: (fn: () => void, ms: number) => {
        scheduledCallbacks.push({ fn, time: currentTime + ms });
        return scheduledCallbacks.length;
      },
      clearTimeout: (id: number) => {
        scheduledCallbacks = scheduledCallbacks.filter((_, i) => i !== id - 1);
      },
    }));

    const store = logic.create(sessionStore);

    expect(store.isExpired()).toBe(false);

    // Advance time by 31 minutes
    currentTime = 31 * 60 * 1000;

    // Trigger scheduled callback
    const callback = scheduledCallbacks.find((c) => c.time <= currentTime);
    callback?.fn();

    expect(store.isExpired()).toBe(true);
  });

  it("should reset expiry on touch", () => {
    let currentTime = 0;

    logic.provide(clock, () => ({
      now: () => currentTime,
      setTimeout: vi.fn().mockReturnValue(1),
      clearTimeout: vi.fn(),
    }));

    const store = logic.create(sessionStore);

    // Advance time
    currentTime = 10 * 60 * 1000; // 10 minutes

    // Touch resets the timer
    store.touch();

    expect(store.lastActivity()).toBe(currentTime);
    expect(store.isExpired()).toBe(false);
  });
});
```

---

### Example 4: Testing Error Scenarios

```ts
// orderStore.logic.ts
export const orderStore = logic("orderStore", () => {
  const { post } = apiClient();
  const { items, clear } = cartStore();

  const orderStatus = signal<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const orderId = signal<string | null>(null);
  const errorMessage = signal<string | null>(null);

  return {
    orderStatus,
    orderId,
    errorMessage,

    submitOrder: async (shippingAddress: Address) => {
      const cartItems = items();
      if (cartItems.length === 0) {
        errorMessage.set("Cart is empty");
        orderStatus.set("error");
        return;
      }

      orderStatus.set("submitting");
      errorMessage.set(null);

      try {
        const order = await post<{ id: string }>("/orders", {
          items: cartItems,
          shippingAddress,
        });

        orderId.set(order.id);
        orderStatus.set("success");
        clear(); // Clear cart after successful order
      } catch (e) {
        errorMessage.set(e instanceof Error ? e.message : "Order failed");
        orderStatus.set("error");
      }
    },
  };
});
```

**Test code:**

```ts
// orderStore.test.ts
import { logic, signal } from "rextive";

describe("orderStore", () => {
  afterEach(() => {
    logic.clear();
  });

  it("should fail when cart is empty", async () => {
    // Override with empty cart
    logic.provide(cartStore, () => ({
      items: signal([]),
      clear: vi.fn(),
    }));

    const store = logic.create(orderStore);

    await store.submitOrder({ street: "123 Main St" });

    expect(store.orderStatus()).toBe("error");
    expect(store.errorMessage()).toBe("Cart is empty");
  });

  it("should handle API errors gracefully", async () => {
    const testItems = [
      { productId: "1", name: "Widget", price: 10, quantity: 1 },
    ];

    logic
      .provide(cartStore, () => ({
        items: signal(testItems),
        clear: vi.fn(),
      }))
      .provide(apiClient, () => ({
        get: vi.fn(),
        post: vi.fn().mockRejectedValue(new Error("Payment declined")),
      }));

    const store = logic.create(orderStore);

    await store.submitOrder({ street: "123 Main St" });

    expect(store.orderStatus()).toBe("error");
    expect(store.errorMessage()).toBe("Payment declined");
  });

  it("should clear cart on successful order", async () => {
    const testItems = [
      { productId: "1", name: "Widget", price: 10, quantity: 1 },
    ];
    const clearSpy = vi.fn();

    logic
      .provide(cartStore, () => ({
        items: signal(testItems),
        clear: clearSpy,
      }))
      .provide(apiClient, () => ({
        get: vi.fn(),
        post: vi.fn().mockResolvedValue({ id: "order-123" }),
      }));

    const store = logic.create(orderStore);

    await store.submitOrder({ street: "123 Main St" });

    expect(store.orderStatus()).toBe("success");
    expect(store.orderId()).toBe("order-123");
    expect(clearSpy).toHaveBeenCalled();
  });
});
```

---

### Example 5: Partial Override with Spy

Sometimes you want to spy on calls while keeping real behavior:

```ts
// analytics.logic.ts
export const analytics = logic("analytics", () => ({
  track: (event: string, data?: Record<string, unknown>) => {
    // Real implementation sends to analytics service
    console.log("Track:", event, data);
  },
  identify: (userId: string) => {
    console.log("Identify:", userId);
  },
}));

// auth.logic.ts
export const authStore = logic("authStore", () => {
  const { track, identify } = analytics();
  const { post } = apiClient();

  const user = signal<User | null>(null);

  return {
    user,

    login: async (email: string, password: string) => {
      const result = await post<User>("/auth/login", { email, password });
      user.set(result);

      // Track login event
      identify(result.id);
      track("login", { method: "email" });

      return result;
    },
  };
});
```

**Test code:**

```ts
// auth.test.ts
import { logic } from "rextive";

describe("authStore", () => {
  afterEach(() => {
    logic.clear();
  });

  it("should track login events", async () => {
    const trackSpy = vi.fn();
    const identifySpy = vi.fn();

    logic
      .provide(analytics, () => ({
        track: trackSpy,
        identify: identifySpy,
      }))
      .provide(apiClient, () => ({
        get: vi.fn(),
        post: vi
          .fn()
          .mockResolvedValue({ id: "user-1", email: "test@example.com" }),
      }));

    const store = logic.create(authStore);

    await store.login("test@example.com", "password");

    expect(identifySpy).toHaveBeenCalledWith("user-1");
    expect(trackSpy).toHaveBeenCalledWith("login", { method: "email" });
  });

  it("should not track when login fails", async () => {
    const trackSpy = vi.fn();

    logic
      .provide(analytics, () => ({
        track: trackSpy,
        identify: vi.fn(),
      }))
      .provide(apiClient, () => ({
        get: vi.fn(),
        post: vi.fn().mockRejectedValue(new Error("Invalid credentials")),
      }));

    const store = logic.create(authStore);

    await expect(store.login("test@example.com", "wrong")).rejects.toThrow();

    expect(trackSpy).not.toHaveBeenCalled();
  });
});
```

---

### Example 6: Testing Signal Subscriptions

```ts
// notifications.logic.ts
export const notificationStore = logic("notificationStore", () => {
  const notifications = signal<Notification[]>([]);

  return {
    notifications,

    add: (message: string, type: "info" | "error" | "success" = "info") => {
      const notification = {
        id: crypto.randomUUID(),
        message,
        type,
        createdAt: Date.now(),
      };
      notifications.set((prev) => [...prev, notification]);
      return notification.id;
    },

    dismiss: (id: string) => {
      notifications.set((prev) => prev.filter((n) => n.id !== id));
    },

    clear: () => {
      notifications.set([]);
    },
  };
});
```

**Test code:**

```ts
// notifications.test.ts
import { signal } from "rextive";

describe("notificationStore", () => {
  it("should notify subscribers when notifications change", () => {
    const store = notificationStore.create();
    const listener = vi.fn();

    // Subscribe to changes
    store.notifications.on(listener);

    store.add("Hello", "info");

    expect(listener).toHaveBeenCalledTimes(1);

    store.add("World", "success");

    expect(listener).toHaveBeenCalledTimes(2);

    store.dispose();
  });

  it("should batch multiple updates", () => {
    const store = notificationStore.create();
    const listener = vi.fn();

    store.notifications.on(listener);

    // Use signal.batch for multiple updates
    signal.batch(() => {
      store.add("One");
      store.add("Two");
      store.add("Three");
    });

    // Only one notification due to batching
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.notifications()).toHaveLength(3);

    store.dispose();
  });
});
```

---

## Library Development: Runtime Overrides

One powerful use case for `logic()` is building **configurable libraries** where consumers can inject custom implementations at runtime.

### Exposing Configurable Logics

**Library code:**

```ts
// my-ui-library/src/theme.logic.ts
export const themeConfig = logic("themeConfig", () => ({
  primaryColor: "#3b82f6",
  secondaryColor: "#64748b",
  borderRadius: "8px",
  fontFamily: "system-ui, sans-serif",
}));

// my-ui-library/src/icons.logic.ts
export const iconProvider = logic("iconProvider", () => ({
  getIcon: (name: string) => `<svg><!-- default ${name} icon --></svg>`,
  iconSet: "default",
}));

// my-ui-library/src/button.logic.ts
export const buttonComponent = logic("buttonComponent", () => {
  const { primaryColor, borderRadius } = themeConfig();
  const { getIcon } = iconProvider();

  return {
    render: (label: string, icon?: string) => {
      const iconHtml = icon ? getIcon(icon) : "";
      return `
        <button style="background: ${primaryColor}; border-radius: ${borderRadius}">
          ${iconHtml} ${label}
        </button>
      `;
    },
  };
});
```

### Consumer: Complete Override

Replace the entire implementation:

```ts
// consumer-app/src/setup.ts
import { logic } from "rextive";
import { buttonComponent, themeConfig } from "my-ui-library";

// Override theme completely (global override)
logic.provide(themeConfig, () => ({
  primaryColor: "#dc2626", // Red theme
  secondaryColor: "#fbbf24",
  borderRadius: "0px", // Sharp corners
  fontFamily: '"Comic Sans MS", cursive',
}));

// Now all buttons use the red theme
const { render } = buttonComponent();
console.log(render("Click me")); // Uses overridden theme
```

### Consumer: Partial Override (Extending Original)

The resolver receives the `original` factory, allowing partial overrides:

```ts
// consumer-app/src/setup.ts
import { logic } from "rextive";
import { themeConfig } from "my-ui-library";

// Extend the default theme, only changing what you need
logic.provide(themeConfig, (original) => ({
  ...original(), // Keep all defaults
  primaryColor: "#10b981", // Only change primary color
}));

// Uses green primary color but keeps default borderRadius, fontFamily, etc.
```

### Consumer: Conditional Override

```ts
// consumer-app/src/setup.ts
import { logic } from "rextive";
import { themeConfig } from "my-ui-library";

const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

logic.provide(themeConfig, (original) => {
  const defaults = original();

  if (isDarkMode) {
    return {
      ...defaults,
      primaryColor: "#818cf8",
      secondaryColor: "#374151",
    };
  }

  return defaults; // Use original in light mode
});
```

### Consumer: Custom Icon Provider

```ts
// consumer-app/src/setup.ts
import { logic } from "rextive";
import { iconProvider } from "my-ui-library";
import { getHeroIcon } from "@heroicons/react";

// Replace default icons with Heroicons
logic.provide(iconProvider, () => ({
  getIcon: (name: string) => getHeroIcon(name),
  iconSet: "heroicons",
}));

// Or extend with fallback to original
logic.provide(iconProvider, (original) => ({
  getIcon: (name: string) => {
    try {
      return getHeroIcon(name);
    } catch {
      // Fall back to default if icon not found
      return original().getIcon(name);
    }
  },
  iconSet: "heroicons-with-fallback",
}));
```

### Real-World Example: API Client Configuration

**Library code:**

```ts
// my-api-client/src/config.logic.ts
export const apiConfig = logic("apiConfig", () => ({
  baseUrl: "https://api.default.com",
  timeout: 30000,
  retries: 3,
  headers: {
    "Content-Type": "application/json",
  },
}));

// my-api-client/src/auth.logic.ts
export const authProvider = logic.abstract<{
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
  onAuthError: () => void;
}>("authProvider");

// my-api-client/src/client.logic.ts
export const apiClient = logic("apiClient", () => {
  const config = apiConfig();
  const auth = authProvider();

  return {
    request: async <T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const token = await auth.getToken();

      const response = await fetch(`${config.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...config.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });

      if (response.status === 401) {
        auth.onAuthError();
        throw new Error("Unauthorized");
      }

      return response.json();
    },
  };
});
```

**Consumer app:**

```ts
// consumer-app/src/api-setup.ts
import { logic } from "rextive";
import { apiClient, apiConfig, authProvider } from "my-api-client";
import { getStoredToken, refreshStoredToken, redirectToLogin } from "./auth";

// Configure for production
logic.provide(apiConfig, (original) => ({
  ...original(),
  baseUrl: process.env.API_URL || "https://api.myapp.com",
  timeout: 60000,
  headers: {
    ...original().headers,
    "X-App-Version": "1.0.0",
  },
}));

// Inject auth implementation (required - abstract logic!)
logic.provide(authProvider, () => ({
  getToken: async () => getStoredToken(),
  refreshToken: async () => refreshStoredToken(),
  onAuthError: () => redirectToLogin(),
}));

// Export configured client for use in app
export const api = apiClient();
```

### Pattern: Feature Flags via Override

```ts
// library/src/features.logic.ts
export const featureFlags = logic("featureFlags", () => ({
  enableNewUI: false,
  enableBetaFeatures: false,
  enableAnalytics: true,
  maxUploadSize: 10 * 1024 * 1024, // 10MB
}));

// library/src/uploader.logic.ts
export const fileUploader = logic("fileUploader", () => {
  const flags = featureFlags();

  return {
    upload: async (file: File) => {
      if (file.size > flags.maxUploadSize) {
        throw new Error(`File too large. Max: ${flags.maxUploadSize} bytes`);
      }
      // ... upload logic
    },
  };
});

// Consumer: Enable features for premium users
logic.provide(featureFlags, (original) => ({
  ...original(),
  enableBetaFeatures: user.isPremium,
  maxUploadSize: user.isPremium ? 100 * 1024 * 1024 : original().maxUploadSize,
}));
```

### Testing Library Code with Overrides

```ts
// library tests
import { logic } from "rextive";

describe("buttonComponent", () => {
  afterEach(() => {
    logic.clear();
  });

  it("should use default theme", () => {
    const btn = logic.create(buttonComponent);
    const html = btn.render("Click");
    expect(html).toContain("#3b82f6"); // Default primary
  });

  it("should respect consumer overrides", () => {
    logic.provide(themeConfig, () => ({
      primaryColor: "#ff0000",
      secondaryColor: "#00ff00",
      borderRadius: "0",
      fontFamily: "Arial",
    }));

    const btn = logic.create(buttonComponent);
    const html = btn.render("Click");
    expect(html).toContain("#ff0000"); // Overridden
  });

  it("should allow partial override", () => {
    logic.provide(themeConfig, (original) => ({
      ...original(),
      primaryColor: "#custom",
    }));

    const btn = logic.create(buttonComponent);
    const html = btn.render("Click");
    expect(html).toContain("#custom");
    expect(html).toContain("8px"); // Default borderRadius preserved
  });
});
```

### Summary: Override Patterns

| Pattern                  | Code                                                          | Use Case                   |
| ------------------------ | ------------------------------------------------------------- | -------------------------- |
| **Complete replacement** | `logic.provide(dep, () => newImpl)`                           | Swap entire implementation |
| **Partial override**     | `logic.provide(dep, (orig) => ({...orig(), ...changes}))`     | Extend defaults            |
| **Conditional override** | `logic.provide(dep, (orig) => condition ? modified : orig())` | Feature flags, A/B tests   |
| **Fallback pattern**     | `logic.provide(dep, (orig) => tryNew() ?? orig())`            | Graceful degradation       |

---

## Disposal and Cleanup

### Why Disposal Matters

Logic instances contain signals, which have:

- **Subscriptions** (`.on()` callbacks)
- **Computed dependencies** (signal chains)
- **Side effects** (async operations, timers)

Without disposal, these **leak memory** and **cause test interference**.

### Auto-Disposal with `disposable()`

Logic automatically wraps instances with `disposable()`:

```ts
const counter = logic("counter", () => {
  const count = signal(0);
  const doubled = signal({ count }, ({ deps }) => deps.count * 2);

  return { count, doubled };
});

const instance = counter.create();
instance.dispose(); // Disposes BOTH count and doubled signals

// Signals are now disposed
instance.count.set(1); // ❌ Throws!
```

### Custom Cleanup

Add cleanup logic with `dispose` property or methods ending in `Cleanup`:

```ts
const timerLogic = logic("timerLogic", () => {
  const elapsed = signal(0);
  const interval = setInterval(() => {
    elapsed.set((x) => x + 1);
  }, 1000);

  return {
    elapsed,
    // Option 1: dispose property (array or function)
    dispose: () => clearInterval(interval),

    // Option 2: method ending in 'Cleanup'
    timerCleanup: () => clearInterval(interval),
  };
});

const instance = timerLogic.create();
// Timer is running...
instance.dispose(); // Timer is cleared!
```

### Singleton Behavior

Singletons persist for the app lifetime. Use `create()` for test isolation:

```ts
// In production - singleton persists
const store = todoStore();
store.addTodo("Task 1");

const sameStore = todoStore(); // Same instance
console.log(sameStore.todos().length); // 1

// In tests - use logic.create() for isolation
const testStore = logic.create(todoStore);
testStore.addTodo("Test Task");
// Auto-disposed by logic.clear() in afterEach
```

### Understanding Disposal

| Method                  | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `instance.dispose()`    | Disposes that specific instance               |
| `logic.create(myLogic)` | Creates tracked instance (auto-disposed)      |
| `logic.clear()`         | Clears overrides + disposes tracked instances |

```ts
// In tests, use logic.create() + logic.clear() in afterEach
afterEach(() => {
  logic.clear(); // Clears overrides + disposes all tracked instances
});

it("test", () => {
  const instance = logic.create(todoStore); // Tracked!
  // ... test ...
  // No manual dispose needed!
});
```

---

## React Integration

### With `useScope`

`useScope` detects `Logic` types and creates component-scoped instances:

```ts
import { useScope } from "rextive/react";

function TodoApp() {
  // Creates instance on mount, disposes on unmount
  const store = useScope(todoStore);

  return (
    <div>
      {rx(() => (
        <ul>
          {store.filtered().map((todo) => (
            <li key={todo.id}>{todo.text}</li>
          ))}
        </ul>
      ))}
    </div>
  );
}
```

### Singleton vs Component-Scoped

```ts
// Singleton - shared across components
function GlobalCounter() {
  const { count, increment } = counter(); // Same instance everywhere
  return <button onClick={increment}>{rx(count)}</button>;
}

// Component-scoped - each component gets its own
function LocalCounter() {
  const { count, increment } = useScope(counter); // Fresh per component
  return <button onClick={increment}>{rx(count)}</button>;
}
```

---

## Best Practices

### 1. Use `logic.clear()` in Tests

```ts
afterEach(() => {
  logic.clear(); // Clears overrides + disposes tracked instances
});
```

### 2. Use `logic.create()` for Tracked Instances

Each test should use tracked instances - no manual disposal needed:

```ts
afterEach(() => {
  logic.clear(); // Handles cleanup
});

it("test", () => {
  const instance = logic.create(myLogic); // Tracked!
  // ... test ...
  // No manual dispose needed!
});
```

Use multiple tracked instances when testing interaction:

```ts
it("should handle multiple instances", () => {
  const instance1 = logic.create(myLogic); // Tracked
  const instance2 = logic.create(myLogic); // Tracked
  // ... test interaction between instances ...
  // Both disposed by logic.clear() in afterEach
});
```

### 3. Name Your Logics for Debugging

```ts
// Name is the first argument (required)
const counter = logic("counter", () => ({ count: signal(0) }));
```

### 4. Overrides Propagate Through Dependencies

Overrides apply to **all** consumers in the dependency chain:

```ts
// Override applies to all levels
logic.provide(base, () => ({ value: 100 }));

logic.create(top); // middle and top both see overridden base
```

### 5. Use `logic.create()` for Testing

`logic.create()` is for **testing** - it tracks instances for auto-cleanup:

```ts
// ✅ In tests - use logic.create() for tracked instances
it("test", () => {
  const instance = logic.create(myLogic); // Tracked!
  // Auto-disposed by logic.clear() in afterEach
});

// ✅ In production - use myLogic() or myLogic.create() as usual
const singleton = myLogic(); // Singleton (persists)
const instance = myLogic.create(); // Fresh instance (manual disposal)

// ✅ In React - use useScope (auto-disposes on unmount)
function MyComponent() {
  const instance = useScope(myLogic);
  // ...
}
```

### 6. Use Abstract Logics for Dependencies That Must Be Provided

When your logic needs a dependency that consumers must implement:

```ts
// Define abstract dependencies
const authService = logic.abstract<{
  getAuth: () => string;
  logEvent: (event: string) => void;
}>("authService");

// Use in your library logic
const myLibraryLogic = logic("myLibraryLogic", () => {
  const auth = authService();
  return {
    doSomething: () => {
      const token = auth.getAuth(); // Consumer must provide this
      auth.logEvent("action");
    },
  };
});
```

---

## API Reference

### `logic(name, factory)`

Creates a logic unit.

```ts
const myLogic = logic("myLogic", () => ({
  // ... factory creates the logic content
}));
```

**Parameters:**

- `name: string` - Display name for debugging and error messages (required)
- `factory: () => T` - Factory function that creates the logic content

### `logic.abstract<T>(name)`

Creates an abstract logic that must be overridden before use.

```ts
const authProvider = logic.abstract<{
  getToken: () => Promise<string>;
  logout: () => void;
}>("authProvider");
```

**Parameters:**

- `name: string` - Display name for debugging and error messages (required)

**Returns:** `AbstractLogic<T>` - A logic that throws `NotImplementedError` on property access

### `Logic<T>` Interface

| Method/Property | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `()`            | Get or create singleton instance (persists for app lifetime) |
| `.create()`     | Create new instance (untracked, manual disposal)             |
| `.displayName`  | Debug name                                                   |
| `[LOGIC_TYPE]`  | Type brand for detection                                     |

### `Instance<T>` Type

```ts
type Instance<T> = T & { dispose(): void };
```

All instances have a `dispose()` method added automatically.

### Global Static Methods (Testing)

| Method                   | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `logic.provide(dep, fn)` | Set global override (affects all consumers)                 |
| `logic.create(myLogic)`  | Create tracked instance (auto-disposed, respects overrides) |
| `logic.clear()`          | Clear overrides + dispose all tracked instances             |

```ts
// In tests:
logic.provide(config, () => ({ value: "test" })); // Override
const instance = logic.create(myLogic); // Tracked instance
logic.clear(); // Cleanup

// In production - use standard methods:
const singleton = myLogic(); // Singleton
const fresh = myLogic.create(); // Untracked instance
```

### Error Classes

#### `NotImplementedError`

Thrown when an abstract logic's property is accessed without being overridden.

```ts
import { logic, NotImplementedError } from "rextive";

const myApi = logic.abstract<{ fetch: () => void }>("myApi");

try {
  myApi().fetch();
} catch (e) {
  if (e instanceof NotImplementedError) {
    console.log(e.message);
    // '"myApi.fetch" is not implemented - use logic.provide(myApi, ...) to provide implementation'
  }
}
```

#### `LogicCreateError`

Thrown when logic creation fails. Wraps the original error with context.

```ts
import { LogicCreateError } from "rextive";

try {
  failingLogic.create();
} catch (e) {
  if (e instanceof LogicCreateError) {
    console.log(e.message); // 'Failed to create logic "failingLogic": ...'
    console.log(e.cause); // Original error
  }
}
```

### `.provide()` Method

```ts
logic.provide<TOther>(
  dependency: Logic<TOther>,
  resolver: (original: () => TOther) => TOther
): typeof logic
```

The resolver receives the `original` factory function, enabling partial overrides:

```ts
// Complete replacement
logic.provide(dep, () => newImplementation);

// Partial override (extend original)
logic.provide(dep, (original) => ({
  ...original(),
  onlyChangeThis: "new value",
}));

// Conditional override
logic.provide(dep, (original) => (shouldOverride ? customImpl : original()));
```

---

## Global Overrides

Global overrides apply to **ALL logics** that depend on the overridden logic:

```ts
// Global override - affects ALL consumers of settings
logic.provide(settings, () => ({ apiUrl: "http://test" }));

// Chain multiple global overrides
logic
  .provide(settings, () => ({ apiUrl: "http://test" }))
  .provide(auth, () => ({ token: "test-token" }));

// Partial override with original
logic.provide(settings, (original) => ({
  ...original(),
  apiUrl: "http://test",
}));

// Clear all global overrides
logic.clear();
```

### Override Propagation

Global overrides propagate through the entire dependency chain:

```ts
logic.provide(config, () => ({ value: "global" }));
logic.provide(base, () => ({ value: 100 }));

logic.create(top); // middle sees overridden base too!
```

### Test Setup Example

```ts
// test/setup.ts
afterEach(() => {
  // Clear global overrides after each test
  logic.clear();
});

it("with override", () => {
  logic.provide(apiClient, () => ({
    get: vi.fn().mockResolvedValue(testData),
    post: vi.fn(),
  }));

  const store = logic.create(userStore);
  // ... test with overridden apiClient ...
  // No manual dispose needed - logic.clear() handles it
});
```

---

## Summary

### Production Usage

| Concept                | Purpose                           |
| ---------------------- | --------------------------------- |
| `logic(name, fn)`      | Create testable signal bundles    |
| `logic.abstract<T>(n)` | Create abstract contracts         |
| `myLogic()`            | Get singleton instance (persists) |
| `myLogic.create()`     | Create fresh instance (untracked) |

### Testing Usage

| Concept                  | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `logic.provide(dep, fn)` | Override dependency                                         |
| `logic.create(myLogic)`  | Create tracked instance (auto-disposed, respects overrides) |
| `logic.clear()`          | Clear overrides + dispose tracked                           |

**Key insight:** `logic()` transforms reactive code from hard-to-test global state into **testable, isolated units** with built-in dependency injection.
