# Rextive ⚡

<div align="center">

### **The simplest way to manage reactive state**

One concept. Zero complexity. Pure power.

```bash
npm install rextive
```

[![npm version](https://img.shields.io/npm/v/rextive.svg)](https://www.npmjs.com/package/rextive)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 🎯 Why Rextive?

Stop juggling multiple state management patterns. Rextive gives you **one powerful concept** that handles everything:

```tsx
// ❌ Traditional React - Multiple APIs to learn
const [count, setCount] = useState(0); // State
const doubled = useMemo(() => count * 2, [count]); // Derived state
useEffect(() => {
  // Side effects
  console.log("Count changed:", count);
}, [count]);

// ✅ Rextive - One unified API
import { signal } from "rextive";

const count = signal(0); // State
const doubled = count.to((x) => x * 2); // Derived state
count.on((value) => {
  // Side effects
  console.log("Count changed:", value);
});
```

### 🚀 What Rextive Replaces

| Instead of...                        | Use Rextive   |
| ------------------------------------ | ------------- |
| `useState` + `useMemo` + `useEffect` | Just `signal` |
| Redux + Redux Toolkit                | Just `signal` |
| React Query + SWR                    | Just `signal` |
| Zustand + Jotai + Recoil             | Just `signal` |

**One API. Infinite possibilities.**

---

## 🚀 Quick Start

### React in 30 Seconds

Let's build a counter with just 3 lines:

```tsx
import { signal, rx } from "rextive/react";

// Step 1: Create reactive state
const count = signal(0);

// Step 2: Create an action to modify state
const increment = () => count.set((x) => x + 1);

// Step 3: Render it reactively
const Counter = <h1 onClick={increment}>{rx(count)}</h1>;
```

**That's it!** No providers. No hooks. No boilerplate.

<details>
<summary>📖 <strong>What's happening here?</strong> (Click to expand)</summary>

```tsx
const count = signal(0);
// Creates a signal with initial value 0
// Signals are reactive containers that notify subscribers when changed

const increment = () => count.set((x) => x + 1);
// count.set() updates the value
// You can pass a new value OR an updater function
// Updater function receives current value (x) and returns new value

const Counter = <h1 onClick={increment}>{rx(count)}</h1>;
// rx() makes React automatically re-render when count changes
// No useState, no forceUpdate - just pure reactivity!
```

</details>

> **💡 Pro Tip:** Import everything from `rextive/react` for convenience:
>
> ```tsx
> import { signal, rx, useScope, wait } from "rextive/react";
> ```
>
> No need to mix `rextive` and `rextive/react` imports!

---

### Full Counter Example

Here's a complete, real-world counter:

```tsx
import { signal, rx } from "rextive/react";

// Create reactive state
const count = signal(0);

// Create derived state (automatically updates when count changes)
const doubled = count.to((x) => x * 2);
const isEven = count.to((x) => x % 2 === 0);

function Counter() {
  return (
    <div>
      {/* Display reactive values */}
      <h1>Count: {rx(count)}</h1>
      <p>Doubled: {rx(doubled)}</p>
      <p>Is Even: {rx(isEven, (even) => (even ? "Yes" : "No"))}</p>

      {/* Buttons to modify state */}
      <button onClick={() => count.set((x) => x + 1)}>Increment</button>
      <button onClick={() => count.set((x) => x - 1)}>Decrement</button>
      <button onClick={() => count.reset()}>Reset</button>
    </div>
  );
}
```

<details>
<summary>📖 <strong>Understanding Derived State</strong> (Click to expand)</summary>

```tsx
const doubled = count.to((x) => x * 2);
// .to() transforms the value (similar to Array.map)
// When count = 5, doubled = 10 automatically

const isEven = count.to((x) => x % 2 === 0);
// You can create multiple derived signals
// Each one automatically recalculates when its source changes
// This is lazy evaluation - only computed when accessed
```

</details>

---

### 💡 Shorthand: Use `$()` for Concise Code

For shorter syntax, use `$` instead of `signal`:

```tsx
import { $ } from "rextive";

const count = $(0); // Same as signal(0)
const doubled = $({ count }, ({ deps }) => deps.count * 2); // Computed signal
```

Both are **identical** - use whichever you prefer! The rest of this guide uses `signal()` for clarity.

---

### Vanilla JavaScript (No React!)

Rextive works **anywhere** - not just React:

```js
import { signal } from "rextive";

// Create reactive state
const count = signal(0);

// Create a reactive effect that runs automatically
const effect = signal(
  { count }, // Dependencies: React when 'count' changes
  ({ deps }) => {
    // This function runs on every change
    const el = document.querySelector("#counter");
    el.textContent = `Count: ${deps.count}`;
  },
  { lazy: false } // Start immediately (not lazy)
);

// Update the count
count.set((x) => x + 1); // DOM updates automatically!
```

<details>
<summary>📖 <strong>How Reactive Effects Work</strong> (Click to expand)</summary>

```js
const effect = signal(
  { count }, // 1. List all signals this effect depends on
  ({ deps }) => {
    // 2. This function runs when dependencies change
    // deps.count contains the current value
    // You can access multiple dependencies: { count, name, age }
  },
  { lazy: false } // 3. lazy: false = run immediately
  //    lazy: true (default) = run only when accessed
);
```

The effect automatically:

- ✅ Runs when `count` changes
- ✅ Cleans up when disposed
- ✅ Batches multiple updates efficiently

</details>

---

## 📖 Core Concepts

Rextive is built on **four simple patterns**. Master these, and you master everything:

### 1️⃣ Single Dependency: Transform with `.to()`

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
import { select } from "rextive/op";

const doubled = count.pipe(select((x) => x * 2));
// Same result, but .to() is shorter for single transformations
```

</details>

#### Working with Objects and Arrays

When transforming objects or arrays, use **custom equality** to prevent unnecessary updates:

```tsx
const user = signal({ name: "John", age: 30 });

// ❌ Without equality: Creates new object = always triggers updates
const userCopy = user.to((u) => ({ ...u }));

// ✅ With shallow equality: Only updates if content actually changed
const userName = user.to((u) => u.name, "shallow");
const userData = user.to((u) => u.data, "deep");
```

<details>
<summary>📖 <strong>Why Custom Equality Matters</strong></summary>

```tsx
const user = signal({ name: "Alice", age: 30 });

// Without custom equality
const copy1 = user.pipe(select((u) => ({ ...u })));
user.set({ name: "Alice", age: 30 }); // ❌ Triggers update (new object reference)

// With shallow equality
const copy2 = user.pipe(select((u) => ({ ...u }), "shallow"));
user.set({ name: "Alice", age: 30 }); // ✅ No update (content unchanged)
user.set({ name: "Bob", age: 30 }); // ✅ Updates (name changed)
```

**Available equality strategies:**

- `"strict"` (default) - Reference equality (`Object.is`)
- `"shallow"` - Compare object keys/array elements one level deep
- `"deep"` - Recursive comparison (uses lodash `isEqual`)
- Custom function - `(a, b) => boolean`

</details>

### 2️⃣ Custom Equality: Optimize Performance

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

#### Three Ways to Specify Equality

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

<details>
<summary>📖 <strong>Equality Strategies Explained</strong></summary>

```tsx
// 1. "strict" (default) - Reference equality
const a = { x: 1 };
const b = { x: 1 };
Object.is(a, b); // false - different objects

// 2. "shallow" - Compare one level deep
shallowEquals({ x: 1 }, { x: 1 }); // true
shallowEquals({ x: { y: 1 } }, { x: { y: 1 } }); // false - nested objects

// 3. "deep" - Recursive comparison
deepEquals({ x: { y: 1 } }, { x: { y: 1 } }); // true

// 4. Custom - You decide
const byId = (a, b) => a.id === b.id;
byId({ id: 1, name: "A" }, { id: 1, name: "B" }); // true
```

</details>

#### When to Use Custom Equality

| Scenario                                         | Recommended Equality | Reason                                   |
| ------------------------------------------------ | -------------------- | ---------------------------------------- |
| Primitive values (`string`, `number`, `boolean`) | `"strict"` (default) | Fast and sufficient                      |
| Simple objects (1 level)                         | `"shallow"`          | Prevents re-renders from new object refs |
| Nested objects/arrays                            | `"deep"`             | Compares all nested values               |
| Objects with ID                                  | Custom function      | Compare by unique identifier             |

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

### 3️⃣ Multiple Dependencies: Combine Signals

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

// Example flow:
count = 5, multiplier = 2
↓
result = 5 × 2 = 10

count.set(10)  // Change count
↓
result = 10 × 2 = 20  // Automatically recalculated!
```

**Key Features:**

- ✅ **Auto-tracking** - Updates when ANY dependency changes
- ✅ **Type-safe** - Full TypeScript inference
- ✅ **Lazy** - Only computes when accessed (by default)
- ✅ **Efficient** - Batches multiple dependency changes

</details>

#### Real-World Example: Shopping Cart

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

#### With Custom Equality

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

// Custom equality function
const stats = signal(
  { a, b },
  ({ deps }) => ({
    sum: deps.a + deps.b,
    timestamp: Date.now(), // This always changes
  }),
  (x, y) => x.sum === y.sum // Only compare 'sum', ignore 'timestamp'
);

// Full options object
const userData = signal({ userId }, ({ deps }) => fetchUser(deps.userId), {
  equals: "deep",
  name: "userData",
  lazy: false, // Compute immediately
});
```

### 4️⃣ Async with Dependencies

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

```tsx
const searchQuery = signal("react");

const results = signal({ searchQuery }, async ({ deps, abortSignal }) => {
  console.log(`Fetching results for: ${deps.searchQuery}`);

  const response = await fetch(`/search?q=${deps.searchQuery}`, {
    signal: abortSignal, // Pass the abort signal to fetch
  });

  return response.json();
});

// User types quickly:
searchQuery.set("react"); // Starts fetch for "react"
searchQuery.set("reacti"); // Cancels "react", starts "reacti"
searchQuery.set("reactive"); // Cancels "reacti", starts "reactive"
// Only the last request completes!
```

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

#### Real-World Example: User Profile Loader

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

Here's when to use each pattern:

| Pattern           | Use When                            | Example                                           |
| ----------------- | ----------------------------------- | ------------------------------------------------- |
| **Single value**  | Creating simple state               | `signal(0)`                                       |
| **With equality** | Objects/arrays that need comparison | `signal({ name: 'John' }, "shallow")`             |
| **`.to()`**       | Transform one signal                | `count.to(x => x * 2)`                            |
| **Multiple deps** | Combine multiple signals            | `signal({ a, b }, ({ deps }) => deps.a + deps.b)` |
| **Async**         | Data fetching                       | `signal(async () => fetch(...))`                  |
| **Async + deps**  | Data fetching with params           | `signal({ id }, async ({ deps }) => fetch(...))`  |

<details>
<summary>📖 <strong>See All Patterns in Action</strong></summary>

```tsx
import { signal } from "rextive";
import { select } from "rextive/op";

// 1. Simple value
const count = signal(0);

// 2. With custom equality
const user = signal({ name: "Alice", age: 30 }, "shallow");

// 3. Transform with operator
const doubled = count.pipe(select((x) => x * 2));

// 4. Multiple dependencies
const fullName = signal(
  { firstName, lastName },
  ({ deps }) => `${deps.firstName} ${deps.lastName}`
);

// 5. Async (no dependencies)
const config = signal(async () => {
  const res = await fetch("/api/config");
  return res.json();
});

// 6. Async with dependencies
const userData = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal,
  });
  return res.json();
});
```

</details>

---

## ✨ What Makes Rextive Different?

### 🎯 Lazy Tracking - Subscribe Only to What You Use

Most state management libraries make you subscribe to everything upfront. Rextive is **smart** - it only subscribes to what you actually access.

```tsx
// ❌ Traditional libraries: Subscribe to everything
const { user, posts, comments } = useStore((state) => ({
  user: state.user, // Subscribed
  posts: state.posts, // Subscribed
  comments: state.comments, // Subscribed (even though we don't use it!)
}));

return <div>{user.name}</div>; // Only using 'user'
// Problem: Component re-renders when posts or comments change!
```

```tsx
// ✅ Rextive: Intelligent lazy tracking
import { rx, wait } from "rextive/react";

{
  rx(() => {
    // Use wait() when you know the value is a signal or promise
    const userData = wait(user());
    return <div>{userData.name}</div>;
    // Only accessed 'user', so only subscribed to 'user' signal
    // Changes to posts/comments won't trigger re-renders!
  });
}

// wait() also supports multiple signals/promises at once
{
  rx(() => {
    const [userData, postsData] = wait([user(), posts()]);
    return (
      <div>
        {userData.name}: {postsData.length} posts
      </div>
    );
  });
}
```

<details>
<summary>📖 <strong>How Lazy Tracking Works</strong></summary>

```tsx
{
  rx(() => {
    // Rextive tracks which signals you access inside this function

    const userData = wait(user()); // ✅ Accessed: subscribed to 'user'
    // posts() not called              ✅ Not subscribed to 'posts'
    // comments() not called           ✅ Not subscribed to 'comments'

    return <div>{userData.name}</div>;
  });
}

// Later, if you conditionally access 'posts':
{
  rx(() => {
    const userData = wait(user());
    if (userData.isPremium) {
      return <PostsList posts={wait(posts())} />; // Now subscribed to 'posts' too!
    }
    return <div>{userData.name}</div>;
  });
}
```

**Benefits:**

- ⚡ Better performance (fewer subscriptions)
- 🎯 Fewer re-renders (only when data you use changes)
- 🧠 No manual optimization needed

</details>

---

### 🎭 Transparent Async States - No Separate Loading/Error/Data Concepts

Unlike Apollo, React Query, or other data fetching libraries, **you don't need to explicitly destructure or manage** `loading`, `error`, and `data` states. Rextive handles async states transparently - access them however you need:

```tsx
import { signal, rx, wait, loadable } from "rextive/react";

const user = signal(async () => fetchUser());

// ❌ Traditional libraries: Always deal with loading/error/data
const { loading, error, data } = useQuery(FETCH_USER);
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
return <div>User: {data.name}</div>;

// ✅ Rextive Option 1: Use wait() for Suspense (throws if loading)
{
  rx(() => {
    const userData = wait(user()); // Throws for Suspense
    return <div>User: {userData.name}</div>;
  });
}

// ✅ Rextive Option 2: Use loadable() for manual loading states
{
  rx(() => {
    const state = loadable(user); // Pass signal directly, no need to invoke
    if (state.loading) return <div>Loading...</div>;
    if (state.error) return <div>Error!</div>;
    return <div>User: {state.value.name}</div>;
  });
}
```

<details>
<summary>📖 <strong>Why This is Powerful</strong></summary>

**No Separate Concepts - Just Signals:**

```tsx
// Traditional data fetching libraries force you to think in terms of:
// - loading state
// - error state
// - data state
// This creates artificial separation and boilerplate

// Rextive: A signal is just a signal
const user = signal(async () => fetchUser());
const count = signal(0);

// Use both the SAME way with rx() and automatic tracking!
{
  rx(() => (
    <div>
      {wait(user()).name} has count: {count()}
    </div>
  ));
}
```

**Choose Your Style:**

```tsx
// Style 1: Let Suspense handle it (cleanest for happy path)
function UserProfile() {
  return rx(() => <div>{wait(user()).name}</div>);
}

// Style 2: Manual control (when you need custom loading UI)
function UserProfile() {
  return rx(() => {
    const state = loadable(user);
    if (state.loading) return <Spinner />;
    return <div>{state.value.name}</div>;
  });
}

// Style 3: Mix both approaches in one component
function UserProfile() {
  return rx(() => {
    const userState = loadable(user);

    // Show custom loading for user
    if (userState.loading) return <UserSkeleton />;

    // Use Suspense for posts
    return (
      <div>
        <h1>{userState.value.name}</h1>
        <Suspense fallback={<div>Loading posts...</div>}>
          <PostsList posts={wait(posts())} />
        </Suspense>
      </div>
    );
  });
}
```

**Benefits:**

- 🎯 **No boilerplate** - Don't destructure `loading`/`error`/`data` everywhere
- 🔄 **Flexible** - Choose Suspense OR manual control per component
- ✨ **Unified** - Async signals work exactly like sync signals
- 🧠 **Simpler mental model** - Everything is just a signal

</details>

---

### ⚡ Unified Sync/Async - Same API for Everything

No need to learn different APIs for sync vs async state. Everything works the same way:

```tsx
import { signal, rx } from "rextive/react";

// Three different types of signals
const count = signal(0); // Sync state
const doubled = count.to((x) => x * 2); // Computed (sync)
const user = signal(async () => fetchUser()); // Async state

// Use them ALL the same way with rx() and auto-tracking!
{
  rx(() => (
    <div>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
      <p>User: {wait(user()).name}</p>
    </div>
  ));
}
```

<details>
<summary>📖 <strong>Why This Matters</strong></summary>

```tsx
// Traditional React: Different APIs for different types
const [count, setCount] = useState(0); // Sync
const doubled = useMemo(() => count * 2, [count]); // Computed
const { data: user } = useQuery(["user"], fetchUser); // Async

// Rextive: Same API for all
const count = signal(0);
const doubled = count.to((x) => x * 2);
const user = signal(async () => fetchUser());

// All work with rx() and automatic signal tracking!
// Use wait() to unwrap async values, loadable() for loading states
```

**Benefits:**

- 🧠 Less to learn (one API instead of many)
- 🔄 Easy to convert sync → async or vice versa
- ✨ More maintainable code

</details>

---

### 🧠 Smart Automatic Request Cancellation

When dependencies change, Rextive **automatically cancels** pending async operations:

```tsx
import { signal } from "rextive";

const searchTerm = signal("react");

const results = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  // abortSignal is automatically provided
  const response = await fetch(`/search?q=${deps.searchTerm}`, {
    signal: abortSignal, // Pass it to fetch
  });
  return response.json();
});

// User types "vue"
searchTerm.set("vue");
// What happens:
// 1. Previous fetch (for "react") is automatically cancelled
// 2. New fetch (for "vue") starts immediately
// 3. No race conditions possible!
```

<details>
<summary>📖 <strong>Without Automatic Cancellation (The Old Way)</strong></summary>

```tsx
// ❌ Traditional approach: Manual cancellation (error-prone!)
const [searchTerm, setSearchTerm] = useState("react");
const [results, setResults] = useState([]);

useEffect(() => {
  const controller = new AbortController(); // Create manually

  fetch(`/search?q=${searchTerm}`, {
    signal: controller.signal,
  })
    .then((res) => res.json())
    .then(setResults);

  return () => controller.abort(); // Remember to abort!
}, [searchTerm]);

// ✅ Rextive: Automatic cancellation (foolproof!)
const searchTerm = signal("react");
const results = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/search?q=${deps.searchTerm}`, {
    signal: abortSignal, // Automatically managed!
  });
  return res.json();
});
```

**Benefits:**

