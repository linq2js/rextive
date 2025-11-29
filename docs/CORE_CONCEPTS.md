# Core Concepts

Rextive is built on **four simple patterns**. Master these, and you master everything:

---

## 1️⃣ Single Dependency: Transform with `.to()`

When you need to **transform one signal** into another, use the `.to()` method:

```tsx
import { signal } from "rextive";

// Create a source signal
const count = signal(0);

// Transform it with .to()
const doubled = count.to((x) => x * 2);
const formatted = count.to((x) => `Count: ${x}`);

// Use the transformed values
console.log(doubled()); // 0
count.set(5);
console.log(doubled()); // 10
console.log(formatted()); // "Count: 5"
```

<details>
<summary>📖 <strong>Understanding .to()</strong></summary>

```tsx
const doubled = count.to((x) => x * 2);
// .to() = transform each value (like Array.map)
// Result: a NEW signal that auto-updates when count changes

// Think of it like this:
count = 5
↓ .to(x => x * 2)
↓
doubled = 10

// When count changes to 10:
count = 10
↓ .to(x => x * 2)
↓
doubled = 20
```

**Alternative: Using operators**

For complex transformations or chaining multiple operations, use operators:

```tsx
import { to } from "rextive/op";

const doubled = count.pipe(to((x) => x * 2));
// Same result, but .to() is shorter for single transformations
```

</details>

### Working with Objects and Arrays

When transforming objects or arrays, use **custom equality** to prevent unnecessary updates:

```tsx
const user = signal({ name: "John", age: 30 });

// ❌ Without equality: Creates new object = always triggers updates
const userCopy = user.to((u) => ({ ...u }));

// ✅ With shallow equality: Only updates if content actually changed
const userName = user.to((u) => u.name, "shallow");
const userData = user.to((u) => u.data, "deep");
```

---

## 2️⃣ Custom Equality: Optimize Performance

By default, signals use **reference equality** (`Object.is`). For objects/arrays, this can cause unnecessary updates:

```tsx
import { signal } from "rextive";

// Default behavior (reference equality)
const user = signal({ name: "John", age: 30 });
user.set({ name: "John", age: 30 }); // ❌ Triggers update (new object reference)

// With custom equality
const user = signal({ name: "John", age: 30 }, "shallow");
user.set({ name: "John", age: 30 }); // ✅ No update (content unchanged)
user.set({ name: "Jane", age: 30 }); // ✅ Updates (name changed)
```

### Three Ways to Specify Equality

```tsx
// 1️⃣ String shortcuts (recommended)
const user1 = signal({ name: "John" }, "shallow");
const data1 = signal(complexObj, "deep");
const ref1 = signal(obj, "strict"); // Same as default

// 2️⃣ Options object
const user2 = signal(
  { name: "John" },
  {
    equals: "shallow",
    name: "userSignal", // For debugging
  }
);

// 3️⃣ Custom function
const customEquals = (a, b) => a.id === b.id;
const item = signal({ id: 1, name: "Item" }, customEquals);
```

### Equality Strategies

| Strategy | Description | Use When |
|----------|-------------|----------|
| `"strict"` (default) | Reference equality (`Object.is`) | Primitive values |
| `"shallow"` | Compare one level deep | Simple objects (1 level) |
| `"deep"` | Recursive comparison | Nested objects/arrays |
| Custom function | You decide | Objects with unique ID |

```tsx
// Real-world example
const userProfile = signal(
  { name: "Alice", settings: { theme: "dark" } },
  "deep" // Because settings is nested
);

// This won't trigger unnecessary updates
userProfile.set({ name: "Alice", settings: { theme: "dark" } }); // No update
userProfile.set({ name: "Alice", settings: { theme: "light" } }); // Updates!
```

---

## 3️⃣ Multiple Dependencies: Combine Signals

When you need to **combine multiple signals**, use the dependency pattern:

```tsx
import { signal } from "rextive";

const firstName = signal("John");
const lastName = signal("Doe");

// Combine them into a computed signal
const fullName = signal(
  { firstName, lastName }, // Step 1: List dependencies
  ({ deps }) => `${deps.firstName} ${deps.lastName}` // Step 2: Compute function
);

console.log(fullName()); // "John Doe"
firstName.set("Jane");
console.log(fullName()); // "Jane Doe" - automatically updated!
```

<details>
<summary>📖 <strong>How It Works Step by Step</strong></summary>

