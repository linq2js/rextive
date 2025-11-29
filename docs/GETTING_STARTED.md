# Getting Started with Rextive

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
<summary>📖 <strong>What's happening here?</strong></summary>

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

## Full Counter Example

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
<summary>📖 <strong>Understanding Derived State</strong></summary>

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

## 💡 Shorthand: Use `$()` for Concise Code

For shorter syntax, use `$` instead of `signal`:

```tsx
import { $ } from "rextive";

const count = $(0); // Same as signal(0)
const doubled = $({ count }, ({ deps }) => deps.count * 2); // Computed signal
```

Both are **identical** - use whichever you prefer! The rest of this guide uses `signal()` for clarity.

---

## Vanilla JavaScript (No React!)

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
<summary>📖 <strong>How Reactive Effects Work</strong></summary>

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

## Installation

### npm / pnpm / yarn

```bash
npm install rextive
# or
pnpm add rextive
# or
yarn add rextive
```

### Deno (JSR)

```ts
import { signal } from "jsr:@ging/rextive";
// or in deno.json
// "imports": { "rextive": "jsr:@ging/rextive" }
```

### Deno (npm compatibility)

```ts
import { signal } from "npm:rextive";
```

---

## Next Steps

- **[Core Concepts](./CORE_CONCEPTS.md)** - Learn the 4 fundamental patterns
- **[Examples](./EXAMPLES.md)** - See 10 real-world examples
- **[React Integration](./REACT.md)** - Deep dive into rx(), useScope(), etc.
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