- ✅ No memory leaks from pending requests
- ✅ No race conditions (old responses can't overwrite new ones)
- ✅ Less code (no manual cleanup)
- ✅ Harder to make mistakes

</details>

---

### 🎨 Framework Agnostic - Use Anywhere

Rextive's core is **framework-independent**. Use it with any framework or vanilla JS:

```tsx
// ✅ Core library (works anywhere)
import { signal } from "rextive";

const count = signal(0);
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

// Vanilla JS
count.on((value) => {
  document.querySelector("#count").textContent = value;
});

// React
import { rx } from "rextive/react";
const Counter = () => rx(count);

// Vue, Svelte, Angular - same signal API!
```

**Benefits:**

- 🔄 Share state logic across frameworks
- 📦 Learn once, use everywhere
- 🎯 Gradually adopt in existing projects
- 🚀 Not locked into any framework

---

## 🔥 Feature Comparison

See how Rextive stacks up against other state management solutions:

| Feature                   | Rextive                    | Others                                             |
| ------------------------- | -------------------------- | -------------------------------------------------- |
| **Learning Curve**        | 🟢 One concept (`signal`)  | 🟡 Multiple APIs (atoms, stores, hooks, providers) |
| **Lazy Tracking**         | 🟢 Automatic               | 🔴 Manual selectors required                       |
| **Async Support**         | 🟢 Built-in native support | 🟡 Requires separate libraries                     |
| **Request Cancellation**  | 🟢 Automatic               | 🔴 Manual setup required                           |
| **Component Scope**       | 🟢 `useScope` hook         | 🔴 Complex teardown logic                          |
| **Global State**          | 🟢 Just export signals     | 🟡 Requires providers/context                      |
| **Framework Independent** | 🟢 Works everywhere        | 🔴 Often React-only                                |
| **Bundle Size**           | 🟢 Tiny (~5KB)             | 🟡 Often larger (10-50KB)                          |
| **TypeScript**            | 🟢 Perfect inference       | 🟡 Varies by library                               |
| **Debugging**             | 🟢 Named signals           | 🟡 Varies by library                               |

**Legend:** 🟢 Excellent | 🟡 Acceptable | 🔴 Needs improvement

---

## 📖 Learn by Example

Real-world examples to help you master Rextive:

### Example 1: Counter (The Basics)

Let's build a fully-featured counter with derived state:

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
      {/* Render reactive values */}
      <h1>Count: {rx(count)}</h1>
      <p>Doubled: {rx(doubled)}</p>
      <p>Is Positive: {rx(isPositive, (pos) => (pos ? "Yes ✓" : "No ✗"))}</p>
      <p>Is Even: {rx(isEven, (even) => (even ? "Yes ✓" : "No ✗"))}</p>

      {/* Update state */}
      <button onClick={() => count.set((x) => x + 1)}>Increment</button>
      <button onClick={() => count.set((x) => x - 1)}>Decrement</button>
      <button onClick={() => count.reset()}>Reset to 0</button>
    </div>
  );
}
```

<details>
<summary>📖 <strong>Code Breakdown</strong></summary>

```tsx
// 1. Create base state
const count = signal(0);
// - Initial value: 0
// - Can be read with count()
// - Can be updated with count.set()

// 2. Create derived state
const doubled = count.to((x) => x * 2);
// - Automatically computes when count changes
// - count = 5 → doubled = 10
// - Lazy: only computed when accessed

// 3. Render with rx()
{
  rx(count);
}
// - Subscribes to count signal
// - Re-renders this part when count changes
// - Other parts of component don't re-render

// 4. Transform before rendering
{
  rx(isPositive, (pos) => (pos ? "Yes ✓" : "No ✗"));
}
// - Second argument: transform function
// - Receives the signal's value
// - Returns what to render

// 5. Update with function
count.set((x) => x + 1);
// - x = current value
// - Returns new value
// - Alternative: count.set(5) for direct value
```

</details>

### Example 2: Async Data Fetching with Auto-Cancel

A realistic user profile loader with automatic request cancellation:

```tsx
import { signal, rx } from "rextive/react";
import { Suspense } from "react";

// User ID that can change (e.g., from route params)
const userId = signal(1);

// Async signal that fetches user data
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  console.log(`Fetching user ${deps.userId}...`);

  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal, // ✅ Automatically cancels when userId changes
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
});

function Profile() {
  return (
    <div>
      <h2>User Profile</h2>

      {/* Buttons to switch users */}
      <button onClick={() => userId.set(1)}>Load User 1</button>
      <button onClick={() => userId.set(2)}>Load User 2</button>
      <button onClick={() => userId.set(3)}>Load User 3</button>

      {/* React Suspense shows fallback while loading */}
      <Suspense fallback={<div>Loading user...</div>}>
        {rx(user, (u) => (
          <div>
            <h3>{u.name}</h3>
            <p>Email: {u.email}</p>
            <p>ID: {u.id}</p>
          </div>
        ))}
      </Suspense>
    </div>
  );
}
```

<details>
<summary>📖 <strong>How Automatic Cancellation Works</strong></summary>

```tsx
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  // This function runs whenever userId changes

  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal, // Connect abort signal to fetch
  });

  return res.json();
});

// Scenario: User clicks buttons rapidly
userId.set(1); // Starts fetch for user 1
userId.set(2); // Cancels fetch for user 1, starts fetch for user 2
userId.set(3); // Cancels fetch for user 2, starts fetch for user 3
// Only the fetch for user 3 completes!

// What happens internally:
// 1. userId changes from 1 → 2
// 2. Rextive aborts the fetch for user 1 (abortSignal is triggered)
// 3. New fetch for user 2 starts with a new abortSignal
// 4. If userId changes again, step 2-3 repeat
```

**Why this matters:**

- ✅ No race conditions (old responses can't overwrite new ones)
- ✅ Better UX (no stale data displayed)
- ✅ Better performance (fewer concurrent requests)
- ✅ No manual cleanup needed

</details>

<details>
<summary>📖 <strong>Using with Manual Loading States</strong></summary>

Instead of Suspense, you can handle loading/error states manually using `loadable()`:

```tsx
import { loadable } from "rextive";

function ProfileManual() {
  return rx(() => {
    const state = loadable(user);

    if (state.loading) {
      return <div>Loading user...</div>;
    }

    if (state.error) {
      return <div>Error: {state.error.message}</div>;
    }

    return (
      <div>
        <h3>{state.value.name}</h3>
        <p>Email: {state.value.email}</p>
      </div>
    );
  });
}
```

**Loadable states:**

- `state.loading` - `true` if Promise is pending
- `state.value` - The resolved value when successful
- `state.error` - The error object if Promise rejected
- `state.status` - `"loading"` | `"success"` | `"error"`

</details>

### Example 3: Advanced Timeout & Cancellation

Combine automatic cancellation with timeouts and manual control:

```tsx
import { signal, wait, producer } from "rextive";

const userId = signal(1);

// Pattern 1: Add timeout to prevent hanging requests
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  // Combine automatic cancellation + 5 second timeout
  const timeoutSignal = AbortSignal.any([
    abortSignal, // Cancelled when userId changes
    AbortSignal.timeout(5000), // Cancelled after 5 seconds
  ]);

  try {
    const res = await fetch(`/api/users/${deps.userId}`, {
      signal: timeoutSignal,
    });
    return res.json();
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error("Request timed out after 5 seconds");
    }
    throw error;
  }
});

// Pattern 2: Manual + automatic cancellation
const searchTerm = signal("");

// Use producer to create fresh AbortController for each computation
const manualController = producer(() => new AbortController());

const searchResults = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  if (!deps.searchTerm) return [];

  // Get fresh controller for this computation (creates new one each time)
  const controller = manualController.next();

  // Combine three cancellation sources
  const combinedSignal = AbortSignal.any([
    abortSignal, // Auto: when searchTerm changes
    controller.signal, // Manual: current computation's controller
    AbortSignal.timeout(10000), // Timeout: after 10 seconds
  ]);

  const res = await fetch(`/search?q=${deps.searchTerm}`, {
    signal: combinedSignal,
  });
  return res.json();
});

// Cancel current search (only affects in-progress computation)
manualController.current().abort();

// Next computation will get a fresh AbortController automatically

// Pattern 3: Retry with timeout
const data = signal(async ({ abortSignal, safe }) => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // 3 second timeout per attempt
      const timeoutSignal = AbortSignal.any([
        abortSignal,
        AbortSignal.timeout(3000),
      ]);

      const res = await fetch("/api/unreliable-endpoint", {
        signal: timeoutSignal,
      });

      if (res.ok) return res.json();

      attempt++;
      // Wait 1s before retry - never resolves if aborted
      await safe(wait.delay(1000));
    } catch (error) {
      if (error.name === "TimeoutError") {
        attempt++;
        continue; // Retry
      }
      throw error; // Don't retry other errors
    }
  }

  throw new Error("Failed after 3 attempts");
});
```

<details>
<summary>📖 <strong>Understanding AbortSignal.any()</strong></summary>

```tsx
const combinedSignal = AbortSignal.any([
  abortSignal, // Cancelled when dependency changes
  AbortSignal.timeout(5000), // Cancelled after 5 seconds
  controller.signal, // Cancelled when controller.abort() is called
]);

// The combined signal is aborted when ANY of the signals abort:
// - If searchTerm changes → combinedSignal aborts
// - If 5 seconds pass → combinedSignal aborts
// - If controller.abort() is called → combinedSignal aborts
```

**Use cases:**

- ✅ **Timeouts** - Prevent hanging requests
- ✅ **Manual control** - Cancel button in UI
- ✅ **Global cancellation** - Cancel all requests on logout
- ✅ **Retry logic** - Cancel individual attempts

</details>

### Example 4: Component-Scoped State with Auto-Cleanup

Create signals that live with your component and automatically cleanup when unmounted:

```tsx
import { signal, disposable, rx, useScope } from "rextive/react";
import { select } from "rextive/op";