```tsx
const result = signal(
  { count, multiplier },        // 1. Dependencies object
  ({ deps }) => {               // 2. Compute function
    // 'deps' contains current values of all dependencies
    return deps.count * deps.multiplier;
  }
);

// What happens internally:
// 1. Rextive subscribes to count and multiplier
// 2. When either changes, the compute function runs
// 3. The result signal updates with the new value
// 4. Any subscribers to result are notified
```

**Key Features:**

- ✅ **Auto-tracking** - Updates when ANY dependency changes
- ✅ **Type-safe** - Full TypeScript inference
- ✅ **Lazy** - Only computes when accessed (by default)
- ✅ **Efficient** - Batches multiple dependency changes

</details>

### Real-World Example: Shopping Cart

```tsx
const price = signal(29.99);
const quantity = signal(2);
const taxRate = signal(0.08);

// Subtotal depends on price and quantity
const subtotal = signal(
  { price, quantity },
  ({ deps }) => deps.price * deps.quantity
);

// Total depends on subtotal and taxRate
const total = signal(
  { subtotal, taxRate },
  ({ deps }) => deps.subtotal * (1 + deps.taxRate)
);

console.log(total()); // 64.78

// Update any value
quantity.set(3);
console.log(total()); // 97.17 - everything recalculates!
```

### With Custom Equality

For computed values that return objects, use custom equality:

```tsx
// Returns an object - use shallow equality
const summary = signal(
  { firstName, lastName },
  ({ deps }) => ({
    full: `${deps.firstName} ${deps.lastName}`,
    initials: `${deps.firstName[0]}${deps.lastName[0]}`,
  }),
  "shallow" // Prevent updates if content is the same
);
```

---

## 4️⃣ Async with Dependencies

Dependencies work seamlessly with async operations - perfect for **data fetching**:

```tsx
import { signal } from "rextive";

const userId = signal(1);

// Automatically re-fetches when userId changes
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  const response = await fetch(`/users/${deps.userId}`, {
    signal: abortSignal, // Automatically cancels previous request
  });
  return response.json();
});

// Change userId
userId.set(2); // ✅ Cancels fetch for user 1, starts fetch for user 2
userId.set(3); // ✅ Cancels fetch for user 2, starts fetch for user 3
```

<details>
<summary>📖 <strong>Understanding Automatic Cancellation</strong></summary>

**What is `abortSignal`?**

- Automatically provided by Rextive
- Signals when the computation should be aborted
- Triggered when:
  - Dependencies change (new computation starts)
  - Signal is disposed
  - Manually cancelled

**Benefits:**

- ✅ No memory leaks from pending requests
- ✅ No race conditions (old requests can't overwrite new ones)
- ✅ Better performance (fewer concurrent requests)
- ✅ Works with any AbortSignal-compatible API

</details>

### Real-World Example: User Profile Loader

```tsx
const userId = signal<number>(); // Start undefined

const userProfile = signal({ userId }, async ({ deps, abortSignal }) => {
  // Don't fetch if no userId
  if (!deps.userId) return null;

  try {
    const response = await fetch(`/api/users/${deps.userId}`, {
      signal: abortSignal,
    });

    if (!response.ok) throw new Error("Failed to fetch");

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Fetch cancelled"); // This is normal!
      return null;
    }
    throw error; // Re-throw other errors
  }
});

// Later in your app
userId.set(123); // Starts fetching user 123
```

---

## 🗺️ Pattern Quick Reference

| Pattern | Use When | Example |
|---------|----------|---------|
| **Single value** | Creating simple state | `signal(0)` |
| **With equality** | Objects/arrays that need comparison | `signal({ name: 'John' }, "shallow")` |
| **`.to()`** | Transform one signal | `count.to(x => x * 2)` |
| **Multiple deps** | Combine multiple signals | `signal({ a, b }, ({ deps }) => deps.a + deps.b)` |
| **`signal.from`** | Collect signals into record/tuple | `signal.from({ a, b })` or `signal.from([a, b])` |
| **Async** | Data fetching | `signal(async () => fetch(...))` |
| **Async + deps** | Data fetching with params | `signal({ id }, async ({ deps }) => fetch(...))` |

---

## Next Steps

- **[Examples](./EXAMPLES.md)** - See these patterns in real-world code
- **[Patterns](./PATTERNS.md)** - Advanced patterns & best practices
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation


