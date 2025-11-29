# Advanced Patterns

## Pattern 1: Chain Multiple Transformations

For complex transformations, chain multiple operators together:

```tsx
import { signal } from "rextive";
import { to, filter, scan } from "rextive/op";

const count = signal(1);

// Chain multiple operators (executed left-to-right)
const result = count.pipe(
  filter((x) => x > 0),     // Step 1: Only positive numbers
  to((x) => x * 2),          // Step 2: Double the value
  scan((acc, x) => acc + x, 0) // Step 3: Running sum
);

count.set(5);  // result = 10 (5 * 2)
count.set(3);  // result = 16 (10 + 3 * 2)
count.set(-1); // result = 16 (filtered out)
count.set(2);  // result = 20 (16 + 2 * 2)
```

### Create Reusable Operator Pipelines

```tsx
import { to, filter, scan } from "rextive/op";

// Define reusable operators
const positiveOnly = filter((x: number) => x > 0);
const double = to((x: number) => x * 2);
const runningSum = scan((acc: number, x: number) => acc + x, 0);

// Apply to multiple signals
const result1 = signal1.pipe(positiveOnly, double, runningSum);
const result2 = signal2.pipe(positiveOnly, double, runningSum);
```

---

## Pattern 2: Group Signals with Tags

Tags let you group related signals and perform batch operations:

```tsx
import { signal } from "rextive";

// Create a tag to group form signals
const formTag = signal.tag();

// Create signals with the tag
const name = signal("", { use: [formTag] });
const email = signal("", { use: [formTag] });
const message = signal("", { use: [formTag] });

// Reset all form fields at once
const resetForm = () => {
  formTag.forEach((s) => s.reset());
};

// Collect all values
const getAllValues = () => {
  return formTag.map((s) => s.get());
};

// Get count of signals
console.log(`Form has ${formTag.size} fields`);
```

### Type-Safe Tags

```tsx
import { tag } from "rextive";

// General tag - accepts both mutable and computed signals
const mixedTag = tag<number>();

// Mutable-only tag
const stateTag = tag<number, "mutable">();

// Computed-only tag  
const viewTag = tag<number, "computed">();

const count = signal(0, { use: [stateTag] }); // ✅
const doubled = signal({ count }, ({ deps }) => deps.count * 2, {
  use: [viewTag], // ✅
});
```

---

## Pattern 3: Plugins - Extend Signal Behavior

Plugins let you extend signal behavior with reusable logic:

```tsx
import { signal } from "rextive";
import type { Plugin } from "rextive";

// Logger plugin
const logger: Plugin<number> = (sig) => {
  const name = sig.displayName || "unnamed";
  console.log(`[${name}] created: ${sig()}`);

  return sig.on(() => {
    console.log(`[${name}] changed: ${sig()}`);
  });
};

const count = signal(0, { name: "count", use: [logger] });
```

### Built-in Plugins

**Persistor - Auto-save to localStorage:**

```tsx
import { persistor } from "rextive/plugins";

const persist = persistor({
  load: () => JSON.parse(localStorage.getItem("app") || "{}"),
  save: (args) => {
    const existing = JSON.parse(localStorage.getItem("app") || "{}");
    localStorage.setItem("app", JSON.stringify({ ...existing, ...args.values }));
  },
});

const theme = signal("dark", { use: [persist("theme")] });
```

**When - React to other signals:**

```tsx
import { when } from "rextive/plugins";

const refreshTrigger = signal(0);
const userData = signal(async () => fetchUser(), {
  use: [when(refreshTrigger, (sig) => sig.refresh())],
});

// Trigger refresh
refreshTrigger.set((n) => n + 1);
```

### Tags vs Plugins

| Feature | Tag | Plugin |
|---------|-----|--------|
| **Purpose** | Group signals | Extend behavior |
| **Iteration** | `forEach`, `map`, `size` | No iteration |
| **Lifecycle** | `onAdd`, `onDelete` | Cleanup function |

---

## Pattern 4: Generic Functions with `AnySignal`

Write functions that work with both mutable and computed signals:

```tsx
import { signal, AnySignal } from "rextive";

function logChanges<T>(s: AnySignal<T>, label: string) {
  s.on(() => console.log(`[${label}]`, s()));
}

// Works with any signal type
const count = signal(0);
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

logChanges(count, "Counter");
logChanges(doubled, "Doubled");
```

### Type Narrowing

```tsx
function maybeSet<T>(s: AnySignal<T>, value: T) {
  if (signal.is(s, "mutable")) {
    s.set(value); // ✅ TypeScript knows it's mutable
  }
}
```

---

## Pattern 5: Fine-Grained Lifecycle Control

```tsx
import { useScope } from "rextive/react";

function Component() {
  useScope({
    init: () => console.log("Before first render"),
    mount: () => console.log("After first paint"),
    render: () => console.log("Every render"),
    cleanup: () => console.log("React cleanup"),
    dispose: () => console.log("True unmount (once)"),
  });

  return <div>Hello</div>;
}
```

### Lifecycle Phases

| Phase | When | Use For |
|-------|------|---------|
| **init** | Before first render | Signal creation |
| **mount** | After first paint | DOM measurements |
| **render** | Every render | Tracking |
| **cleanup** | React cleanup | Pause (not final) |
| **dispose** | True unmount | Final cleanup |

---

## Pattern Quick Reference

| Pattern | Use When | Example |
|---------|----------|---------|
| **Single value** | Simple state | `signal(0)` |
| **With equality** | Objects/arrays | `signal({...}, "shallow")` |
| **`.to()`** | Transform one signal | `count.to(x => x * 2)` |
| **Multiple deps** | Combine signals | `signal({ a, b }, ...)` |
| **`.pipe()`** | Chain operators | `count.pipe(filter(...), to(...))` |
| **Tags** | Group signals | `signal.tag()` |
| **Plugins** | Extend behavior | `{ use: [logger] }` |
| **Async** | Data fetching | `signal(async () => ...)` |

---

## Next Steps

- **[Error Handling](./ERROR_HANDLING.md)** - Error handling & tracing
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Operators](./OPERATORS.md)** - Full operators reference