function TodoList() {
  // Create component-scoped signals and actions
  const scope = useScope(() => {
    // These signals exist only while this component is mounted
    const todos = signal([
      { id: 1, text: "Learn Rextive", status: "done" },
      { id: 2, text: "Build app", status: "active" },
      { id: 3, text: "Deploy", status: "active" },
    ]);

    const filter = signal("all"); // "all" | "active" | "done"

    // Derived: filtered todos based on current filter
    const filteredTodos = signal({ todos, filter }, ({ deps }) => {
      if (deps.filter === "all") return deps.todos;
      return deps.todos.filter((t) => t.status === deps.filter);
    });

    // Derived: count of active todos
    const activeCount = todos.pipe(
      select((list) => list.filter((t) => t.status === "active").length)
    );

    // Actions
    const addTodo = (text) => {
      todos.set((list) => [
        ...list,
        { id: Date.now(), text, status: "active" },
      ]);
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

    // ✅ disposable() only disposes items with dispose method
    // Regular functions (addTodo, toggleTodo) are included for convenience
    // When component unmounts, signals are automatically cleaned up
    return disposable({
      todos,
      filter,
      filteredTodos,
      activeCount,
      addTodo,
      toggleTodo,
    });
  });

  return (
    <div>
      <h2>Todo List</h2>

      {/* Filter buttons */}
      <div>
        <button onClick={() => scope.filter.set("all")}>All</button>
        <button onClick={() => scope.filter.set("active")}>Active</button>
        <button onClick={() => scope.filter.set("done")}>Done</button>
      </div>

      {/* Active count */}
      <p>Active todos: {rx(scope.activeCount)}</p>

      {/* Filtered todo list */}
      {rx(scope.filteredTodos, (todos) => (
        <ul>
          {todos.map((todo) => (
            <li
              key={todo.id}
              onClick={() => scope.toggleTodo(todo.id)}
              style={{
                textDecoration:
                  todo.status === "done" ? "line-through" : "none",
                cursor: "pointer",
              }}
            >
              {todo.text}
            </li>
          ))}
        </ul>
      ))}

      {/* Add todo form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.target.elements.todoInput;
          scope.addTodo(input.value);
          input.value = "";
        }}
      >
        <input name="todoInput" placeholder="New todo..." />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
```

<details>
<summary>📖 <strong>Understanding useScope()</strong></summary>

```tsx
const scope = useScope(() => {
  // This factory function runs ONCE when component mounts

  const mySignal = signal(0);
  // Signal is created and tied to this component's lifecycle

  return disposable({ mySignal });
  // disposable() is shorthand for: { mySignal, dispose: [mySignal] }
});

// When component unmounts:
// 1. Rextive calls mySignal.dispose()
// 2. All subscriptions are cleaned up
// 3. No memory leaks!
```

**Without useScope (memory leak):**

```tsx
// ❌ BAD: Signal lives forever, even after unmount
const mySignal = signal(0);

function BadComponent() {
  // This signal never gets cleaned up!
  return <div>{rx(mySignal)}</div>;
}
```

**With useScope (auto-cleanup):**

```tsx
// ✅ GOOD: Signal cleaned up on unmount
function GoodComponent() {
  const { mySignal } = useScope(() => {
    const mySignal = signal(0);
    return disposable({ mySignal });
  });

  return <div>{rx(mySignal)}</div>;
  // When this component unmounts, mySignal is automatically disposed
}
```

</details>

### Example 5: React Query-like Data Fetching

Build a reusable query pattern similar to React Query:

> **💡 Key Pattern:** Use `rx(() => ...)` with `wait()` for Suspense or `loadable()` for manual loading states.

```tsx
import {
  signal,
  disposable,
  rx,
  useScope,
  wait,
  loadable,
} from "rextive/react";

// Reusable query factory
function createQuery(endpoint, options = {}) {
  // Parameters for the query (starts undefined = not loaded yet)
  const params = signal();

  // Result signal (fetches when params change)
  const result = signal({ params }, async ({ deps, abortSignal }) => {
    if (!deps.params) return null; // Don't fetch without params

    const res = await fetch(endpoint, {
      method: options.method || "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deps.params),
      signal: abortSignal, // Auto-cancel when params change
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return await res.json();
  });

  // Query function - trigger with new params
  const query = (newParams) => {
    params.set(newParams);
    // Return the promise so you can await the result if needed
    return result();
  };

  // Return query object
  return {
    params,
    result,
    query,
    refetch: result.refresh, // Trigger immediate re-fetch
    stale: result.stale, // Mark stale (lazy re-fetch on next access)
    dispose: disposable({ result, params }).dispose,
  };
}

// Option 1: Component-scoped query (cleaned up on unmount)
function UserProfile({ userId }) {
  // Create query and auto-trigger when userId changes
  const userQuery = useScope(() => createQuery("/api/user"), {
    update: [(q) => q.query({ id: userId }), userId],
  });

  // Optional: Manually trigger and await result
  const handleManualFetch = async () => {
    try {
      const user = await userQuery.query({ id: userId });
      console.log("Fetched user:", user);
    } catch (error) {
      console.error("Failed to fetch:", error);
    }
  };

  return (
    <div>
      <h2>User Profile</h2>

      {/* Refresh button */}
      <button onClick={() => userQuery.refetch()}>Refresh</button>
      <button onClick={handleManualFetch}>Manual Fetch</button>

      {/* Use loadable() for manual loading states */}
      {rx(() => {
        const state = loadable(userQuery.result());

        // Handle loading
        if (state.loading) {
          return <div>Loading user...</div>;
        }

        // Handle error
        if (state.error) {
          return (
            <div style={{ color: "red" }}>Error: {state.error.message}</div>
          );
        }

        // Handle no data
        const user = state.value;
        if (!user) {
          return <div>No user selected</div>;
        }

        // Render data
        return (
          <div>
            <h3>{user.name}</h3>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
          </div>
        );
      })}
    </div>
  );
}

// Option 2: Global query (shared across components, manual cleanup)
export const userQuery = createQuery("/api/user");

function AnotherComponent() {
  return (
    <div>
      {/* Consume the same global query with loadable() */}
      {rx(() => {
        const state = loadable(userQuery.result());
        if (state.loading) return <div>Loading...</div>;
        if (state.error) return <div>Error!</div>;
        return <div>User: {state.value?.name}</div>;
      })}

      {/* Trigger query for a specific user */}
      <button onClick={() => userQuery.query({ id: 123 })}>
        Load User 123
      </button>

      {/* Refresh current query */}
      <button onClick={() => userQuery.refetch()}>Refresh</button>
    </div>
  );
}

// Note: Global queries should be disposed manually when no longer needed
// userQuery.dispose();
```

**When to use each pattern:**

- **Component-scoped (`useScope`)**: Best for component-specific data. Automatically cleaned up when component unmounts. Perfect for user profiles, form data, etc.
- **Global scope (`export const`)**: Best for app-wide shared data. Multiple components can access the same query. Perfect for current user, settings, cached lists. Remember to dispose manually when done!

<details>
<summary>📖 <strong>Pattern Breakdown</strong></summary>

```tsx
// 1. Create a query
const userQuery = createQuery("/api/user");

// 2. Trigger query with params
userQuery.query({ id: 123 });
// Returns a promise you can await if needed

// 3. Change params - previous fetch is auto-cancelled
userQuery.query({ id: 456 });

// 4. Manually refetch with same params
userQuery.refetch();

// 5. In React components with useScope
const userQuery = useScope(() => createQuery("/api/user"), {
  // Auto-trigger when userId changes using update option
  update: [(q) => q.query({ id: userId }), userId],
});

// 6. At UI layer, use loadable() for loading states
rx(() => {
  const state = loadable(userQuery.result());
  // state.loading: true if Promise is pending
  // state.error: Error object if rejected
  // state.value: the resolved promise value
});

// Alternative: Use wait() to throw to Suspense
rx(() => {
  const user = wait(userQuery.result()); // Throws if loading
  return <div>{user.name}</div>;
});
```

**Advantages over React Query:**

- ✨ Simpler API (just signals)
- 🎯 More flexible (customize as needed)
- 📦 Smaller bundle size
- 🔄 Works outside React too

</details>

### Example 6: Form Validation with Async Checks

Build a registration form with both **sync** and **async** validation (e.g., checking username availability):

> **💡 Key Pattern:** Use `rx(() => ...)` with `loadable()` to handle async validation states. The `safe()` method ensures async work is cancelled if the field value changes.

```tsx
import {
  signal,
  disposable,
  rx,
  useScope,
  wait,
  loadable,
} from "rextive/react";

function RegistrationForm() {
  const scope = useScope(() => {
    // Simulated database of existing usernames
    const existingUsernames = ["admin", "testuser", "john123"];

    // Form fields
    const fields = {
      name: signal(""),
      username: signal(""),
    };

    // Validation errors - each derives from its field
    const errors = {
      // Sync validation: name field
      name: fields.name.to((value) => {
        if (value.length === 0) {
          return "Name is required";
        }
        if (value.length < 2) {
          return "Name must be at least 2 characters";
        }
        return undefined;
      }),

      // Async validation: username field
      // Uses safe() to cancel if user changes input during validation
      username: fields.username.to(async (value, { safe }) => {
        if (value.length === 0) {
          return "Username is required";
        }

        // Simulate async validation (e.g., API call to check username)
        // safe() ensures this never resolves if the signal is aborted
        await safe(wait.delay(500));

        if (existingUsernames.includes(value)) {
          return "Username already taken";
        }

        return undefined;
      }),
    };

    return disposable({ fields, errors });
  });

  /**
   * Rendering with loadable():
   *
   * Use loadable() to get loading/error/value state from promises:
   * - state.loading: true while Promise is pending
   * - state.value: resolved value (for Promises) or the value itself
   * - state.error: rejected reason (only for failed Promises)
   *
   * This allows graceful loading states and error handling in the UI.
   */
  // Reusable field component using loadable()
  const Field = ({
    label,
    field,
    validation,
  }: {
    label: string;
    field: MutableSignal<string>;
    validation: Signal<void | string | Promise<string | void>>;
  }) =>
    rx(() => {
      const fieldValue = field();
      const validationState = loadable(validation);

      return (
        <div style={{ marginBottom: "1rem" }}>
          <label>
            {label}:
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => field.set(e.target.value)}
            />
          </label>

          {/* Show loading state (only visible for async validation) */}
          {validationState.loading && (
            <div style={{ color: "blue", fontSize: "0.9em" }}>
              Checking availability...
            </div>
          )}

          {/* Show error message (works for both sync and async) */}
          {(validationState.value || validationState.error) && (
            <div style={{ color: "red", fontSize: "0.9em" }}>
              {String(validationState.value || validationState.error)}
            </div>
          )}
        </div>
      );
    });

  return (
    <form>
      <h2>Register</h2>

      {/* Sync validation field */}
      <Field
        label="Name"
        field={scope.fields.name}
        validation={scope.errors.name}
      />

      {/* Async validation field */}
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

**Key Features:**

- **🎯 Unified approach** - Use `loadable()` for both sync and async validation
- **🔄 Sync validation** - Instant feedback for name field
- **⏳ Async validation** - Username availability check with loading state
- **🚫 Auto-cancellation** - `safe()` cancels pending checks when user types
- **📊 Loading states** - Access via `loadable(validation).loading`
- **✨ Simple API** - Use `state.value` or `state.error` for results

<details>
<summary>📖 <strong>How Async Validation Works</strong></summary>

**Flow for username field:**

```tsx
// 1. User types "ad"
username.set("ad");
↓
// 2. Validation signal starts async check
errors.username (async computation begins)
  → Check if empty: No
  → await safe(wait.delay(500))  // Simulate API call
↓
// 3. UI shows loading state via loadable()
const state = loadable(validation);
state.loading === true
  → Show "Checking availability..."
↓
// 4. If user types again during validation
username.set("admin");
↓
// 5. Previous validation is CANCELLED (safe() never resolves)
// 6. New validation starts from scratch
errors.username (new async computation)
  → await safe(wait.delay(500))
  → Check database: "admin" exists
  → Return "Username already taken"
↓
// 7. UI shows error via loadable()
state.value === "Username already taken"
  → Show "Username already taken"
```

**Key Patterns:**

- **`safe()` for cancellation** - Async work is cancelled if field value changes
- **`loadable(value).loading`** - Check if validation is in progress
- **`loadable(value).value`** - Access validation result (works for sync and async)
- **`loadable(value).error`** - Access any error that occurred
- **No race conditions** - Previous validations are automatically cancelled

</details>

### Example 7: Debounced Search

Build a search box with debouncing and automatic cancellation:

```tsx
import { signal, disposable, rx, useScope, wait } from "rextive/react";

function SearchBox() {
  const scope = useScope(() => {
    // Raw search input (updates immediately as user types)
    const searchInput = signal("");

    // Search results (debounced and async)
    const results = signal(
      { searchInput },
      async ({ deps, abortSignal, safe }) => {
        const query = deps.searchInput.trim();

        // Don't search for empty queries
        if (!query) return [];

        // Don't search for very short queries
        if (query.length < 2) return [];

        // Debounce: wait 300ms - never resolves if aborted
        await safe(wait.delay(300));

        console.log(`Searching for: ${query}`);

        // Perform the search
        try {
          const res = await fetch(
            `/api/search?q=${encodeURIComponent(query)}`,
            {
              signal: abortSignal, // Cancel if user types more
            }
          );

          if (!res.ok) throw new Error("Search failed");

          return await res.json();
        } catch (error) {
          if (error.name === "AbortError") {
            console.log("Search cancelled");
            return []; // Return empty on cancel
          }
          throw error; // Re-throw other errors
        }
      }
    );

    return disposable({ searchInput, results });
  });

  return (
    <div>
      <h2>Search</h2>

      {/* Search input */}
      {rx("input", {
        type: "text",
        value: scope.searchInput,
        onChange: (e) => scope.searchInput.set(e.target.value),
        placeholder: "Search (min 2 characters)...",
        style: { padding: "0.5em", width: "300px" },
      })}

      {/* Search hint */}
      {rx(
        scope.searchInput,
        (input) =>
          input.length > 0 &&
          input.length < 2 && (
            <div style={{ color: "gray", fontSize: "0.9em" }}>
              Type at least 2 characters to search
            </div>
          )
      )}

      {/* Results with loading state using loadable() */}
      {rx(() => {
        const searchValue = scope.searchInput();
        const resultsState = loadable(scope.results());

        // Check if results Promise is pending
        if (resultsState.loading) {
          return <div>Searching...</div>;
        }

        if (resultsState.error) {
          return (
            <div style={{ color: "red" }}>
              Error: {resultsState.error.message}
            </div>
          );
        }

        const items = resultsState.value;

        if (items.length === 0 && searchValue.trim().length >= 2) {
          return <div>No results found</div>;
        }

        return (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
```

<details>
<summary>📖 <strong>How Debouncing Works</strong></summary>

```tsx
const results = signal(
  { searchInput },
  async ({ deps, abortSignal, safe }) => {
    // Wait 300ms - never resolves if aborted
    await safe(wait.delay(300));

    // Proceed with search (no need to check aborted - safe handles it)
    return fetch(...);
  }
);

// User types "react" quickly:
// - User types "r"
//   → Start async function
//   → Wait 300ms...
// - User types "re" (before 300ms)
//   → Cancel previous function (abortSignal triggered)
//   → Start new async function
//   → Wait 300ms...
// - User types "rea" (before 300ms)
//   → Cancel previous, start new, wait 300ms...
// - User types "reac" (before 300ms)
//   → Cancel previous, start new, wait 300ms...
// - User types "react" (before 300ms)
//   → Cancel previous, start new, wait 300ms...
// - User stops typing
//   → After 300ms: fetch actually executes!

// Result: Only ONE fetch for "react", not 5 fetches
```

**Key Features:**

- ✅ Reduced API calls (only after user stops typing)
- ✅ Automatic cancellation (no race conditions)
- ✅ Better UX (less flickering)
- ✅ Lower server load

</details>

<details>
<summary>📖 <strong>Customizing Debounce Time</strong></summary>

```tsx
// Fast debounce (100ms) - for local data
await safe(wait.delay(100));

// Normal debounce (300ms) - for most searches
await safe(wait.delay(300));

// Slow debounce (500ms) - for expensive searches
await safe(wait.delay(500));

// Or make it configurable:
function createDebouncedSearch(debounceMs = 300) {
  const searchInput = signal("");

  const results = signal(
    { searchInput },
    async ({ deps, abortSignal, safe }) => {
      if (!deps.searchInput) return [];

      // Never resolves if aborted
      await safe(wait.delay(debounceMs));

      return fetch(`/search?q=${deps.searchInput}`);
    }
  );

  return { searchInput, results };
}
```

</details>

### Example 8: Batch Updates for Performance

When updating multiple signals at once, use batching to trigger only ONE notification:

```tsx
import { signal } from "rextive";

const firstName = signal("John");
const lastName = signal("Doe");
const email = signal("john@example.com");

// Computed signal (depends on all three)
const summary = signal(
  { firstName, lastName, email },
  ({ deps }) => `${deps.firstName} ${deps.lastName} <${deps.email}>`
);

// Subscribe to see notifications
summary.on((value) => {
  console.log("Summary updated:", value);
});

// ❌ Without batch: 3 separate notifications
firstName.set("Jane"); // Notification 1: "Jane Doe <john@example.com>"
lastName.set("Smith"); // Notification 2: "Jane Smith <john@example.com>"
email.set("jane@example.com"); // Notification 3: "Jane Smith <jane@example.com>"

// ✅ With batch: Single notification ⚡
signal.batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
  email.set("jane@example.com");
});
// Only ONE notification: "Jane Smith <jane@example.com>"
```

<details>
<summary>📖 <strong>When to Use Batching</strong></summary>

**Use batching when:**

- ✅ Updating multiple related signals at once
- ✅ Importing/loading data that affects many signals
- ✅ Resetting form state (multiple fields)
- ✅ Optimizing performance-critical updates

```tsx
// Example: Loading user profile
signal.batch(() => {
  userName.set(data.name);
  userEmail.set(data.email);
  userAge.set(data.age);
  userAvatar.set(data.avatar);
  userSettings.set(data.settings);
});
// UI updates once, not 5 times!

// Example: Resetting a form
const resetForm = () => {
  signal.batch(() => {
    formFields.forEach((field) => field.reset());
  });
};

// Example: Coordinated animation
signal.batch(() => {
  x.set(newX);
  y.set(newY);
  rotation.set(newRotation);
});
// All positions update simultaneously
```

**Don't need batching when:**

- ❌ Updating a single signal
- ❌ Updates happen at different times
- ❌ No shared subscribers

</details>

---

### Example 9: Persist to LocalStorage

Automatically save and load signal state from localStorage using `persistor()`:

```tsx
import { signal } from "rextive";
import { persistor } from "rextive/persist";

// Define your data shape for type safety
type AppSettings = {
  theme: string;
  fontSize: number;
  sidebarOpen: boolean;
};

// Create a type-safe persistor
const persist = persistor<AppSettings>({
  // load() is memoized - called only once even with multiple signals
  load: () => {
    const stored = localStorage.getItem("appSettings");
    return stored ? JSON.parse(stored) : {};
  },

  // save() receives { type, values } - handle merge vs overwrite
  save: (args) => {
    if (args.type === "merge") {
      // Individual mode - merge with existing
      const existing = JSON.parse(localStorage.getItem("appSettings") || "{}");
      localStorage.setItem(
        "appSettings",
        JSON.stringify({ ...existing, ...args.values })
      );
    } else {
      // Group mode - safe to overwrite
      localStorage.setItem("appSettings", JSON.stringify(args.values));
    }
  },

  // Error handler
  onError: (error, type) => {
    console.error(`Persistence ${type} failed:`, error);
  },
});

// Use as individual plugins - type-safe keys!
const theme = signal("dark", { use: [persist("theme")] }); // ✅
const fontSize = signal(16, { use: [persist("fontSize")] }); // ✅
const sidebarOpen = signal(true, { use: [persist("sidebarOpen")] }); // ✅
// persist("invalid") // ❌ TypeScript error - not a key of AppSettings

// ✅ On page load: Signals are automatically hydrated from localStorage
// ✅ On signal change: Automatically saved to localStorage
theme.set("light"); // Saved: { theme: "light" }
fontSize.set(18); // Saved: { fontSize: 18 }
```

<details>
<summary>📖 <strong>Persistor Options</strong></summary>

```tsx
import { persistor, type SaveArgs } from "rextive/persist";

type MyData = { count: number; name: string };

const persist = persistor<MyData>({
  // OPTIONAL: Load function (memoized - called once)
  load: () => {
    // Return an object with values
    // Keys should match your data shape
    return { count: 0, name: "" };
  },

  // OPTIONAL: Save function
  save: (args: SaveArgs<MyData>) => {
    // args.type: "merge" | "overwrite"
    // args.values: Partial<MyData> | MyData
    if (args.type === "merge") {
      // Individual mode - only changed key
      const existing = JSON.parse(localStorage.getItem("data") || "{}");
      localStorage.setItem(
        "data",
        JSON.stringify({ ...existing, ...args.values })
      );
    } else {
      // Group mode - full data shape
      localStorage.setItem("data", JSON.stringify(args.values));
    }
  },

  // OPTIONAL: Error handler
  onError: (error, type) => {
    // type = "load" | "save"
    console.error(`${type} error:`, error);
  },
});

// Two usage modes:

// 1. Individual plugin mode - each signal saved separately (merge)
const count = signal(0, { use: [persist("count")] });
const name = signal("", { use: [persist("name")] });

// 2. Group mode - all signals saved together (overwrite)
const cleanup = signal.use({ count, name }, [persist]);
// Call cleanup() to stop persistence
```

</details>

<details>
<summary>📖 <strong>Advanced: Custom Storage Backends</strong></summary>

```tsx
import { persistor } from "rextive/persist";

// IndexedDB persistence
const indexedDBPersist = persistor({
  load: async () => {
    const db = await openDB();
    return await db.get("appState");
  },
  save: async (args) => {
    const db = await openDB();
    if (args.type === "overwrite") {
      await db.put("appState", args.values);
    } else {
      const existing = (await db.get("appState")) || {};
      await db.put("appState", { ...existing, ...args.values });
    }
  },
});

// API persistence
const apiPersist = persistor({
  load: async () => {
    const res = await fetch("/api/settings");
    return res.json();
  },
  save: async (args) => {
    await fetch("/api/settings", {
      method: args.type === "merge" ? "PATCH" : "PUT",
      body: JSON.stringify(args.values),
    });
  },
});

// Session storage (simpler - just overwrite)
const sessionPersist = persistor({
  load: () => {
    const stored = sessionStorage.getItem("temp");
    return stored ? JSON.parse(stored) : {};
  },
  save: (args) => {
    // For simplicity, always merge
    const existing = JSON.parse(sessionStorage.getItem("temp") || "{}");
    sessionStorage.setItem(
      "temp",
      JSON.stringify({ ...existing, ...args.values })
    );
  },
});
```

</details>

---

## 🎯 Advanced Patterns

### Pattern 1: Chain Multiple Transformations

For complex transformations, chain multiple operators together:

```tsx
import { signal } from "rextive";
import { select, filter, scan } from "rextive/op";

// Source signal
const count = signal(1);

// Single transformation
const doubled = count.pipe(select((x) => x * 2));

// Chain multiple operators (executed left-to-right)
const result = count.pipe(
  filter((x) => x > 0), // Step 1: Only positive numbers
  select((x) => x * 2), // Step 2: Double the value
  scan((acc, x) => acc + x, 0) // Step 3: Running sum
);

// Test it
console.log(result()); // 0 (initial)
count.set(5);
console.log(result()); // 10 (5 * 2 = 10, sum = 0 + 10)
count.set(3);
console.log(result()); // 16 (3 * 2 = 6, sum = 10 + 6)
count.set(-1);
console.log(result()); // 16 (filtered out, unchanged)
count.set(2);
console.log(result()); // 20 (2 * 2 = 4, sum = 16 + 4)
```

<details>
<summary>📖 <strong>Available Operators</strong></summary>

**`select(fn, equals?)`** - Transform each value

```tsx
const doubled = count.pipe(select((x) => x * 2));
const userName = user.pipe(select((u) => u.name));
```

**`filter(predicate, equals?)`** - Only emit values that pass the test

```tsx
const positive = count.pipe(filter((x) => x > 0));
const adults = users.pipe(filter((u) => u.age >= 18));
```

**`scan(fn, initial, equals?)`** - Accumulate values (like Array.reduce)

```tsx
const sum = count.pipe(scan((acc, curr) => acc + curr, 0));
const history = count.pipe(scan((acc, curr) => [...acc, curr], []));
```

See the [Operators](#operators) section for detailed documentation.

</details>

#### Create Reusable Operator Pipelines

```tsx
import { select, filter, scan } from "rextive/op";

// Define reusable operators
const positiveOnly = filter((x: number) => x > 0);
const double = select((x: number) => x * 2);
const runningSum = scan((acc: number, x: number) => acc + x, 0);

// Apply to multiple signals
const signal1 = signal(5);
const signal2 = signal(10);

const result1 = signal1.pipe(positiveOnly, double, runningSum);
const result2 = signal2.pipe(positiveOnly, double, runningSum);

// Or create a factory
const createPositiveDoubleSum = (source: Signal<number>) => {
  return source.pipe(positiveOnly, double, runningSum);
};

const result3 = createPositiveDoubleSum(signal(15));
```

### Pattern 2: Group Signals with Tags

Tags let you group related signals and perform batch operations:

```tsx
import { signal } from "rextive";

// Create a tag to group form signals
const formTag = signal.tag();

// Create signals with the tag (use `use` option for both plugins and tags)
const name = signal("", { use: [formTag] });
const email = signal("", { use: [formTag] });
const message = signal("", { use: [formTag] });
const agreedToTerms = signal(false, { use: [formTag] });

// Reset all form fields at once
const resetForm = () => {
  formTag.forEach((s) => s.reset());
};

// Or use map() to collect results
const getAllValues = () => {
  return formTag.map((s) => s.get()); // Returns array of all values
};

// Validate all and collect errors
const validateAll = () => {
  const errors = formTag.map((s) => {
    const value = s();
    if (!value || value === false) {
      return `${s.displayName || "Field"} is required`;
    }
    return null;
  });
  return errors.filter(Boolean);
};

// Get count of signals with this tag
console.log(`Form has ${formTag.size} fields`);
```

#### Type-Safe Tags with Signal Kinds

Tags can be typed to accept specific signal kinds for better type safety:

```tsx
import { signal, tag } from "rextive";
import type { Tag } from "rextive";

// Default: General tag - accepts both mutable and computed signals
const mixedTag = tag<number>(); // Tag<number, "any">

// Mutable-only tag - semantic constraint for writable state
const stateTag: Tag<number, "mutable"> = tag<number, "mutable">();

// Computed-only tag - semantic constraint for derived values
const viewTag: Tag<number, "computed"> = tag<number, "computed">();

// Usage
const count = signal(0, { use: [stateTag] }); // ✅ Mutable signal with mutable tag
const doubled = signal({ count }, ({ deps }) => deps.count * 2, {
  use: [viewTag], // ✅ Computed signal with computed tag
});

// Both can use mixed tag
const all = signal(0, { use: [mixedTag] }); // ✅ Accepts any signal
```

**✅ Type-Safe Cross-Kind Protection:**

TypeScript now produces compile-time errors for cross-kind tag assignments:

```tsx
const computedTag = tag<number, "computed">();

// ❌ TypeScript Error: Computed tag cannot be used with mutable signal
const mutableSig = signal(0, { use: [computedTag] });

// ✅ Correct: Use a general tag or mutable-specific tag
const generalTag = tag<number>(); // Accepts any kind
const mutableTag = tag<number, "mutable">();
const mutableSig = signal(0, { use: [generalTag] }); // ✅ OK
const mutableSig2 = signal(0, { use: [mutableTag] }); // ✅ OK
```

**Best Practice:**

```tsx
// ✅ Recommended: Use general tags by default
const counters = tag<number>(); // Accepts both kinds (kind = "any")

// ✅ Use specific kinds only when you have strong semantic reasons
const writableState = tag<AppState, "mutable">(); // Only for state we modify
const readonlyViews = tag<string, "computed">(); // Only for derived values

// ✅ TypeScript enforces kind constraints at compile time
// Cross-kind mismatches will produce type errors
```

<details>
<summary>📖 <strong>Real-World Tag Usage</strong></summary>

```tsx
// Multiple tags per signal
const userTag = signal.tag();
const persistTag = signal.tag();

const userName = signal("", { use: [userTag, persistTag] });
const userEmail = signal("", { use: [userTag, persistTag] });
const sessionId = signal("", { use: [userTag] }); // Not persisted

// Reset user data
userTag.forEach((s) => s.reset());

// Collect all values using map()
const values = persistTag.map((s) => s()); // Returns array of values

// Save persistable data using map()
const saveData = () => {
  const data = persistTag.map((s) => ({
    name: s.displayName,
    value: s(),
  }));
  localStorage.setItem("data", JSON.stringify(data));
};

// Debug: Log all user-related signals
console.log(
  "User signals:",
  userTag.map((s) => `${s.displayName}: ${s()}`)
);

// Type-safe tag operations
const mutableTag = tag<number, "mutable">();
const count1 = signal(0, { use: [mutableTag] });
const count2 = signal(5, { use: [mutableTag] });

// All signals in this tag are guaranteed to be mutable
mutableTag.forEach((s) => {
  s.set((x) => x + 1); // ✅ Safe - all are MutableSignal
});

// Collect incremented values
const newValues = mutableTag.map((s) => {
  s.set((x) => x + 1);
  return s();
}); // [1, 6]
```

**Tag methods:**

| Method        | Description                                 |
| ------------- | ------------------------------------------- |
| `forEach(fn)` | Iterate over all signals                    |
| `map(fn)`     | Transform each signal, return results array |
| `size`        | Number of signals in the tag                |

**Use cases:**

- ✅ Form management (reset all fields)
- ✅ Feature flags (enable/disable groups)
- ✅ Persistence (save specific signals)
- ✅ Debugging (inspect related state)
- ✅ Performance (batch operations)
- ✅ Type safety (group signals by kind)
- ✅ Collecting values (`map()`)

</details>

---

### Pattern 3: Plugins - Extend Signal Behavior

Plugins let you extend signal behavior with reusable logic. A plugin is a function that receives a signal and optionally returns a cleanup function.

```tsx
import { signal } from "rextive";
import type { Plugin } from "rextive";

// Define a plugin
const logger: Plugin<number> = (sig) => {
  const name = sig.displayName || "unnamed";
  console.log(`[${name}] created: ${sig()}`);

  // Return cleanup function (optional)
  return sig.on(() => {
    console.log(`[${name}] changed: ${sig()}`);
  });
};

// Use the plugin with `use` option
const count = signal(0, { name: "count", use: [logger] });
// Logs: "[count] created: 0"

count.set(5);
// Logs: "[count] changed: 5"

count.dispose();
// Cleanup runs automatically
```

#### Real-World Plugin Examples

**1. Logger Plugin - Track signal changes:**

```tsx
const logger: Plugin<any> = (sig) => {
  const name = sig.displayName || "unnamed";
  console.log(`[${name}] created:`, sig());

  return sig.on(() => {
    console.log(`[${name}] changed:`, sig());
  });
};

const user = signal({ name: "Alice" }, { name: "user", use: [logger] });
// Logs: "[user] created: { name: 'Alice' }"

user.set({ name: "Bob" });
// Logs: "[user] changed: { name: 'Bob' }"
```

**2. Persister Plugin - Auto-save to localStorage:**

```tsx
import { persistor } from "rextive/persist";

// Use the built-in persistor for localStorage persistence
const persist = persistor({
  load: () => JSON.parse(localStorage.getItem("app-state") || "{}"),
  save: (args) => {
    const existing = JSON.parse(localStorage.getItem("app-state") || "{}");
    localStorage.setItem(
      "app-state",
      JSON.stringify({ ...existing, ...args.values })
    );
  },
});

// Auto-persists theme preference
const theme = signal("dark", { use: [persist("theme")] });
theme.set("light"); // Automatically saved to localStorage

// On next page load, theme is restored from localStorage
```

**3. Validator Plugin - Validate on change:**

```tsx
const validator =
  (validate: (v: string) => string | null): Plugin<string, "mutable"> =>
  (sig) => {
    return sig.on(() => {
      const error = validate(sig());
      if (error) {
        console.warn(`Validation error: ${error}`);
      }
    });
  };

const email = signal("", {
  use: [validator((v) => (v.includes("@") ? null : "Invalid email"))],
});

email.set("invalid");
// Warns: "Validation error: Invalid email"

email.set("valid@example.com");
// No warning
```

**4. Devtools Plugin - Register for debugging:**

```tsx
const devtoolsRegistry = new Map<string, any>();

const devtools: Plugin<any> = (sig) => {
  const name = sig.displayName || `signal_${devtoolsRegistry.size}`;
  devtoolsRegistry.set(name, sig);

  return () => {
    devtoolsRegistry.delete(name);
  };
};

const count = signal(0, { name: "count", use: [devtools] });
// devtoolsRegistry now has "count" -> signal

count.dispose();
// devtoolsRegistry no longer has "count"
```

#### Combining Multiple Plugins

```tsx
const count = signal(0, {
  name: "count",
  use: [logger, devtools, tracker], // Plugins run in order
});

// All plugins are applied and cleaned up together
count.dispose();
```

#### Type-Safe Plugins

Plugins can be typed for specific signal kinds:

```tsx
import type { Plugin } from "rextive";

// Works with any signal
const anyPlugin: Plugin<number> = (sig) => {
  console.log(sig());
};

// Only works with mutable signals (has .set() method)
const mutablePlugin: Plugin<number, "mutable"> = (sig) => {
  sig.set(100); // ✅ TypeScript knows sig has .set()
};

// Only works with computed signals (has .pause()/.resume())
const computedPlugin: Plugin<number, "computed"> = (sig) => {
  sig.pause(); // ✅ TypeScript knows sig has .pause()
  setTimeout(() => sig.resume(), 1000);
};
```

#### Tags vs Plugins: Key Differences

Both tags and plugins use the `use` option, but they serve different purposes:

| Feature        | Tag                                       | Plugin                             |
| -------------- | ----------------------------------------- | ---------------------------------- |
| **Purpose**    | Group and manage signals                  | Extend signal behavior             |
| **Execution**  | Registers signal + runs callbacks         | Runs once on creation              |
| **Lifecycle**  | `onAdd`, `onDelete`, `onChange` callbacks | Returns cleanup function           |
| **Collection** | Maintains a `Set` of signals              | No signal collection               |
| **Iteration**  | Can iterate with `forEach`, `size`        | Cannot iterate                     |
| **Cleanup**    | Auto-removes signal on dispose            | Cleanup function called on dispose |

**Tags - For Signal Management:**

```tsx
import { tag, signal } from "rextive";

// Tags manage collections of signals with lifecycle callbacks
const formTag = tag<string>({
  name: "formFields",

  // Called when signal is added to this tag
  onAdd: (sig, tag) => {
    console.log(`Field added: ${sig.displayName}, total: ${tag.size}`);
  },

  // Called when signal is removed (disposed)
  onDelete: (sig, tag) => {
    console.log(`Field removed: ${sig.displayName}, remaining: ${tag.size}`);
  },

  // Called on any change (add or delete)
  onChange: (type, sig, tag) => {
    console.log(`Change: ${type}, size: ${tag.size}`);
  },
});

// Add signals to tag
const name = signal("", { name: "name", use: [formTag] });
const email = signal("", { name: "email", use: [formTag] });
// Logs: "Field added: name, total: 1"
// Logs: "Field added: email, total: 2"

// Tag can iterate over all signals
formTag.forEach((sig) => sig.reset()); // Reset all form fields

// When signal is disposed, onDelete is called
name.dispose();
// Logs: "Field removed: name, remaining: 1"
```

**Plugins - For Signal Behavior:**

```tsx
import { signal } from "rextive";
import type { Plugin } from "rextive";

// Plugins extend behavior - run once, return cleanup
const logger: Plugin<any> = (sig) => {
  console.log(`Signal created: ${sig.displayName}`);

  // Subscribe to changes
  const unsubscribe = sig.on(() => {
    console.log(`Signal changed: ${sig()}`);
  });

  // Return cleanup (called on dispose)
  return unsubscribe;
};

const count = signal(0, { name: "count", use: [logger] });
// Logs: "Signal created: count"

count.set(5);
// Logs: "Signal changed: 5"

count.dispose();
// Cleanup runs - unsubscribes from changes
```

**Combining Tags and Plugins:**

```tsx
// Tags can include plugins that apply to all tagged signals
const trackedFormTag = tag<string>({
  name: "trackedForm",

  // Tag's own plugins - applied to every signal using this tag
  use: [logger, validator],

  // Tag lifecycle callbacks
  onAdd: (sig) => analytics.track("field_added", { name: sig.displayName }),
  onDelete: (sig) =>
    analytics.track("field_removed", { name: sig.displayName }),
});

// Signal gets: tag membership + logger plugin + validator plugin
const field = signal("", { use: [trackedFormTag] });
```

**When to Use Each:**

| Use Case                            | Use Tag             | Use Plugin   |
| ----------------------------------- | ------------------- | ------------ |
| Reset all form fields               | ✅                  | ❌           |
| Log signal changes                  | ❌                  | ✅           |
| Count signals in a group            | ✅                  | ❌           |
| Auto-save to localStorage           | ❌                  | ✅           |
| Batch operations on related signals | ✅                  | ❌           |
| Add validation behavior             | ❌                  | ✅           |
| Track signal creation/disposal      | ✅ (onAdd/onDelete) | ✅ (cleanup) |
| Enforce max number of signals       | ✅ (maxSize option) | ❌           |

<details>
<summary>📖 <strong>Plugin Best Practices</strong></summary>

**Do:**

- ✅ Return cleanup functions to prevent memory leaks
- ✅ Use `sig.displayName` for better debugging
- ✅ Keep plugins focused on a single responsibility
- ✅ Use type parameters for type-safe plugins

**Don't:**

- ❌ Perform expensive operations synchronously
- ❌ Modify signal state in ways that cause infinite loops
- ❌ Forget to clean up subscriptions

**Plugin Signature:**

```tsx
type Plugin<TValue, TKind extends SignalKind = "any"> = (
  signal: SignalOf<TValue, TKind>
) => (() => void) | void;
```

- Receives the signal instance
- Optionally returns a cleanup function
- Cleanup runs when signal is disposed

</details>

---

### Pattern 4: Generic Functions with `AnySignal`

When writing utility functions that work with **both** mutable and computed signals, use the `AnySignal<T>` type:

```tsx
import { signal, AnySignal } from "rextive";

// ✅ Generic function that accepts any signal type
function logSignalChanges<T>(s: AnySignal<T>, label: string) {
  // Common methods work on both types
  s.on((value) => {
    console.log(`[${label}] changed to:`, value);
  });

  s.when(someOtherSignal, (current) => {
    console.log(`[${label}] triggered by dependency`);
    current.refresh(); // ✅ Available on both types
  });

  return () => {
    s.dispose(); // ✅ Available on both types
  };
}

// Works with mutable signals
const count = signal(0);
logSignalChanges(count, "Counter");

// Works with computed signals
const doubled = signal({ count }, ({ deps }) => deps.count * 2);
logSignalChanges(doubled, "Doubled");
```

**Type Narrowing for Mutable-Specific Operations:**

```tsx
function syncSignals<T>(source: AnySignal<T>, target: AnySignal<T>) {
  source.on((value) => {
    // Use signal.is() to check if target is mutable
    if (signal.is(target, "mutable")) {
      // TypeScript knows target is MutableSignal here
      target.set(value); // ✅ .set() available
    } else {
      console.log("Target is computed (read-only)");
    }
  });
}

// Usage
const source = signal(0);
const mutableTarget = signal(0);
const computedTarget = signal({ source }, ({ deps }) => deps.source * 2);

syncSignals(source, mutableTarget); // Sets value on change
syncSignals(source, computedTarget); // Logs "read-only" message
```

**Use Cases:**

```tsx
// Use Case 1: Signal registry/manager
class SignalRegistry {
  private signals = new Map<string, AnySignal<any>>();

  register<T>(name: string, signal: AnySignal<T>) {
    this.signals.set(name, signal);
    signal.on(() => {
      console.log(`Signal "${name}" changed`);
    });
  }

  dispose(name: string) {
    const signal = this.signals.get(name);
    if (signal) {
      signal.dispose(); // ✅ Works for all signal types
      this.signals.delete(name);
    }
  }
}

// Use Case 2: Dependency tracker
function trackDependencies(signals: AnySignal<any>[]) {
  const tracker = signal<Record<string, any>>({});

  signals.forEach((s, i) => {
    s.on((value) => {
      tracker.set((prev) => ({
        ...prev,
        [`signal_${i}`]: value,
      }));
    });
  });

  return tracker;
}

// Use Case 3: Conditional refresh
function refreshIfStale<T>(s: AnySignal<T>, maxAge: number) {
  const lastRefresh = Date.now();

  s.when(someEvent, (current) => {
    const age = Date.now() - lastRefresh;
    if (age > maxAge) {
      current.refresh(); // ✅ Works for both types
    }
  });
}
```

**Why Use `AnySignal`?**

- ✅ **Write once, use everywhere** - Functions work with all signal types
- ✅ **Type-safe** - Full TypeScript inference for common methods
- ✅ **Type narrowing** - Check for mutable-specific operations when needed
- ✅ **Flexible APIs** - Accept any signal type in libraries/utilities

**When NOT to Use `AnySignal`:**

- ❌ When you specifically need `.set()` - use `MutableSignal<T>` instead
- ❌ When you specifically need `.pause()` - use `ComputedSignal<T>` instead
- ❌ When you need the base interface only - use `Signal<T>` instead

### Pattern 5: Fine-Grained Lifecycle Control

Get precise control over component lifecycle phases:

```tsx
import { useScope } from "rextive/react";

function Component() {
  // Track lifecycle phases
  const getPhase = useScope({
    init: () => {
      console.log("1. INIT: Before first render");
      // Perfect for: Creating signals, subscribing to external events
    },

    mount: () => {
      console.log("2. MOUNT: After first paint (componentDidMount)");
      // Perfect for: Starting animations, measuring DOM
    },

    render: () => {
      console.log("3. RENDER: On every render");
      // Perfect for: Tracking render count, performance monitoring
    },

    cleanup: () => {
      console.log("4. CLEANUP: React cleanup (may run 2-3x in StrictMode)");
      // Perfect for: Pausing, not for final cleanup
    },

    dispose: () => {
      console.log("5. DISPOSE: True unmount (runs exactly once)");
      // Perfect for: Cleanup, unsubscribe, close connections
    },
  });

  // Check current phase
  console.log("Current phase:", getPhase());

  return <div>Hello</div>;
}
```

<details>
<summary>📖 <strong>Lifecycle Phase Details</strong></summary>

| Phase       | When                     | Runs in StrictMode | Use For                        |
| ----------- | ------------------------ | ------------------ | ------------------------------ |
| **init**    | Before first render      | Once               | Signal creation, initial setup |
| **mount**   | After first paint        | Once               | DOM measurements, animations   |
| **update**  | After render (with deps) | Every effect run   | Sync effects, side effects     |
| **render**  | Every render             | Every render       | Tracking, debugging            |
| **cleanup** | React cleanup            | 2-3 times          | Pause, not for final cleanup   |
| **dispose** | True unmount             | **Exactly once**   | Final cleanup, unsubscribe     |

```tsx
// Example: Analytics tracking
useScope({
  mount: () => {
    analytics.pageView(window.location.pathname);
  },

  dispose: () => {
    const timeOnPage = Date.now() - mountTime;
    analytics.track("page-exit", { timeOnPage });
  },
});

// Example: WebSocket connection
useScope({
  init: () => {
    ws = new WebSocket(url);
    ws.onmessage = handleMessage;
  },

  dispose: () => {
    ws.close(); // Clean disconnect
  },
});

// Example: Update with dependencies
useScope({
  update: [
    () => {
      // Runs after render when userId changes
      analytics.track("user-changed", { userId });
    },
    userId, // Dependency
  ],
});

// Example: Update without dependencies (every render)
useScope({
  update: () => {
    // Runs after every render - use sparingly!
    console.log("Component updated");
  },
});

// Example: Render performance monitoring
let renderCount = 0;
useScope({
  render: () => {
    renderCount++;
    if (renderCount > 50) {
      console.warn("Component rendered 50+ times!");
    }
  },
});
```

</details>

---

## 🚀 Advanced Usages

### Signals with React Context for Optimized Rendering

One of the most powerful patterns is combining signals with React Context. Unlike traditional context that re-renders all consumers when the value changes, **signals in context only trigger re-renders when components actually access the signal's value** - thanks to lazy tracking!

#### The Problem with Traditional Context

```tsx
// ❌ Traditional React Context
const ThemeContext = createContext({ theme: "dark" });

function Parent() {
  const [theme, setTheme] = useState("dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Child />
    </ThemeContext.Provider>
  );
}

function Child() {
  const { theme } = useContext(ThemeContext);
  // Problem: This component re-renders even if it doesn't use 'theme'!
  // Just consuming the context causes re-renders

  return <div>I don't even use theme, but I re-render!</div>;
}
```

#### The Solution: Signals in Context

**Option 1: Using the `provider()` utility (Recommended)**

Rextive provides a built-in `provider()` function that handles all the boilerplate:

```tsx
import { provider, rx, signal } from "rextive/react";

type ThemeValue = "dark" | "light";

// ✨ Simple signal context - returns [hook, Provider]
const [useTheme, ThemeProvider] = provider({
  name: "Theme", // For debugging
  create: (value: ThemeValue) => {
    // Factory function: receives prop value, returns signal
    return signal(value);
  },
});

// That's it! Now use it:
function App() {
  return (
    // ThemeProvider creates and provides the theme signal to all children
    <ThemeProvider value="dark">
      <ChildComponent />
    </ThemeProvider>
  );
}

function ChildComponent() {
  // Access signal from context - no Provider component needed, provider() handles it
  const theme = useTheme();

  // Render signal value reactively - auto-subscribes to theme changes
  return <div>Theme: {rx(theme)}</div>;
}
```

**Option 2: Manual implementation (for understanding)**

Here's what `provider()` does under the hood:

```tsx
import { signal, rx, useScope, Signal } from "rextive/react";
import { createContext, useContext, useLayoutEffect } from "react";

type ThemeValue = "dark" | "light";

// Step 1: Create React Context
const ThemeContext = createContext<Signal<ThemeValue> | null>(null);

// Step 2: Custom hook to access the context
const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

// Step 3: Provider component
function ThemeProvider(props: {
  value: ThemeValue;
  children: React.ReactNode;
}) {
  // Create signal with useScope (auto-cleanup on unmount)
  const theme = useScope(() => signal(props.value));

  // Update signal when props.value changes
  useLayoutEffect(() => {
    theme.set(props.value);
  }, [props.value]);

  return (
    <ThemeContext.Provider value={theme}>
      {props.children}
    </ThemeContext.Provider>
  );
}

// Consumer components with smart re-rendering
function ChildComponent(props: { showTheme: boolean }) {
  // ✅ Get the theme signal from context
  const theme = useTheme();

  // This component does NOT re-render when theme changes!
  // It only re-renders when props.showTheme changes

  if (!props.showTheme) {
    // ✅ No theme signal tracked here
    return <div>Nothing to show</div>;
  }

  return (
    <div>
      {
        // ✅ Theme signal is only accessed/tracked inside rx()
        // Only THIS part re-renders when theme changes
      }
      Theme: {rx(theme)}
      <OtherPart /> {/* This doesn't re-render! */}
    </div>
  );
}

// Alternative: Using rx() with conditional tracking
function SmartComponent(props: { showTheme: boolean }) {
  const theme = useTheme();

  // Use rx() for automatic tracking
  return rx(() => {
    if (!props.showTheme) {
      // ✅ Theme signal NOT tracked here (we didn't call theme())
      return <div>Nothing</div>;
    }

    // ✅ Theme signal is tracked ONLY when this branch executes
    // Only re-renders when showTheme is true AND theme changes
    return <div>Theme: {theme()}</div>;
  });
}

// Usage
function App() {
  return (
    <ThemeProvider value="dark">
      <ChildComponent showTheme={true} />
      <SmartComponent showTheme={false} />
    </ThemeProvider>
  );
}
```

<details>
<summary>📖 <strong>Why This Pattern is Powerful</strong></summary>

**Traditional React Context problems:**

- ❌ Every consumer re-renders when context changes
- ❌ No way to opt out of re-renders
- ❌ Must use complex memoization to prevent cascading re-renders
- ❌ All or nothing - can't selectively subscribe

**Signals in Context benefits:**

- ✅ **Zero re-renders** until signal is actually accessed
- ✅ **Lazy tracking** - only subscribe to what you use
- ✅ **Fine-grained updates** - only `rx()` parts re-render
- ✅ **Conditional tracking** - access signal conditionally
- ✅ **No memoization needed** - automatically optimized

**Performance comparison:**

```tsx
// Traditional Context: N components re-render
<ThemeContext.Provider value={theme}>
  <Child1 />  {/* Re-renders */}
  <Child2 />  {/* Re-renders */}
  <Child3 />  {/* Re-renders */}
  <Child4 />  {/* Re-renders */}
</ThemeContext.Provider>

// Signal in Context: Only parts that use the signal re-render
<ThemeContext.Provider value={themeSignal}>
  <Child1 />  {/* No re-render if doesn't access signal */}
  <Child2 />  {/* No re-render if doesn't access signal */}
  <Child3 />  {/* Only rx(theme) part re-renders */}
  <Child4 />  {/* No re-render if doesn't access signal */}
</ThemeContext.Provider>
```

</details>

#### Real-World Example: User Session Store

For complex stores with multiple signals and methods, the new `provider()` API shines:

```tsx
import {
  signal,
  disposable,
  provider,
  rx,
  wait,
  loadable,
  Signal,
} from "rextive/react";

// Define your store shape
interface UserSession {
  user: Signal<User | null>;
  isAuthenticated: Signal<boolean>;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

type Credentials = { username: string; password: string };
type User = { id: number; name: string; email: string };

// Create provider with multiple signals and methods
export const [useSession, SessionProvider] = provider<UserSession, User | null>(
  {
    name: "Session",
    create: (initialUser) => {
      // Create signals
      const user = signal(initialUser);
      const isAuthenticated = user.to((u) => u !== null);

      // Add methods that modify the signals
      const login = async (credentials: Credentials) => {
        const userData = await api.login(credentials);
        user.set(userData);
      };

      const logout = () => {
        user.set(null);
        api.logout();
      };

      // Return the complete store
      return disposable({ user, isAuthenticated, login, logout });
    },
    update: (context, value) => {
      // Update user signal when value prop changes
      context.user.set(value);
    },
  }
);

// Consumer component - smart re-rendering
function UserProfile() {
  const { user, logout } = useSession();

  // ✅ Component only re-renders when user signal changes
  // Not when isAuthenticated or other signals change
  return rx(user, (userData) =>
    userData ? (
      <div>
        <h2>{userData.name}</h2>
        <button onClick={logout}>Logout</button>
      </div>
    ) : (
      <div>Not logged in</div>
    )
  );
}

// Another consumer - conditional tracking with rx()
function Sidebar(props: { showUserInfo: boolean }) {
  const { user, isAuthenticated } = useSession();

  // ✅ This component only re-renders when:
  // - props.showUserInfo changes, OR
  // - showUserInfo is true AND isAuthenticated changes (due to conditional access)

  return (
    <div>
      <nav>{/* Navigation items */}</nav>

      {rx(() => {
        if (!props.showUserInfo) return null;
        if (!isAuthenticated()) return null;
        return <div>Welcome, {user()?.name}</div>;
      })}
    </div>
  );
}

// Usage in app
function App() {
  return (
    <SessionProvider value={null}>
      <UserProfile />
      <Sidebar showUserInfo={true} />
    </SessionProvider>
  );
}
```

<details>
<summary>📖 <strong>Key Takeaways</strong></summary>

1. **Use the `provider()` utility** - Flexible API that supports any context shape (see `rextive/react`)

2. **Create rich context objects** - Combine multiple signals, computed values, and methods in one context

3. **Full control over updates** - The `update` function lets you decide how to sync with prop changes

4. **Use lazy tracking** - Access signals through `rx(() => ...)` for automatic optimization

5. **No manual optimization needed** - No `useMemo`, `useCallback`, or `React.memo` required

6. **Scales beautifully** - Add more signals to store without performance concerns

7. **Type-safe by default** - Full TypeScript inference for context shape and value prop

8. **Works with any React pattern** - Context, composition, render props, etc.

**This pattern turns signals into a full state management solution that's:**

- ⚡ Faster than Redux
- 🎯 More flexible than Zustand
- 🧠 Smarter than React Context
- ✨ Simpler than all of them

</details>

---

## 📋 API Cheatsheet

Quick reference for all Rextive APIs.

### Core - Signals

| API                              | Description                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `signal()`                       | Create empty signal with `undefined` initial value                           |
| `signal(value)`                  | Create mutable signal with initial value                                     |
| `signal(value, equals)`          | Create signal with equality strategy (`"strict"` \| `"shallow"` \| `"deep"`) |
| `signal(value, options)`         | Create signal with full options (name, equals, fallback, onChange, etc.)     |
| `signal(deps, compute)`          | Create computed signal with explicit dependencies                            |
| `signal(deps, compute, equals)`  | Computed signal with equality strategy                                       |
| `signal(deps, compute, options)` | Computed signal with full options                                            |
| `$`                              | Alias for `signal`                                                           |

### Signal Instance Methods

| Method              | Type     | Description                                                           |
| ------------------- | -------- | --------------------------------------------------------------------- |
| `signal()`          | All      | Read current value (shorthand for `.get()`)                           |
| `.set(value)`       | Mutable  | Set new value directly                                                |
| `.set(fn)`          | Mutable  | Update value with reducer function                                    |
| `.reset()`          | Mutable  | Reset to initial value                                                |
| `.on(listener)`     | All      | Subscribe to changes, returns unsubscribe function                    |
| `.to(fn)`           | All      | Derive new signal with transform (shorthand for `.pipe(select(...))`) |
| `.pipe(...ops)`     | All      | Chain operators for transformation                                    |
| `.map(fn)`          | All      | Alias for `.to()`                                                     |
| `.dispose()`        | All      | Clean up signal and subscriptions                                     |
| `.refresh()`        | Computed | Force immediate recomputation                                         |
| `.stale()`          | Computed | Mark as stale for lazy recomputation                                  |
| `.when(target, cb)` | All      | React when target signal changes                                      |

### Signal Namespace Methods

| API                            | Description                               |
| ------------------------------ | ----------------------------------------- |
| `signal.is(value)`             | Type guard: check if value is a Signal    |
| `signal.batch(fn)`             | Batch multiple updates, notify once       |
| `signal.tag(options?)`         | Create a tag to group/manage signals      |
| `persistor(options)`           | Create persistor (from `rextive/persist`) |
| `signal.on(signals, listener)` | Subscribe to multiple signals at once     |

---

### Async - `wait` Namespace

| API                                    | Description                                  |
| -------------------------------------- | -------------------------------------------- |
| `wait(awaitable)`                      | Wait for single/tuple/record (Suspense mode) |
| `wait(awaitable, onResolve)`           | Wait then transform (Promise mode)           |
| `wait(awaitable, onResolve, onReject)` | Wait with error handler                      |
| `wait.all(...)`                        | Alias for `wait()` - wait for all            |
| `wait.any(record)`                     | First to resolve → `[value, key]`            |
| `wait.race(record)`                    | First to settle → `[value, key]`             |
| `wait.settled(awaitables)`             | All settled, never throws                    |
| `wait.timeout(awaitable, ms)`          | With timeout (throws `TimeoutError`)         |
| `wait.delay(ms)`                       | Simple delay promise                         |

---

### Async - `loadable` Namespace

| API                         | Description                   |
| --------------------------- | ----------------------------- |
| `loadable(value)`           | Normalize value to Loadable   |
| `loadable.loading(promise)` | Create loading state          |
| `loadable.success(value)`   | Create success state          |
| `loadable.error(error)`     | Create error state            |
| `loadable.is(value)`        | Type guard: check if Loadable |

---

### React Hooks & Components

| API                          | Description                         |
| ---------------------------- | ----------------------------------- |
| `rx(signal)`                 | Render single signal value          |
| `rx(signal, prop)`           | Render signal property              |
| `rx(signal, selector)`       | Render transformed signal value     |
| `rx(fn)`                     | Reactive render with auto-tracking  |
| `rx.use(fn)`                 | Track signals in render function    |
| `useScope(lifecycles)`       | Track component lifecycle phases    |
| `useScope(factory)`          | Create component-scoped signals     |
| `useScope(factory, options)` | Scoped signals with watch/lifecycle |
| `provider(options)`          | Create `[useCtx, Provider]` tuple   |

---

### Operators (`rextive/op`)

| API                          | Description                             |
| ---------------------------- | --------------------------------------- |
| `select(fn, equals?)`        | Transform values (like `Array.map`)     |
| `filter(predicate, equals?)` | Filter values (like `Array.filter`)     |
| `scan(fn, initial, equals?)` | Accumulate values (like `Array.reduce`) |

---

### Utilities

| API                       | Description                           |
| ------------------------- | ------------------------------------- |
| `disposable(...items)`    | Combine disposables into one          |
| `compose(...fns)`         | Compose functions (right-to-left)     |
| `awaited(...selectors)`   | Transform async/sync values uniformly |
| `producer(factory)`       | Lazy factory for instance management  |
| `is(value)`               | Check if any Signal                   |
| `is(value, "mutable")`    | Check if MutableSignal                |
| `is(value, "computed")`   | Check if ComputedSignal               |
| `is(value, "observable")` | Check if has `.on()` method           |

---

### Cache (`rextive/cache`)

| API                                      | Description                      |
| ---------------------------------------- | -------------------------------- |
| `cache(name, factory)`                   | Create keyed data cache          |
| `cache(name, factoryMap)`                | Create cache group               |
| `staleOn({ after, idle, error })`        | Mark entries stale on conditions |
| `evictOn({ after, idle, error, stale })` | Remove entries on conditions     |
| `lru({ maxSize })`                       | Least recently used eviction     |
| `hydrate({ source })`                    | SSR hydration strategy           |
| `stableStringify(value)`                 | Deterministic JSON serialization |
| `ObjectKeyedMap`                         | Map with object key support      |

---

### Types (for TypeScript)

| Type                | Description                       |
| ------------------- | --------------------------------- |
| `Signal<T>`         | Base signal type                  |
| `MutableSignal<T>`  | Signal with `.set()`              |
| `ComputedSignal<T>` | Signal with `.refresh()/.stale()` |
| `AnySignal<T>`      | Union of Mutable \| Computed      |
| `Loadable<T>`       | Loading \| Success \| Error state |
| `Disposable`        | Object with `.dispose()`          |
| `Tag<T, K>`         | Signal grouping tag               |
| `Plugin<T, K>`      | Signal plugin function            |
| `Producer<T>`       | Lazy instance factory             |
| `Cache<T, K>`       | Keyed data cache                  |
| `CacheGroup<T>`     | Group of related caches           |
| `CacheStrategy<T>`  | Cache strategy plugin             |

---

### Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  SIGNAL CREATION                                            │
├─────────────────────────────────────────────────────────────┤
│  signal(0)                    → MutableSignal<number>       │
│  signal({ a, b }, fn)         → ComputedSignal<T>           │
│  signal<T>()                  → MutableSignal<T | undefined>│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  REACT RENDERING                                            │
├─────────────────────────────────────────────────────────────┤
│  rx(count)                    → Display signal value        │
│  rx(() => <div>{count()}</div>) → Auto-tracked render       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ASYNC HANDLING                                             │
├─────────────────────────────────────────────────────────────┤
│  wait(promise)                → Suspense mode               │
│  loadable(promise)            → Manual loading states       │
│  wait.any({ a, b })           → Race: first wins            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  LIFECYCLE                                                  │
├─────────────────────────────────────────────────────────────┤
│  useScope({ mount, dispose }) → Lifecycle tracking          │
│  useScope(() => disposable({ sig })) → Scoped signals       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Complete API Reference

### Core: `signal(value)` or `$(value)`

Create reactive state. Both `signal` and `$` are identical - use whichever you prefer.

#### Basic Usage

```tsx
import { signal } from "rextive";

// Simple value signal
const count = signal(0);
console.log(count()); // Read: 0
count.set(5); // Write: 5
count.set((x) => x + 1); // Update: 6
count.reset(); // Reset: 0

// Signal without initial value
const user = signal<User>();
console.log(user()); // undefined
user.set({ name: "Alice" }); // Must provide User (not undefined)

// Object/array with equality
const settings = signal({ theme: "dark" }, "shallow");
settings.set({ theme: "dark" }); // No update (content same)
settings.set({ theme: "light" }); // Updates (content changed)
```

#### Computed Signals (Derived State)

```tsx
import { select } from "rextive/op";

const count = signal(0);

// Transform with operator
const doubled = count.pipe(select((x) => x * 2));

// Multiple dependencies
const firstName = signal("John");
const lastName = signal("Doe");
const fullName = signal(
  { firstName, lastName },
  ({ deps }) => `${deps.firstName} ${deps.lastName}`
);
```

#### Async Signals

```tsx
// Simple async
const data = signal(async () => {
  const res = await fetch("/api/data");
  return res.json();
});

// With dependencies and cancellation
const userId = signal(1);
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal, // Auto-cancelled when userId changes
  });
  return res.json();
});
```

---

### Signal Instance Methods

Once you create a signal, it has these methods:

#### Reading: `signal()`

```tsx
const count = signal(5);
const value = count(); // Returns: 5
console.log(count()); // Prints: 5
```

#### Writing: `.set(value | updater)`

```tsx
count.set(10); // Direct value
count.set((x) => x + 1); // Updater function (receives current value)

// Updater is useful for ensuring correctness
count.set((current) => {
  return current < 100 ? current + 1 : current;
});
```

#### Reset: `.reset()`

```tsx
const count = signal(0);
count.set(42);
count.reset(); // Back to 0
```

#### Subscribe: `.on(callback)`

```tsx
const unsubscribe = count.on((newValue) => {
  console.log("Count changed to:", newValue);
});

count.set(5); // Logs: "Count changed to: 5"
unsubscribe(); // Stop listening
```

#### Transform: `.to(fn, equals?)`

The simplest way to transform a signal - shorthand for `.pipe(select(...))`:

```tsx
const count = signal(5);

// Transform value
const doubled = count.to((x) => x * 2);
const formatted = count.to((x) => `Count: ${x}`);

// With custom equality
const user = signal({ name: "Alice", age: 30 });
const userName = user.to((u) => u.name, "shallow");

console.log(doubled()); // 10
console.log(formatted()); // "Count: 5"
```

#### Advanced Transform: `.pipe(...operators)`

For chaining multiple transformations or using advanced operators:

```tsx
import { select, filter, scan } from "rextive/op";

const numbers = signal(1);

// Single transformation (prefer .to() for this)
const doubled = numbers.pipe(select((x) => x * 2));

// Chain multiple operators
const result = numbers.pipe(
  filter((x) => x > 0),
  select((x) => x * 2),
  scan((acc, x) => acc + x, 0)
);
```

#### Cleanup: `.dispose()`

```tsx
const count = signal(0);

// Use the signal...

count.dispose(); // Cleanup
// After dispose, any use throws an error
count(); // ❌ Error: signal disposed
count.set(1); // ❌ Error: signal disposed
```

#### Refresh: `.refresh()`

Force immediate recomputation for computed/async signals:

```tsx
const user = signal(async () => fetchUser());

// Force immediate re-fetch
user.refresh();

// Use case: After mutation
async function updateUser(data) {
  await api.updateUser(data);
  user.refresh(); // Reload immediately
}
```

**Behavior:**

- **Computed/async signals**: Triggers immediate recomputation
- **Mutable signals**: No-op (nothing to recompute)

#### Stale: `.stale()`

Mark signal as stale for lazy recomputation:

```tsx
const posts = signal(async () => fetchPosts());

// Mark as stale (doesn't fetch yet)
posts.stale();

// Later: access triggers recomputation
console.log(posts()); // Fetches now

// Use case: Batch invalidations
userData.stale();
userPosts.stale();
userComments.stale();
// None have recomputed yet - will fetch on first access
```

**Behavior:**

- **Computed/async signals**: Marks as stale, recomputes on next access
- **Mutable signals**: No-op (nothing to recompute)
- Multiple `stale()` calls = single recomputation on access

**`refresh()` vs `stale()`:**

- `refresh()` - Eager: recomputes immediately
- `stale()` - Lazy: recomputes on next access

#### React to Other Signals: `.when(target, callback)`

Create reactive relationships between signals - watch other signals and react when they change:

```tsx
const userId = signal(1);
const userData = signal(async () => fetchUser(userId()));

// Refresh userData when userId changes
userData.when(userId, (current) => {
  current.refresh();
});

// Or watch multiple signals
const filter = signal("");
const sortBy = signal("name");
const results = signal(async () => fetchResults());

results.when([filter, sortBy], (current) => {
  current.refresh();
});
```

**💡 Type-Safe Callbacks:**

The callback receives the **exact signal type** (not just the base `Signal`), giving you access to type-specific methods:

```tsx
// For MutableSignal: callback receives MutableSignal - can use .set()
const count = signal(0);
count.when(trigger, (current) => {
  current.set(100); // ✅ .set() available on MutableSignal
});

// For ComputedSignal: callback receives ComputedSignal - can use .refresh(), .stale()
const userData = signal(async () => fetchUser());
userData.when(userId, (current) => {
  current.refresh(); // ✅ .refresh() available on ComputedSignal
  current.stale(); // ✅ .stale() available on ComputedSignal
  // current.set() // ❌ Not available - ComputedSignal is read-only
});
```

**Key Patterns:**

```tsx
// Pattern 1: Cross-signal cache invalidation
const userCache = signal(async () => fetchUser());
const postsCache = signal(async () => fetchPosts());

userCache.when(userId, (current) => {
  current.stale(); // Lazy invalidation
});

// Pattern 2: Different actions for different triggers
const searchResults = signal(async () => fetchResults());

searchResults
  .when(searchTerm, (current) => {
    current.refresh(); // Immediate refresh for search
  })
  .when(sortPreference, (current) => {
    current.stale(); // Lazy for sort changes
  });

// Pattern 3: Coordinated updates with MutableSignal
const masterState = signal("idle");
const replica1 = signal("idle");
const replica2 = signal("idle");

replica1.when(masterState, (current, trigger) => {
  current.set(trigger()); // ✅ .set() available - current is MutableSignal
});

replica2.when(masterState, (current, trigger) => {
  current.set(trigger()); // ✅ .set() available
});

// Pattern 4: Detect which trigger fired
const log = signal<string[]>([]);

log.when([signal1, signal2], (current, trigger) => {
  const name = trigger.displayName || "unknown";
  current.set((prev) => [...prev, `Changed: ${name}`]); // ✅ Type-safe
});
```

**Behavior:**

- Returns the signal for method chaining
- Automatically unsubscribes when signal is disposed
- Callback receives `(currentSignal, triggerSignal)` with **exact types**
- Works with both mutable and computed signals
- Full TypeScript inference for signal-specific methods

**When to use:**

- ✅ Cache invalidation across multiple signals
- ✅ Coordinating state between signals
- ✅ Triggering side effects from other signals
- ✅ Building reactive workflows

---

### Signal Options

Pass options as the second or third argument:

```tsx
// Option 1: String shortcut for equals
const user = signal({ name: "John" }, "shallow");

// Option 2: Options object
const user = signal(
  { name: "John" },
  {
    name: "userSignal", // Debug name
    lazy: true, // Compute only when accessed (default: true)
    equals: "shallow", // Equality: 'strict' | 'shallow' | 'deep' | function
    fallback: (error) => ({}), // Fallback value on error
    onChange: (value) => {
      // Called on every change
      console.log("Changed:", value);
    },
    onError: (error) => {
      // Called on errors
      console.error("Error:", error);
    },
    use: [myTag, myPlugin], // Plugins and tags (unified `use` option)
  }
);

// Option 3: Computed signal with equality
const fullName = signal(
  { firstName, lastName },
  ({ deps }) => `${deps.firstName} ${deps.lastName}`,
  "shallow" // Equality as third argument
);
```

**Equality Options:**

| Option               | Description                      | Use For                    |
| -------------------- | -------------------------------- | -------------------------- |
| `"strict"` (default) | Reference equality (`Object.is`) | Primitives, references     |
| `"shallow"`          | Compare keys one level deep      | Simple objects/arrays      |
| `"deep"`             | Recursive comparison             | Nested objects/arrays      |
| Custom function      | `(a, b) => boolean`              | Custom logic (e.g., by ID) |

---

### Compute Function Context (`SignalContext`)

For computed and async signals, the compute function receives a **context object** with powerful lifecycle methods:

#### Properties

**`context.deps`** - Access dependency values (only available with dependencies):

```tsx
signal({ userId, filter }, ({ deps }) => {
  return `User ${deps.userId} with filter: ${deps.filter}`;
});
```

**`context.abortSignal`** - Auto-aborted when dependencies change or signal is disposed:

```tsx
signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal, // Canceled if userId changes
  });
  return res.json();
});
```

#### Methods

**`context.safe(fn | promise)`** - Execute safely with abort awareness:

```tsx
signal(async ({ safe, abortSignal }) => {
  const res = await fetch("/api/data", { signal: abortSignal });
  const json = await res.json();

  // Safely delay - never resolves if aborted
  await safe(wait.delay(300));

  // Safely run expensive operation - throws if aborted
  const processed = safe(() => expensiveProcessing(json));

  return processed;
});
```

**`context.onCleanup(fn)`** - Register cleanup functions:

```tsx
signal({ userId }, async ({ deps, onCleanup }) => {
  const ws = new WebSocket(`/ws/user/${deps.userId}`);

  onCleanup(() => {
    ws.close(); // Cleanup when recomputing or disposing
  });

  return new Promise((resolve) => {
    ws.onmessage = (e) => resolve(JSON.parse(e.data));
  });
});
```

**`context.use(logic, ...args)`** - Execute reusable logic with context:

```tsx
// Define reusable logic
const fetchUser = async (ctx, options) => {
  const res = await fetch(`/api/users/${ctx.deps.userId}`, {
    signal: ctx.abortSignal,
    ...options,
  });
  return res.json();
};

// Use it
const user = signal({ userId }, async (context) => {
  return await context.use(fetchUser, { cache: "no-cache" });
});
```

**`context.refresh()`** - Trigger recomputation from within (polling):

```tsx
const liveData = signal(async (context) => {
  const data = await fetchData();

  // Poll every second
  setTimeout(() => context.refresh(), 1000);

  return data;
});
```

**`context.stale()`** - Mark as stale for lazy recomputation (TTL cache):

```tsx
const cachedData = signal(async (context) => {
  const data = await fetchExpensiveData();

  // Mark stale after 5 minutes (won't refetch until accessed)
  setTimeout(() => context.stale(), 5 * 60 * 1000);

  return data;
});
```

**`context.aborted()`** - Check if computation was aborted:

```tsx
signal(async ({ aborted, abortSignal }) => {
  const res = await fetch("/api/data", { signal: abortSignal });

  if (aborted()) {
    return null; // Exit early if aborted
  }

  return res.json();
});
```

#### Complete Example

```tsx
const userData = signal({ userId }, async (context) => {
  const { deps, abortSignal, safe, onCleanup } = context;

  // Setup WebSocket with cleanup
  const ws = new WebSocket(`/ws/user/${deps.userId}`);
  onCleanup(() => ws.close());

  // Fetch initial data with abort support
  const res = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal,
  });
  const data = await res.json();

  // Safely process (throws if aborted)
  const processed = safe(() => processUserData(data));

  // Schedule next refresh
  setTimeout(() => context.refresh(), 60000);

  return processed;
});
```

---

### Static Methods

Methods available on the `signal` function itself:

#### `signal.batch(fn)`

Batch multiple signal updates into a single notification:

```tsx
import { signal } from "rextive";

const firstName = signal("John");
const lastName = signal("Doe");
const email = signal("john@example.com");

// Without batch: 3 separate notifications
firstName.set("Jane");
lastName.set("Smith");
email.set("jane@example.com");

// With batch: 1 notification
signal.batch(() => {
  firstName.set("Jane");
  lastName.set("Smith");
  email.set("jane@example.com");
});
```

See [Example 8: Batch Updates](#example-8-batch-updates-for-performance) for more details.

---

#### `signal.on(signals, callback)`

Subscribe to multiple signals and call callback when any changes. Unlike computed signals, this does NOT evaluate signals at the beginning (effect-like behavior):

```tsx
import { signal } from "rextive";

const count = signal(0);
const name = signal("Alice");
const enabled = signal(true);

// Subscribe to multiple signals
const control = signal.on([count, name, enabled], (trigger) => {
  console.log("Changed:", trigger());
});

count.set(1); // Logs: "Changed: 1"
name.set("Bob"); // Logs: "Changed: Bob"

// Pause/resume subscription
control.pause();
count.set(2); // No log (paused)

control.resume();
count.set(3); // Logs: "Changed: 3"

// Cleanup
control.dispose();
```

**Returns `SignalOnControl`:**

- `pause()` - Pause subscription (stop receiving updates)
- `resume()` - Resume subscription
- `paused()` - Check if currently paused
- `dispose()` - Cleanup permanently

**Use cases:**

- ✅ React to changes from multiple sources
- ✅ Debounced side effects
- ✅ Coordination between signals
- ✅ Pausable subscriptions

---

#### `persistor(options)` (from `rextive/persist`)

Create a persistor for automatic signal persistence:

```tsx
import { signal } from "rextive";
import { persistor } from "rextive/persist";

type Settings = { theme: string; fontSize: number };

const persist = persistor<Settings>({
  load: () => JSON.parse(localStorage.getItem("settings") || "{}"),
  save: (args) => {
    if (args.type === "merge") {
      const existing = JSON.parse(localStorage.getItem("settings") || "{}");
      localStorage.setItem(
        "settings",
        JSON.stringify({ ...existing, ...args.values })
      );
    } else {
      localStorage.setItem("settings", JSON.stringify(args.values));
    }
  },
  onError: (error, type) => console.error(`${type} error:`, error),
});

// Individual mode - type-safe keys
const theme = signal("dark", { use: [persist("theme")] });
const fontSize = signal(16, { use: [persist("fontSize")] });

// Group mode
const cleanup = signal.use({ theme, fontSize }, [persist]);
```

**Options:**

- `load()` - Load persisted values (memoized - called once)
- `save(args)` - Save values with `{ type: "merge" | "overwrite", values }`
- `onError(error, type)` - Handle load/save errors

**Features:**

- ✅ Type-safe keys from data shape
- ✅ Memoized load (called once for multiple signals)
- ✅ Merge mode (individual) vs Overwrite mode (group)
- ✅ Works as plugin or group plugin

See [Example 9: Persist to LocalStorage](#example-9-persist-to-localstorage) for more details.

---

#### `signal.tag()`

Create a tag to group related signals:

```tsx
const formTag = signal.tag();

// Create signals with the tag (use `use` option for both plugins and tags)
const name = signal("", { use: [formTag] });
const email = signal("", { use: [formTag] });
const message = signal("", { use: [formTag] });

// Operate on all tagged signals
formTag.forEach((s) => s.reset()); // Reset all
console.log(`Tag has ${formTag.size} signals`); // Count
```

**With signal kinds:**

```tsx
import { tag } from "rextive";
import type { Tag } from "rextive";

// Default: accepts both mutable and computed
const mixedTag = tag<number>();

// Mutable-only (semantic constraint)
const mutableTag: Tag<number, "mutable"> = tag<number, "mutable">();

// Computed-only (semantic constraint)
const computedTag: Tag<number, "computed"> = tag<number, "computed">();
```

See [Pattern 2: Group Signals with Tags](#pattern-2-group-signals-with-tags) for more details.

---

### Type Utilities

#### `AnySignal<T>`

Union type representing any signal (mutable or computed) - perfect for generic functions:

```tsx
import { signal, AnySignal } from "rextive";

// Generic function accepting any signal type
function watchSignal<T>(s: AnySignal<T>) {
  s.when(otherSignal, (current) => {
    console.log("Changed:", current());
    // current can be either MutableSignal or ComputedSignal
  });
}

const count = signal(0);
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

watchSignal(count); // ✅ Works
watchSignal(doubled); // ✅ Works
```

**Type narrowing for specific operations:**

```tsx
function doSomething<T>(s: AnySignal<T>) {
  // Common operations work on both types
  s.on(() => console.log("Changed"));
  s.when(trigger, (current) => current.refresh());

  // Type narrow for mutable-specific operations
  if ("set" in s) {
    s.set(newValue); // TypeScript knows this is MutableSignal
  }
}
```

**When to use:**

- ✅ Generic utilities that work with all signal types
- ✅ Signal registries/managers
- ✅ Array of mixed signals
- ✅ Functions that return different signal types

**Difference from `Signal<T>`:**

- `Signal<T>` - Base interface with minimal methods
- `AnySignal<T>` - Union of `MutableSignal<T> | ComputedSignal<T>` with full method access
- Use `AnySignal<T>` when you need access to `.when()`, `.refresh()`, etc.

See [Pattern 3: Generic Functions with AnySignal](#pattern-3-generic-functions-with-anysignal) for comprehensive examples.

---

### Utilities

#### `awaited(...selectors)`

Transform promise and non-promise values uniformly:

```tsx
import { signal, awaited } from "rextive";

// Async signal
const todoList = signal(async () => fetchTodos()); // Signal<Promise<Todo[]>>

// Transform with awaited
const titles = todoList.to(awaited((todos) => todos.map((t) => t.title)));
// titles() returns Promise<string[]>

// Chain multiple transformations
const summary = todoList.to(
  awaited(
    (todos) => todos.filter((t) => !t.done), // Filter
    (todos) => todos.map((t) => t.title), // Map
    (titles) => titles.join(", ") // Join
  )
);
// summary() returns Promise<string>

// Works with sync values too!
const syncTodos = signal([{ title: "Buy milk", done: false }]);
const syncTitles = syncTodos.to(awaited((todos) => todos.map((t) => t.title)));
// syncTitles() returns string[] (no promise!)
```

**Benefits:**

- ✅ Uniform API for sync and async values
- ✅ Type-safe with proper `Awaited<T>` inference
- ✅ Composable with other operators
- ✅ No need to check if value is a promise

---

#### `compose(...fns)`

Compose multiple functions into a single function. Functions are applied from **right to left** (like mathematical function composition):

```tsx
import { compose } from "rextive";

// Basic composition
const add1 = (x: number) => x + 1;
const multiply2 = (x: number) => x * 2;
const subtract3 = (x: number) => x - 3;

const composed = compose(subtract3, multiply2, add1);
// composed(5) = subtract3(multiply2(add1(5)))
//             = subtract3(multiply2(6))
//             = subtract3(12)
//             = 9

console.log(composed(5)); // 9
```

**Type transformations:**

```tsx
// compose preserves types through the chain
const toString = (x: number): string => x.toString();
const getLength = (s: string): number => s.length;
const isEven = (n: number): boolean => n % 2 === 0;

const pipeline = compose(isEven, getLength, toString);
// Type: (x: number) => boolean

console.log(pipeline(12345)); // false (length 5 is odd)
```

**Multiple arguments:**

The rightmost function can accept any number of arguments:

```tsx
const add = (a: number, b: number): number => a + b;
const double = (x: number): number => x * 2;
const format = (x: number): string => `Result: ${x}`;

const composed = compose(format, double, add);
// Type: (a: number, b: number) => string

console.log(composed(3, 4)); // "Result: 14"
```

**Rest parameters:**

```tsx
const max = (...nums: number[]): number => Math.max(...nums);
const double = (x: number): number => x * 2;

const composed = compose(double, max);
// Type: (...nums: number[]) => number

console.log(composed(1, 5, 3, 2)); // 10 (max is 5, doubled)
```

**Use cases:**

- ✅ Building data transformation pipelines
- ✅ Creating reusable function chains
- ✅ Point-free programming style
- ✅ Combining validators or formatters

**Note:** `compose` supports up to 11 functions with full type inference. For more functions, types fall back to `(...args: any[]) => R`.

---

#### `disposable(obj)`

Mark an object as disposable, adding a `dispose()` method that cleans up all disposable properties:

```tsx
import { signal, disposable } from "rextive";

// Create multiple signals
const count = signal(0);
const name = signal("");
const derived = count.to((x) => x * 2);

// Mark as disposable - adds dispose() method
const scope = disposable({ count, name, derived });

// Later: dispose all signals at once
scope.dispose(); // Calls count.dispose(), name.dispose(), derived.dispose()
```

**With useScope:**

```tsx
import { useScope, disposable } from "rextive/react";

function Component() {
  const scope = useScope(() => {
    const todos = signal([]);
    const filter = signal("all");
    const filtered = signal({ todos, filter }, ({ deps }) => {
      return deps.filter === "all"
        ? deps.todos
        : deps.todos.filter((t) => t.status === deps.filter);
    });

    // disposable() enables auto-cleanup on unmount
    return disposable({ todos, filter, filtered });
  });

  // When component unmounts, all signals are automatically disposed
}
```

**How it works:**

```tsx
const obj = disposable({
  signal1,
  signal2,
  normalValue: 42, // Non-disposable values are fine
  method: () => {}, // Functions are fine
});

// obj.dispose() will:
// 1. Call signal1.dispose() if it has dispose method
// 2. Call signal2.dispose() if it has dispose method
// 3. Skip normalValue (no dispose method)
// 4. Skip method (not disposable)
```

**Manual dispose array:**

```tsx
// Explicitly specify what to dispose
const obj = {
  signal1,
  signal2,
  value: 42,
  dispose: [signal1, signal2], // Only dispose these
};
```

**Benefits:**

- ✅ **Automatic cleanup** - All signals disposed together
- ✅ **Type-safe** - Returns same type with added `dispose()`
- ✅ **Flexible** - Works with any object shape
- ✅ **React integration** - Works with `useScope` for auto-cleanup

---

#### `producer(factory)`

Creates a lazy factory that produces and manages a single instance at a time. Perfect for managing resources like AbortControllers, WebSocket connections, or any disposable objects.

```tsx
import { producer } from "rextive";

// Create a producer for AbortControllers
const abortProducer = producer(() => new AbortController());

// Get or create current instance (lazy initialization)
const controller = abortProducer.current();
fetch("/api/data", { signal: controller.signal });

// Create new instance (disposes previous if it has .dispose())
const newController = abortProducer.next();

// Check if instance exists without creating
if (abortProducer.has()) {
  const existing = abortProducer.peek(); // Get without creating
}

// Cleanup when done
abortProducer.dispose(); // Disposes current instance, sets to undefined
```

**With disposable resources:**

```tsx
class Connection implements Disposable {
  constructor(public url: string) {
    console.log("Connected to", url);
  }
  dispose() {
    console.log("Disconnected from", this.url);
  }
}

const connProducer = producer(() => new Connection("ws://localhost"));

connProducer.current(); // "Connected to ws://localhost"
connProducer.next(); // "Disconnected...", then "Connected to ws://localhost"
connProducer.dispose(); // "Disconnected..."
```

**Real-world example: Request cancellation in computed signals:**

```tsx
const searchTerm = signal("");

// Fresh AbortController for each computation
const manualController = producer(() => new AbortController());

const searchResults = signal({ searchTerm }, async ({ deps, abortSignal }) => {
  if (!deps.searchTerm) return [];

  // Get fresh controller for this computation
  const controller = manualController.next();

  const combinedSignal = AbortSignal.any([
    abortSignal, // Auto: when searchTerm changes
    controller.signal, // Manual: cancel via manualController.current().abort()
    AbortSignal.timeout(10000), // Timeout: after 10 seconds
  ]);

  const res = await fetch(`/search?q=${deps.searchTerm}`, {
    signal: combinedSignal,
  });
  return res.json();
});

// Cancel current search manually
manualController.current().abort();
// Next computation gets a fresh AbortController automatically
```

**Methods:**

| Method      | Description                                         |
| ----------- | --------------------------------------------------- |
| `current()` | Get current instance, create if none exists (lazy)  |
| `next()`    | Dispose current (if any), create and return new one |
| `dispose()` | Dispose current (if any), set to undefined          |
| `has()`     | Check if instance exists without creating           |
| `peek()`    | Get current instance or undefined without creating  |

**Benefits:**

- ✅ **Lazy initialization** - Factory only called when needed
- ✅ **Automatic disposal** - Uses `tryDispose()` for cleanup
- ✅ **Fresh instances** - `next()` creates new instance each time
- ✅ **Resource management** - Perfect for AbortControllers, connections, etc.

---

## React Integration

Import from `rextive/react` for React-specific features:

```tsx
import { signal, rx, useScope, wait, loadable } from "rextive/react";
```

### `rx()` - Reactive Rendering

Render reactive values in React with automatic signal tracking. Three overloads:

#### Overload 1: Single signal - `rx(signal)`

Renders the signal's value directly:

```tsx
const count = signal(0);
const name = signal("Alice");

<div>{rx(count)}</div>     // Renders: 0
<div>{rx(name)}</div>      // Renders: Alice

// Async signals throw for Suspense
const user = signal(async () => fetchUser());
<Suspense fallback={<Spinner />}>
  <div>{rx(user)}</div>    // Renders user object after loading
</Suspense>
```

#### Overload 2: Signal with selector - `rx(signal, selector)`

Extracts a property or transforms the value:

```tsx
const user = signal({ name: "Alice", age: 30 });

// Property key selector
<div>{rx(user, "name")}</div>                    // Renders: Alice

// Function selector
<div>{rx(user, u => u.name.toUpperCase())}</div> // Renders: ALICE
<div>{rx(user, u => `${u.name} (${u.age})`)}</div> // Renders: Alice (30)

// Async signals - selector receives resolved value
const asyncUser = signal(async () => fetchUser());
<div>{rx(asyncUser, "name")}</div>  // Suspense, then renders name
```

#### Overload 3: Reactive function - `rx(fn)`

Runs a function with automatic signal tracking:

```tsx
const firstName = signal("John");
const lastName = signal("Doe");

// Auto-tracks all signal() calls inside the function
{
  rx(() => (
    <span>
      {firstName()} {lastName()}
    </span>
  ));
}

// Use wait() for async signals (throws for Suspense)
const user = signal(async () => fetchUser());
{
  rx(() => {
    const userData = wait(user());
    return <div>{userData.name}</div>;
  });
}

// Use loadable() for manual loading states
{
  rx(() => {
    const state = loadable(user);
    if (state.loading) return <Spinner />;
    if (state.error) return <Error error={state.error} />;
    return <div>{state.value.name}</div>;
  });
}

// Conditional tracking - only subscribes to signals accessed
const showDetails = signal(false);
const details = signal({ bio: "..." });
{
  rx(() => (showDetails() ? details().bio : "Hidden"));
}
// ↑ Only subscribes to 'details' when showDetails() is true
```

<details>
<summary>⚠️ <strong>Common Mistake: Don't use rx() in attributes!</strong></summary>

```tsx
// ❌ WRONG - Not reactive, renders once
<input value={rx(signal)} />
<div className={rx(theme)} />

// ✅ CORRECT - Use rx() with a function:
{rx(() => <input value={signal()} />)}
{rx(() => <div className={theme()} />)}
```

**Why?** `rx()` returns a React component. When used in attributes, it's evaluated once and won't update reactively. You must render the entire element with `rx()` or use hooks.

</details>

---

### `useScope()` - Component-Scoped State & Lifecycle

A powerful hook with three modes for different use cases:

#### Mode 1: Factory - Create Component-Scoped Signals

```tsx
import { signal, disposable, useScope } from "rextive/react";
import { select } from "rextive/op";

function TodoList() {
  // Factory function runs once on mount
  const scope = useScope(() => {
    const todos = signal([]);
    const filter = signal("all");
    const filteredTodos = signal({ todos, filter }, ({ deps }) => {
      return deps.filter === "all"
        ? deps.todos
        : deps.todos.filter((t) => t.status === deps.filter);
    });

    // disposable() adds dispose property for auto-cleanup
    return disposable({ todos, filter, filteredTodos });
  });

  // scope.todos, scope.filter, etc. are disposed on unmount
  return <div>...</div>;
}
```

**With watch option - recreate when dependencies change:**

```tsx
function UserProfile({ userId }) {
  const scope = useScope(
    () => {
      const user = signal({ userId: signal(userId) }, async ({ deps }) => {
        return fetchUser(deps.userId);
      });
      return disposable({ user });
    },
    { watch: [userId] } // Recreate scope when userId changes
  );

  // When userId changes:
  // 1. Old scope is disposed
  // 2. Factory runs again with new userId
  // 3. New scope is created
}
```

---

#### Mode 2: Component Lifecycle - Track Lifecycle Phases

```tsx
import { useScope } from "rextive/react";

function Component() {
  const getPhase = useScope({
    init: () => {
      console.log("1. INIT - Before first render");
      // Perfect for: Creating services, initial setup
    },

    mount: () => {
      console.log("2. MOUNT - After first paint");
      // Perfect for: DOM measurements, start animations
    },

    render: () => {
      console.log("3. RENDER - Every render");
      // Perfect for: Performance tracking, debug logging
    },

    cleanup: () => {
      console.log("4. CLEANUP - React cleanup (runs 2-3x in StrictMode)");
      // Perfect for: Pausing, not for final cleanup!
    },

    dispose: () => {
      console.log("5. DISPOSE - True unmount (exactly once)");
      // Perfect for: Final cleanup, close connections
    },
  });

  // Get current phase
  const phase = getPhase(); // "init" | "mount" | "render" | "cleanup" | "disposed"

  return <div>Current phase: {phase}</div>;
}
```

---

#### Mode 3: Object Lifecycle - Track Object Changes

```tsx
function UserAnalytics({ user }) {
  const getPhase = useScope({
    for: user, // Track this object's reference

    init: (user) => {
      console.log("User session started:", user.id);
      analytics.track("session-start", user);
    },

    mount: (user) => {
      // Start tracking user activity
      tracker.start(user.id);
    },

    render: (user) => {
      // Log each render with this user
      console.log("Rendering with user:", user.name);
    },

    cleanup: (user) => {
      // Pause tracking (may be called in StrictMode)
      tracker.pause(user.id);
    },

    dispose: (user) => {
      // End session (called exactly once)
      tracker.stop(user.id);
      analytics.track("session-end", { userId: user.id, duration });
    },
  });

  return <div>Tracking: {user.name}</div>;
}

// When user prop changes from userA to userB:
// 1. cleanup(userA) - pause tracking for A
// 2. dispose(userA) - end session for A
// 3. init(userB) - start session for B
// 4. mount(userB) - start tracking for B
```

<details>
<summary>📖 <strong>When to Use Each Mode</strong></summary>

| Mode          | Use When                      | Example                           |
| ------------- | ----------------------------- | --------------------------------- |
| **Factory**   | Need component-scoped signals | Form state, local async data      |
| **Lifecycle** | Track component lifecycle     | Analytics, performance monitoring |
| **Object**    | Track prop object changes     | User sessions, entity tracking    |

</details>

---

### `rx.use()` - Reactive Rendering Hook

Low-level hook for automatic signal tracking. Usually you'll use `rx()` instead, but `rx.use()` is available for advanced use cases:

```tsx
import { rx } from "rextive/react";

function Component() {
  // Automatically tracks any signals accessed inside the function
  const value = rx.use(() => {
    const userData = wait(user()); // Tracks 'user' signal
    const postList = wait(posts()); // Tracks 'posts' signal
    return { userData, postList };
  });

  return (
    <div>
      <h1>{value.userData.name}</h1>
      <p>Posts: {value.postList.length}</p>
    </div>
  );
}
```

**Key features:**

- **Automatic tracking** - Any `signal()` calls inside the function are tracked
- **Lazy tracking** - Only signals actually accessed are subscribed to
- **Conditional tracking** - Signals in conditional branches are only tracked when executed

**⚠️ Important caveat:** Signal calls OUTSIDE `rx.use()` or `rx()` are NOT tracked:

```tsx
function Component() {
  // ❌ NOT tracked - signal accessed outside reactive context
  const value = count();

  // ✅ Tracked - signal accessed inside rx()
  return rx(() => <div>{count()}</div>);
}
```

---

### `provider()` - Signal Context

Create signal-based React Context with optimized rendering:

```tsx
import { provider, signal } from "rextive/react";

// Define context shape and create provider
const [useTheme, ThemeProvider] = provider({
  name: "Theme", // For debugging
  create: (initialValue: "dark" | "light") => {
    // Factory: receives prop value, returns signal or object with signals
    return signal(initialValue);
  },
});

// Usage in app
function App() {
  return (
    <ThemeProvider value="dark">
      <ChildComponent />
    </ThemeProvider>
  );
}

// Access in child components
function ChildComponent() {
  const theme = useTheme();
  return <div>Theme: {rx(theme)}</div>;
}
```

**With complex state:**

```tsx
interface UserSession {
  user: Signal<User | null>;
  isAuthenticated: Signal<boolean>;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const [useSession, SessionProvider] = provider<UserSession, User | null>({
  name: "Session",
  create: (initialUser) => {
    const user = signal(initialUser);
    const isAuthenticated = user.to((u) => u !== null);

    const login = async (credentials: Credentials) => {
      const userData = await api.login(credentials);
      user.set(userData);
    };

    const logout = () => {
      user.set(null);
    };

    return disposable({ user, isAuthenticated, login, logout });
  },
  update: (context, newUser) => {
    // Optional: sync context when value prop changes
    context.user.set(newUser);
  },
});
```

**Options:**

```tsx
provider<TContext, TValue>({
  name: string;                              // Debug name
  create: (value: TValue) => TContext;       // Factory function
  update?: (context: TContext, value: TValue) => void;  // Optional: update handler
})
```

**Returns:** `[useContext, Provider]`

- `useContext()` - Hook to access context in child components
- `Provider` - React component with `value` prop

**Benefits:**

- ✅ **Lazy tracking** - Only subscribes to signals actually accessed
- ✅ **Fine-grained updates** - Only `rx()` parts re-render
- ✅ **Type-safe** - Full TypeScript inference
- ✅ **Flexible** - Return any shape (signal, object, methods)
- ✅ **Auto-cleanup** - Context disposed when provider unmounts

---

### `wait()` - Promise Utilities

Utilities for working with promises and async signals.

**Two Overload Modes:**

- **Without callback** → Suspense-style: throws if pending/rejected, returns resolved value synchronously
- **With callback** → Promise-style: returns a `Promise` that resolves with the callback result

#### Without callback (Suspense-style)

Throws a promise if pending, throws error if rejected. Use inside React components with Suspense boundaries:

```tsx
import { wait } from "rextive";

const user = signal(async () => fetchUser());
const posts = signal(async () => fetchPosts());

// Single signal - throws if not resolved
const userData = wait(user);
console.log(userData.name);

// Multiple signals - throws if any not resolved
const [userData, postsData] = wait([user, posts]);
console.log(userData.name, postsData.length);

// Record of signals
const { user: userData, posts: postsData } = wait({ user, posts });
```

#### With callback (Promise-style)

Returns a `Promise` that resolves with the callback result. Use in async functions:

```tsx
import { wait } from "rextive";

const user = signal(async () => fetchUser());
const posts = signal(async () => fetchPosts());

// Single signal
const name = await wait(user, (userData) => userData.name);

// Multiple signals
await wait([user, posts], (userData, postsData) => {
  console.log(userData.name, postsData.length);
});

// With error handling (third argument)
const result = await wait(
  [user, posts],
  (userData, postsData) => ({ userData, postsData }), // Success callback
  (error) => ({ userData: null, postsData: [] }) // Error callback
);
```

#### Advanced: Race and any

```tsx
// wait.any - First successful resolution
const first = await wait.any({ user, posts, comments }, ([value, key]) => {
  console.log(`${key} resolved first:`, value);
  return value;
});

// wait.race - First to settle (success or error)
const fastest = await wait.race({ user, posts, comments }, ([value, key]) => {
  console.log(`${key} settled first`);
  return value;
});
```

#### Advanced: All settled

```tsx
// wait.settled - Never rejects, returns PromiseSettledResult
const results = await wait.settled([user, posts, comments], (settled) => {
  // settled is array of:
  // { status: "fulfilled", value: T } | { status: "rejected", reason: Error }

  const successful = settled
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  const failed = settled
    .filter((r) => r.status === "rejected")
    .map((r) => r.reason);

  return { successful, failed };
});
```

#### Utilities: Timeout and delay

```tsx
// Timeout
try {
  const data = await wait.timeout(slowSignal, 5000, "Request timed out");
} catch (error) {
  console.error(error.message); // "Request timed out"
}

// Delay (sleep)
await wait.delay(1000); // Wait 1 second
console.log("1 second passed");
```

---

## 🔧 Operators (`rextive/op`)

Operators are composable, reusable functions for transforming signals. They work like array methods but for reactive values.

**Import from `rextive/op`:**

```tsx
import { select, filter, scan } from "rextive/op";
```

---

### `select()` - Transform Values

Like `Array.map()` but for signals - transforms each value:

```tsx
import { signal } from "rextive";
import { select } from "rextive/op";

const count = signal(5);

// Basic transformation
const doubled = count.pipe(select((x) => x * 2));
console.log(doubled()); // 10

count.set(10);
console.log(doubled()); // 20 (automatically updated!)

// Transform objects
const user = signal({ firstName: "John", lastName: "Doe" });
const fullName = user.pipe(select((u) => `${u.firstName} ${u.lastName}`));
console.log(fullName()); // "John Doe"

// With equality check (for objects/arrays)
const userName = user.pipe(select((u) => ({ name: u.firstName }), "shallow"));
// No update if result content is the same
```

<details>
<summary>📖 <strong>Advanced Usage</strong></summary>

```tsx
// Async transformation
const userId = signal(1);
const user = userId.pipe(
  select(async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  })
);

// With full options
const formatted = count.pipe(
  select((x) => `Count: ${x}`, {
    equals: "strict",
    name: "formattedCount",
    lazy: true,
  })
);

// Chain multiple selects
const result = count.pipe(
  select((x) => x * 2), // Double
  select((x) => x + 1), // Add 1
  select((x) => `Result: ${x}`) // Format
);
```

</details>

**Signature:**

```tsx
select<T, U>(
  fn: (value: T) => U,
  equals?: EqualityOption
): (signal: Signal<T>) => Signal<U>
```

**Parameters:**

- `fn` - Transformation function
- `equals?` - Equality: `"strict"` | `"shallow"` | `"deep"` | custom function | options object

---

### `filter()` - Filter Values

Like `Array.filter()` but for signals - only emit values that pass a test:

```tsx
import { signal } from "rextive";
import { filter } from "rextive/op";

const count = signal(1);

// Only positive numbers
const positiveOnly = count.pipe(filter((x) => x > 0));

console.log(positiveOnly()); // 1 (initial value, always emitted)

count.set(5);
console.log(positiveOnly()); // 5 (passed filter)

count.set(-3);
console.log(positiveOnly()); // 5 (filtered out, keeps previous value)

count.set(10);
console.log(positiveOnly()); // 10 (passed filter)
```

**Important:** The first value is always emitted, even if it doesn't pass the filter.

<details>
<summary>📖 <strong>Advanced Usage</strong></summary>

```tsx
// Type narrowing with type guard
const value = signal<string | number>(1);
const numbersOnly = value.pipe(
  filter((x): x is number => typeof x === "number")
);
// Type: Signal<number> (narrowed!)

value.set(42);
console.log(numbersOnly()); // 42

value.set("hello");
console.log(numbersOnly()); // 42 (filtered out, string not emitted)

// Filter objects
interface User {
  name: string;
  age: number;
  active: boolean;
}

const user = signal<User>({ name: "Alice", age: 30, active: true });
const activeUser = user.pipe(filter((u) => u.active, "shallow"));

// Complex conditions
const count = signal(0);
const validCount = count.pipe(
  filter((x) => x >= 0 && x <= 100) // Only 0-100
);

// Combining with select
const result = count.pipe(
  filter((x) => x > 0), // Only positive
  select((x) => x * 2) // Then double
);
```

</details>

**Signature:**

```tsx
filter<T>(
  predicate: (value: T) => boolean,
  equals?: EqualityOption
): (signal: Signal<T>) => Signal<T>
```

**Parameters:**

- `predicate` - Test function, returns `true` to emit value
- `equals?` - Equality: `"strict"` | `"shallow"` | `"deep"` | custom function

---

### `scan()` - Accumulate Values

Like `Array.reduce()` but for signals - maintains accumulated state:

```tsx
import { signal } from "rextive";
import { scan } from "rextive/op";

const count = signal(1);

// Running total
const total = count.pipe(scan((acc, curr) => acc + curr, 0));

console.log(total()); // 1 (0 + 1)

count.set(2);
console.log(total()); // 3 (1 + 2)

count.set(3);
console.log(total()); // 6 (3 + 3)

count.set(-10);
console.log(total()); // -4 (6 + -10)
```

<details>
<summary>📖 <strong>Advanced Usage</strong></summary>

```tsx
// Keep history of all values
const numbers = signal(1);
const history = numbers.pipe(
  scan((acc, curr) => [...acc, curr], [] as number[])
);

numbers.set(2);
numbers.set(3);
console.log(history()); // [1, 2, 3]

// Build statistics
const stats = numbers.pipe(
  scan(
    (acc, curr) => ({
      sum: acc.sum + curr,
      count: acc.count + 1,
      avg: (acc.sum + curr) / (acc.count + 1),
      min: Math.min(acc.min, curr),
      max: Math.max(acc.max, curr),
    }),
    { sum: 0, count: 0, avg: 0, min: Infinity, max: -Infinity },
    "shallow" // Use shallow equality
  )
);

numbers.set(5);
numbers.set(10);
console.log(stats());
// { sum: 16, count: 3, avg: 5.33, min: 1, max: 10 }

// Undo/redo system
const action = signal<Action>();
const history = action.pipe(
  scan(
    (acc, action) => ({
      past: [...acc.past, acc.present],
      present: action,
      future: [],
    }),
    { past: [], present: null, future: [] }
  )
);

// Sliding window (keep last N values)
const lastThree = numbers.pipe(
  scan((acc, curr) => {
    const next = [...acc, curr];
    return next.length > 3 ? next.slice(1) : next;
  }, [] as number[])
);
```

</details>

**Signature:**

```tsx
scan<T, U>(
  fn: (accumulator: U, current: T) => U,
  initialValue: U,
  equals?: EqualityOption
): (signal: Signal<T>) => Signal<U>
```

**Parameters:**

- `fn` - Accumulator function `(acc, current) => newAcc`
- `initialValue` - Starting value for the accumulator
- `equals?` - Equality: `"strict"` | `"shallow"` | `"deep"` | custom function

---

### Composing Operators

Chain multiple operators for powerful transformations:

```tsx
import { signal } from "rextive";
import { select, filter, scan } from "rextive/op";

const count = signal(1);

// Chain operators left-to-right
const result = count.pipe(
  filter((x) => x > 0), // Step 1: Only positive
  select((x) => x * 2), // Step 2: Double it
  scan((acc, x) => acc + x, 0) // Step 3: Running sum
);

console.log(result()); // 2 (0 + 1*2)
count.set(5);
console.log(result()); // 12 (2 + 5*2)
count.set(-3);
console.log(result()); // 12 (filtered out, unchanged)
count.set(2);
console.log(result()); // 16 (12 + 2*2)
```

#### Create Reusable Operator Pipelines

```tsx
// Define reusable operators
const positiveOnly = filter((x: number) => x > 0);
const double = select((x: number) => x * 2);
const runningSum = scan((acc: number, x: number) => acc + x, 0);

// Apply to different signals
const signal1 = signal(5);
const signal2 = signal(10);

const result1 = signal1.pipe(positiveOnly, double, runningSum);
const result2 = signal2.pipe(positiveOnly, double, runningSum);

// Or create a pipeline factory
function createPositiveDoubleSum(source: Signal<number>) {
  return source.pipe(positiveOnly, double, runningSum);
}

const result3 = createPositiveDoubleSum(signal(15));
```

**Benefits:**

- ✅ **Composable** - Build complex logic from simple pieces
- ✅ **Reusable** - Define once, use everywhere
- ✅ **Type-safe** - Full TypeScript inference
- ✅ **Readable** - Linear, easy-to-follow flow
- ✅ **Auto-cleanup** - All intermediate signals disposed together

---

## 🔧 Immer Integration (`rextive/immer`)

Rextive provides built-in Immer integration for immutable updates with a mutable API.

**Installation:**

```bash
npm install immer
```

### `produce()`

Create immutable updates using Immer's "mutating" API:

```tsx
import { signal } from "rextive";
import { produce } from "rextive/immer";

const state = signal({ count: 0, user: { name: "John" } });

// Update using produce - write "mutations" that are actually immutable
state.set(
  produce((draft) => {
    draft.count++;
    draft.user.name = "Jane";
  })
);
```

**With arrays:**

```tsx
const todos = signal([
  { id: 1, text: "Learn React", done: false },
  { id: 2, text: "Learn Immer", done: false },
]);

// Toggle first todo
todos.set(
  produce((draft) => {
    draft[0].done = !draft[0].done;
  })
);

// Add new todo
todos.set(
  produce((draft) => {
    draft.push({ id: 3, text: "Build app", done: false });
  })
);

// Remove todo
todos.set(
  produce((draft) => {
    draft.splice(0, 1);
  })
);
```

**Complex nested updates:**

```tsx
const app = signal({
  user: { name: "John", settings: { theme: "dark", lang: "en" } },
  posts: [],
  ui: { sidebar: true, modal: null },
});

app.set(
  produce((draft) => {
    // Update nested properties
    draft.user.settings.theme = "light";
    draft.user.settings.lang = "fr";

    // Add to arrays
    draft.posts.push({ id: 1, title: "Hello" });

    // Update UI state
    draft.ui.sidebar = false;
    draft.ui.modal = { type: "confirm", message: "Save changes?" };
  })
);
```

**Why use Immer with signals?**

- ✅ **Simpler updates** - No spread operators or deep cloning
- ✅ **Fewer bugs** - Hard to accidentally mutate
- ✅ **More readable** - Clear intent in complex updates
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Works with equality** - Pair with `"shallow"` or `"deep"` equality

**Example: Todo list with Immer**

```tsx
import { signal } from "rextive";
import { produce } from "rextive/immer";

const todos = signal(
  [
    { id: 1, text: "Learn Rextive", done: false },
    { id: 2, text: "Build app", done: false },
  ],
  "shallow" // Use shallow equality with Immer
);

// Add todo
const addTodo = (text: string) => {
  todos.set(
    produce((draft) => {
      draft.push({ id: Date.now(), text, done: false });
    })
  );
};

// Toggle todo
const toggleTodo = (id: number) => {
  todos.set(
    produce((draft) => {
      const todo = draft.find((t) => t.id === id);
      if (todo) todo.done = !todo.done;
    })
  );
};

// Delete todo
const deleteTodo = (id: number) => {
  todos.set(
    produce((draft) => {
      const index = draft.findIndex((t) => t.id === id);
      if (index !== -1) draft.splice(index, 1);
    })
  );
};
```

---

## 🗄️ Data Caching (`rextive/cache`)

A powerful keyed data cache with reference counting, lifecycle management, and pluggable strategies.

**Import from `rextive/cache`:**

```tsx
import { cache, staleOn, evictOn, lru, hydrate } from "rextive/cache";
```

### Basic Usage

```tsx
import { cache } from "rextive/cache";

// Create a cache with a factory function
const getUser = cache("users", async (userId: string) => {
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
});

// Access cached data (creates entry if not exists)
const { value, unref } = getUser("123");
const user = await value;
console.log(user.name);

// Release reference when done (important for cleanup strategies)
unref();

// Other cache methods
getUser.stale("123"); // Mark entry as stale (lazy re-fetch on next access)
getUser.refresh("123"); // Force immediate re-fetch
getUser.delete("123"); // Remove from cache
getUser.clear(); // Clear all entries
getUser.peek("123"); // Get value without creating entry
getUser.has("123"); // Check if key exists
```

### Strategies

Strategies extend cache behavior with pluggable lifecycle hooks:

#### `staleOn` - Mark Entries Stale

Mark entries as stale based on conditions (OR'd together). Stale entries return cached data immediately but trigger a background re-fetch:

```tsx
import { cache, staleOn } from "rextive/cache";

const getUser = cache("users", fetchUser, {
  use: [
    staleOn({ after: 30000 }), // Mark stale after 30 seconds
  ],
});

// First access: fetches from server
// After 30s: returns cached data immediately, triggers background refresh
```

**Conditions:**

- `after` - Mark stale after X ms from creation
- `idle` - Mark stale after X ms of being unused (refCount=0)
- `error` - Mark errors as stale (enables retry on next access)

```tsx
// Mark errors as stale - enables automatic retry
staleOn({ error: true });

// Combined: stale after 30s OR on error
staleOn({ after: 30000, error: true });
```

#### `evictOn` - Remove Entries

Remove entries based on conditions (OR'd together):

```tsx
import { cache, evictOn } from "rextive/cache";

const getUser = cache("users", fetchUser, {
  use: [
    evictOn({
      after: 300000, // Remove after 5 minutes (hard expiration)
      idle: 60000, // Remove if unused for 1 minute (refCount=0)
    }),
  ],
});
```

**Conditions:**

- `after` - Remove after X ms from creation
- `idle` - Remove after X ms of being unused (refCount=0). Set to 0 for immediate removal.
- `error` - Remove errors immediately
- `stale` - Remove when entry is marked stale

```tsx
// Remove immediately when no longer used
evictOn({ idle: 0 });

// Remove errors immediately
evictOn({ error: true });

// Combined: remove if idle for 1 min OR has error
evictOn({ idle: 60000, error: true });
```

#### `lru` - Least Recently Used

```tsx
import { cache, lru } from "rextive/cache";

const getUser = cache("users", fetchUser, {
  use: [
    lru({ maxSize: 100 }), // Keep max 100 entries
  ],
});

// When cache exceeds 100 entries:
// 1. Entries with refCount=0 are evicted first
// 2. Then oldest accessed entries are evicted
```

#### `hydrate` - SSR Hydration

```tsx
import { cache, hydrate } from "rextive/cache";

const getUser = cache("users", fetchUser, {
  use: [
    hydrate({
      source: () => window.__CACHE_STATE__?.users, // Load from SSR state
      stale: true, // Mark hydrated data as stale (re-validate after hydration)
    }),
  ],
});

// On page load: cache is pre-populated from window.__CACHE_STATE__
// If stale: true, accessing hydrated data triggers background refresh
```

### Cache Groups

Manage multiple related caches with shared options:

```tsx
import { cache, staleOn, evictOn } from "rextive/cache";

const api = cache(
  "api",
  {
    users: async (id: string) => fetchUser(id),
    posts: async (userId: string) => fetchPosts(userId),
    comments: async (postId: string) => fetchComments(postId),
  },
  {
    use: [staleOn({ after: 30000 }), evictOn({ after: 300000 })],
  }
);

// Access individual caches
const { value: user } = api.users("123");
const { value: posts } = api.posts("123");

// Bulk operations
api.staleAll(); // Mark all entries in all caches as stale
api.clearAll(); // Clear all caches
await api.refreshAll(); // Refresh all entries

// Extract for SSR
const state = api.extract();
// { users: { "123": {...} }, posts: { "123": [...] } }
```

### Shared Fetched Data with Auto-Cleanup

Use cache with signals to share fetched data across components with automatic cleanup when no components are using it:

```tsx
import { cache, staleOn, evictOn } from "rextive/cache";
import { signal } from "rextive";
import { rx, useScope } from "rextive/react";
import { Suspense } from "react";

// Create a cache for fetching todo list
// Data is shared across all components that access the same key
const fetchTodoList = cache(
  "fetchTodoList",
  async () => {
    const res = await fetch("/api/todos");
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },
  {
    use: [
      // Mark errors as stale - next access triggers re-fetch
      staleOn({ error: true }),
      // Auto-remove cache entry when refCount reaches 0
      evictOn({ idle: 0 }),
    ],
  }
);

// Factory function to create a signal that accesses the cache
//
// NOTE: No abortSignal needed here because:
// - Cache is SHARED data - multiple components access the same entry
// - No need to abort on recompute - the fetch is managed by cache, not signal
// - Cache works on key (payload) - same key = same shared data
// - No side effect - cache handles deduplication automatically
function createTodoListSignal() {
  return signal(({ onCleanup }) => {
    // Access cache - increments refCount
    const { value, unref } = fetchTodoList();

    // When signal disposes, decrement refCount
    // If refCount reaches 0, evictOn({ idle: 0 }) removes entry
    onCleanup(unref);

    return value; // Returns the promise
  });
}

// Error Boundary for handling fetch errors
class TodoErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  handleRetry = () => {
    // Refresh the cache - triggers re-fetch
    fetchTodoList.refresh();
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div>
          <p>Error: {this.state.error.message}</p>
          <button onClick={this.handleRetry}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Component using the shared todo list
function TodoList() {
  // useScope creates a component-scoped signal
  // When component unmounts, signal disposes and calls onCleanup
  const { todoList } = useScope(() => ({
    todoList: createTodoListSignal(),
    dispose: [todoList],
  }));

  // wait() throws for Suspense when loading, throws error for ErrorBoundary
  return rx(() => {
    const todos = wait(todoList());
    return (
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    );
  });
}

// Usage: Wrap with Suspense and ErrorBoundary
function App() {
  return (
    <TodoErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <TodoList />
      </Suspense>
    </TodoErrorBoundary>
  );
}

// Multiple components can share the same cached data
function TodoCount() {
  const { todoList } = useScope(() => ({
    todoList: createTodoListSignal(),
    dispose: [todoList],
  }));

  return rx(() => {
    const todos = wait(todoList());
    return <span>{todos.length} todos</span>;
  });
}

// When BOTH TodoList and TodoCount unmount:
// - Both signals dispose
// - Both call unref()
// - refCount reaches 0
// - Cache entry is removed (evictOn({ idle: 0 }))
```

**How it works:**

1. **`cache()`** returns `{ value, unref }` where `value` is a Promise
2. Each access increments the internal `refCount`
3. Calling `unref()` decrements `refCount`
4. When `refCount` reaches 0, `evictOn({ idle: 0 })` removes the entry
5. Using `signal({ onCleanup })` ensures `unref` is called when the signal disposes
6. `useScope` auto-disposes signals when the component unmounts

**Error handling with `staleOn({ error: true })`:**

```
1. Fetch fails → entry.isError = true, entry.isStale = true
2. Suspense catches → ErrorBoundary shows error UI
3. User clicks Retry → fetchTodoList.refresh() triggers re-fetch
4. New promise replaces old rejected promise
5. Component re-renders with fresh data
```

**Why no `abortSignal`?**

Unlike computed signals that fetch data directly, cache-backed signals don't need `abortSignal`:

| Approach               | Needs `abortSignal`? | Why?                                         |
| ---------------------- | -------------------- | -------------------------------------------- |
| Direct fetch in signal | ✅ Yes               | Each recompute starts a new request          |
| Cache-backed signal    | ❌ No                | Cache deduplicates - same key = same request |

```tsx
// ❌ Direct fetch - NEEDS abortSignal to cancel on recompute
const data = signal({ userId }, async ({ deps, abortSignal }) => {
  return fetch(`/user/${deps.userId}`, { signal: abortSignal });
});

// ✅ Cache-backed - NO abortSignal needed
const data = signal(({ onCleanup }) => {
  const { value, unref } = userCache(userId);
  onCleanup(unref);
  return value; // Cache handles deduplication
});
```

**Strategies explained:**

| Strategy                     | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `staleOn({ after: 30000 })`  | Mark stale after 30s (background refresh)          |
| `staleOn({ error: true })`   | Mark errors stale (enables retry)                  |
| `evictOn({ idle: 0 })`       | Remove immediately when refCount=0                 |
| `evictOn({ idle: 60000 })`   | Remove after 60s of refCount=0                     |
| `evictOn({ after: 300000 })` | Remove after 5 min regardless of usage             |
| `evictOn({ error: true })`   | Remove errors immediately (alternative to staleOn) |

**Benefits:**

- ✅ **Shared data** - Multiple components access the same cached data
- ✅ **Automatic cleanup** - `evictOn({ idle })` removes entries when refCount=0
- ✅ **No memory leaks** - Proper ref counting with automatic unref
- ✅ **Error recovery** - `staleOn({ error: true })` enables retry via `cache.refresh()`

### Object Keys

Cache supports object keys with automatic stable serialization:

```tsx
import { cache } from "rextive/cache";

const search = cache("search", async (params: { q: string; page: number }) => {
  return fetch(`/search?q=${params.q}&page=${params.page}`);
});

// Same entry regardless of property order
search({ q: "react", page: 1 });
search({ page: 1, q: "react" }); // Same cache entry!

// Custom key serialization
const customCache = cache("custom", fetchData, {
  stringify: (key) => `${key.type}:${key.id}`, // Custom key format
});
```

### SSR/Hydration Pattern

```tsx
// Server: Extract cache state
const cacheState = getUser.extract();
const html = `
  <script>window.__CACHE_STATE__ = ${JSON.stringify({
    users: cacheState,
  })}</script>
  ${appHtml}
`;

// Client: Hydrate from server state
const getUser = cache("users", fetchUser, {
  use: [
    hydrate({
      source: () => window.__CACHE_STATE__?.users,
      stale: true, // Re-validate after hydration
    }),
  ],
});
```

### Combining Strategies

```tsx
import { cache, staleOn, evictOn, lru, hydrate } from "rextive/cache";

const getUser = cache("users", fetchUser, {
  use: [
    // Hydrate from SSR state first
    hydrate({ source: () => window.__CACHE_STATE__?.users }),

    // Mark stale after 30 seconds (background refresh)
    staleOn({ after: 30000 }),

    // Hard expire after 5 minutes, cleanup unused after 1 minute
    evictOn({ after: 300000, idle: 60000 }),

    // Keep max 100 entries
    lru({ maxSize: 100 }),
  ],
});
```

### API Reference

**`cache(name, factory, options?)`**

| Property        | Type                          | Description                             |
| --------------- | ----------------------------- | --------------------------------------- |
| `(key)`         | `(K) => CacheAccessResult<T>` | Access/create cache entry               |
| `name`          | `string`                      | Cache name                              |
| `size`          | `number`                      | Number of entries                       |
| `stale(key)`    | `(K) => void`                 | Mark entry as stale                     |
| `staleAll()`    | `() => void`                  | Mark all entries as stale               |
| `refresh(key)`  | `(K) => Promise<T>`           | Force immediate re-fetch                |
| `refreshAll()`  | `() => Promise<T[]>`          | Refresh all entries                     |
| `delete(key)`   | `(K) => boolean`              | Remove entry                            |
| `clear()`       | `() => void`                  | Clear all entries                       |
| `has(key)`      | `(K) => boolean`              | Check if key exists                     |
| `peek(key)`     | `(K) => T \| undefined`       | Get value without creating/incrementing |
| `prefetch(key)` | `(K) => Promise<T>`           | Prefetch without incrementing refCount  |
| `extract()`     | `() => Record<string, T>`     | Extract all data (for SSR)              |
| `dispose()`     | `() => void`                  | Dispose cache and cleanup               |

**`CacheAccessResult<T>`**

| Property | Type         | Description                     |
| -------- | ------------ | ------------------------------- |
| `value`  | `Promise<T>` | The cached value as a promise   |
| `unref`  | `() => void` | Release reference (for cleanup) |

---

## 🆚 Comparison with Other Libraries

### vs React useState + useEffect

```tsx
// ❌ React - Boilerplate hell
const [count, setCount] = useState(0);
const [name, setName] = useState("");
const doubled = useMemo(() => count * 2, [count]);

useEffect(() => {
  console.log("count changed");
}, [count]);

// ✅ Rextive - Simple and unified
import { signal } from "rextive";

const count = signal(0);
const name = signal("");
const doubled = count.to((x) => x * 2);

count.on(() => console.log("count changed"));
```

### vs Zustand

**Lazy Tracking:**

```tsx
// ❌ Zustand - Must select everything upfront
const { user, posts, comments } = useStore((state) => ({
  user: state.user,
  posts: state.posts,
  comments: state.comments, // Subscribed even if not used!
}));

// ✅ Rextive - Lazy tracking
import { rx, wait } from "rextive/react";

{
  rx(() => {
    const userData = wait(user());
    return <div>{userData.name}</div>; // Only user subscribed!
  });
}
```

**Async State Management:**

```tsx
// ❌ Zustand - Manual async state management (lots of boilerplate!)
const useUserStore = create((set, get) => ({
  // Each async operation needs 3 states
  user: null,
  userLoading: false,
  userError: null,

  posts: [],
  postsLoading: false,
  postsError: null,

  comments: [],
  commentsLoading: false,
  commentsError: null,

  // Each fetch needs manual loading/error handling
  fetchUser: async (id) => {
    set({ userLoading: true, userError: null });
    try {
      const user = await api.getUser(id);
      set({ user, userLoading: false });
    } catch (error) {
      set({ userError: error, userLoading: false });
    }
  },

  fetchPosts: async (userId) => {
    set({ postsLoading: true, postsError: null });
    try {
      const posts = await api.getPosts(userId);
      set({ posts, postsLoading: false });
    } catch (error) {
      set({ postsError: error, postsLoading: false });
    }
  },

  // ...repeat for every async operation 😩
}));

// Component
function Profile({ userId }) {
  const { user, userLoading, userError, fetchUser } = useUserStore();

  useEffect(() => {
    fetchUser(userId);
  }, [userId]);

  if (userLoading) return <Spinner />;
  if (userError) return <Error error={userError} />;
  return <div>{user?.name}</div>;
}

// ✅ Rextive - Async is built-in, zero boilerplate!
import { signal, rx, loadable } from "rextive/react";

const userId = signal(1);

// Just declare what you want - loading/error handled automatically
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  return api.getUser(deps.userId, { signal: abortSignal });
});

const posts = signal({ userId }, async ({ deps, abortSignal }) => {
  return api.getPosts(deps.userId, { signal: abortSignal });
});

// Component - that's it!
function Profile() {
  return rx(() => {
    const state = loadable(user);
    if (state.loading) return <Spinner />;
    if (state.error) return <Error error={state.error} />;
    return <div>{state.value.name}</div>;
  });
}

// Or use Suspense - even simpler!
function ProfileWithSuspense() {
  return rx(() => <div>{wait(user).name}</div>);
}
```

**Key differences:**

| Feature                     | Zustand                       | Rextive    |
| --------------------------- | ----------------------------- | ---------- |
| Async state per operation   | 3 fields (data/loading/error) | Built-in   |
| Request cancellation        | Manual AbortController        | Automatic  |
| Race conditions             | Must handle manually          | Impossible |
| Dependency tracking         | Manual selectors              | Automatic  |
| Code for 5 async operations | ~150 lines                    | ~15 lines  |

### vs React Query

```tsx
// ❌ React Query - Complex setup
const { data } = useQuery({
  queryKey: ["todos", userId],
  queryFn: () => fetchTodos(userId),
  // ... many options
});

// ✅ Rextive - Simple and powerful
import { signal } from "rextive";

const userId = signal(1);
const todos = signal({ userId }, async ({ deps, abortSignal }) => {
  return fetch(`/todos/${deps.userId}`, { signal: abortSignal });
});
```

### vs Jotai

```tsx
// ❌ Jotai - Must use all atoms
const [user] = useAtom(userAtom);
const [posts] = useAtom(postsAtom); // Subscribed even if unused
const [comments] = useAtom(commentsAtom); // Subscribed even if unused

// ✅ Rextive - Lazy tracking
import { rx, wait } from "rextive/react";

{
  rx(() => {
    const userData = wait(user());
    return <div>{userData.name}</div>; // Only user subscribed!
  });
}
```

### vs Redux Toolkit

```tsx
// ❌ Redux Toolkit - So much ceremony
const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    reset: (state) => {
      state.value = 0;
    },
  },
});

// ✅ Rextive - Direct and simple
import { signal } from "rextive";

const count = signal(0);
count.set((x) => x + 1);
count.set((x) => x - 1);
count.reset();
```

---

## 💎 Why Choose Rextive?

### 🎯 **One Concept to Rule Them All**

Learn `signal` once. Use it everywhere. No mental overhead switching between useState, useEffect, useMemo, Redux, React Query, etc.

### ⚡ **Performance That Just Works**

- **Lazy tracking** - Only subscribes to signals you actually use
- **Automatic batching** - Intelligent update scheduling
- **Smart memoization** - Computed signals cache automatically
- **Request cancellation** - Abort signals built-in

### 🧠 **Less Code, More Power**

```tsx
import { signal } from "rextive";

// 100 lines of Redux/React Query code becomes...
const data = signal(async () => fetchData());

// That's it. Full async support, caching, subscriptions, everything.
```

### 🔌 **Works Everywhere**

- ✅ React (with Suspense support)
- ✅ Vanilla JavaScript
- ✅ Vue, Svelte, Angular (same API)
- ✅ Node.js (for server-side logic)

### 🎨 **Developer Experience**

- 📝 Full TypeScript support with perfect inference
- 🐛 Excellent debugging with named signals
- 📦 Tree-shakeable - only pay for what you use
- 🎯 Zero configuration needed

### 🚀 **Production Ready**

- ✅ 96% test coverage
- ✅ Battle-tested in production apps
- ✅ Comprehensive documentation
- ✅ Active maintenance

---

## 📦 What's Included

```bash
rextive/          # Core - works anywhere
rextive/react     # React integration
rextive/op        # Operators for signal transformations
rextive/immer     # Immer integration
rextive/cache     # Data caching with strategies
```

**Core (`rextive`):**

- `signal` / `$` - Reactive state primitive
- `signal.batch` - Batch updates
- `persistor` - Persistence utilities (from `rextive/persist`)
- `signal.tag` - Group signals with tags (with `forEach`, `map`, `size`)
- `signal.on` - Subscribe to multiple signals with pause/resume control
- `wait` - Promise utilities (`wait.any`, `wait.race`, `wait.settled`, `wait.timeout`, `wait.delay`)
- `awaited` - Transform async/sync values uniformly
- `compose` - Function composition utility
- `disposable` - Automatic cleanup for objects
- `producer` - Lazy factory for instance management (AbortControllers, connections, etc.)

**React (`rextive/react`):**

- `rx` - Reactive rendering with automatic signal tracking
- `rx.use` - Low-level hook for signal tracking (used by `rx`)
- `useScope` - Component-scoped signals & lifecycle control (3 modes)
- `provider` - Create signal-based React Context
- All core features re-exported

**Operators (`rextive/op`):**

- `select` - Transform values (like `Array.map`)
- `filter` - Filter values (like `Array.filter`)
- `scan` - Accumulate values (like `Array.reduce`)

**Immer (`rextive/immer`):**

- `produce` - Immutable updates with mutable API (requires `immer` peer dependency)

**Cache (`rextive/cache`):**

- `cache` - Keyed data caching with reference counting and lifecycle management
- `staleOn` - Mark entries stale on conditions (after, idle, error)
- `evictOn` - Remove entries on conditions (after, idle, error, stale)
- `lru` - Least recently used eviction strategy
- `hydrate` - SSR hydration strategy
- `ObjectKeyedMap` - Map supporting object keys with stable serialization
- `stableStringify` - Deterministic JSON serialization (sorted keys)

---

## 🎓 Learn More

### Examples

Check out the [examples folder](./examples) for more patterns:

- 🎨 [Service pattern](./examples/service-pattern-example.tsx)
- 🔧 [Disposable shapes](./examples/disposable-shapes-demo.ts)
- 📝 Form management
- 🔄 Polling and real-time data
- 🎯 [Type improvements](./examples/type-improvements-example.tsx) - NEW!

### Documentation

Advanced topics and guides:

- 📘 [Type System Improvements](./docs/TYPE_IMPROVEMENTS.md) - AnySignal, improved when(), tag kinds
- 📘 [API Reference](./docs/API_REFERENCE.md) - Complete API documentation
- 📘 [Service Pattern](./docs/SERVICE_PATTERN.md) - Building scalable applications
- 📘 [Architecture](./docs/ARCHITECTURE.md) - Internal design and concepts

---

## 📄 License

MIT © [linq2js](https://github.com/linq2js)

---

## 🌟 Show Your Support

If Rextive helps you build better apps, give it a ⭐ on [GitHub](https://github.com/linq2js/rxblox)!

**Built with ❤️ by developers, for developers.**
