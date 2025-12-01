# Sharing Global Variables Between Entry Points

## The Problem

When you have multiple entry points, each entry gets its own bundled copy of shared modules. This means **global variables in one entry point are NOT accessible from another entry point**.

### Example Scenario

```typescript
// src/utils/counter.ts
let globalCounter = 0; // ❌ Each entry gets its own copy!

export function increment() {
  globalCounter++;
}

export function getCounter() {
  return globalCounter;
}

// src/index.ts (main entry)
import { increment, getCounter } from "./utils/counter";

increment();
console.log(getCounter()); // 1

// src/devtools/index.ts (devtools entry)
import { getCounter } from "../utils/counter";

console.log(getCounter()); // 0 ❌ Different instance! Not 1!
```

### Why This Happens

```
Build Output:
├── rextive.js          → Contains: utils/counter.ts (Instance A)
└── devtools/index.js   → Contains: utils/counter.ts (Instance B)

Instance A.globalCounter ≠ Instance B.globalCounter
```

## Solutions

### 1. **Use `globalThis` (Recommended for Shared State)**

Store global variables in `globalThis` so all entry points share the same state:

```typescript
// src/utils/counter.ts
function getGlobalCounter() {
  if (!globalThis.__REXTIVE_COUNTER__) {
    globalThis.__REXTIVE_COUNTER__ = { value: 0 };
  }
  return globalThis.__REXTIVE_COUNTER__;
}

export function increment() {
  getGlobalCounter().value++;
}

export function getCounter() {
  return getGlobalCounter().value;
}

// Now both entries share the same counter!
// src/index.ts
increment(); // Sets globalThis.__REXTIVE_COUNTER__.value = 1

// src/devtools/index.ts
getCounter(); // Returns 1 ✅ Same instance!
```

**Pros:**

- ✅ Works across all entry points
- ✅ Simple to implement
- ✅ No build configuration changes

**Cons:**

- ❌ Pollutes global scope
- ❌ Use namespaced keys to avoid conflicts

---

### 2. **External Module (Import from Main Package)**

Mark the utils module as external and import it from the main package:

```typescript
// vite.config.ts
rollupOptions: {
  external: (id) => {
    // Don't bundle utils - import from main package
    if (id.includes("/utils/counter")) {
      return true;  // Mark as external
    }
  },
  output: {
    globals: {
      "../utils/counter": "rextive.counter",  // Map to main package
    }
  }
}
```

Then in `devtools/index.ts`:

```typescript
// Import from main package (not bundled)
import { getCounter } from "rextive/utils/counter"; // External import
```

**Pros:**

- ✅ Single source of truth
- ✅ No global scope pollution
- ✅ Type-safe

**Cons:**

- ❌ Requires exporting utils from main package
- ❌ More complex build configuration
- ❌ Consumers must import from main package

---

### 3. **Shared Entry Point**

Create a shared entry point that both modules import from:

```typescript
// src/shared/counter.ts
export let globalCounter = 0;

export function increment() {
  globalCounter++;
}

export function getCounter() {
  return globalCounter;
}

// src/index.ts
export * from "./shared/counter";
export * from "./signal";

// src/devtools/index.ts
import { getCounter } from "../shared/counter"; // Import from main
```

Configure Vite to not bundle shared modules:

```typescript
// vite.config.ts
rollupOptions: {
  external: (id) => {
    // Don't bundle shared modules
    return id.includes("/shared/");
  };
}
```

**Pros:**

- ✅ Explicit sharing
- ✅ Type-safe
- ✅ No global scope

**Cons:**

- ❌ Requires restructuring code
- ❌ Consumers must import shared code from main package

---

### 4. **Event Bus / Message Channel**

Use a communication channel between entry points:

```typescript
// src/utils/eventBus.ts
const eventBus = {
  state: new Map<string, any>(),

  set(key: string, value: any) {
    this.state.set(key, value);
    // Emit event for other instances
    if (globalThis.__REXTIVE_EVENTS__) {
      globalThis.__REXTIVE_EVENTS__.emit("state-change", { key, value });
    }
  },

  get(key: string) {
    return this.state.get(key);
  },
};

// Initialize global event emitter
if (!globalThis.__REXTIVE_EVENTS__) {
  globalThis.__REXTIVE_EVENTS__ = {
    listeners: new Map(),
    on(event: string, handler: Function) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(handler);
    },
    emit(event: string, data: any) {
      const handlers = this.listeners.get(event) || [];
      handlers.forEach((handler) => handler(data));
    },
  };
}

export { eventBus };
```

**Pros:**

- ✅ Decoupled communication
- ✅ Can handle async updates
- ✅ Flexible

**Cons:**

- ❌ More complex
- ❌ Still needs globalThis for event bus
- ❌ Potential race conditions

---

## Real-World Example: Rextive Hooks

In Rextive, we use `globalThis` to share DevTools hooks between entry points:

```typescript
// src/hooks.ts
let devToolsHooks: Partial<DevToolsHooks> | null = null; // Local instance

function getDevToolsHooks(): Partial<DevToolsHooks> | null {
  // Check globalThis first (shared across all module instances)
  if (globalThis.__REXTIVE_DEVTOOLS__) {
    return globalThis.__REXTIVE_DEVTOOLS__; // ✅ Shared instance
  }
  return devToolsHooks; // Fallback to local
}

export function setDevToolsHooks(hooks: Partial<DevToolsHooks> | null): void {
  devToolsHooks = hooks; // Set local
  globalThis.__REXTIVE_DEVTOOLS__ = hooks; // ✅ Also set global (shared)
}
```

**Why this works:**

- `rextive` entry sets hooks → stores in `globalThis.__REXTIVE_DEVTOOLS__`
- `devtools` entry reads hooks → reads from `globalThis.__REXTIVE_DEVTOOLS__`
- Both entries share the same hooks object ✅

---

## Best Practices

### ✅ DO: Use `globalThis` for:

- Runtime state that needs to be shared
- Development-only features (like DevTools)
- Ephemeral state (resets on page reload)
- Namespaced keys (`__REXTIVE_*`)

### ❌ DON'T: Use `globalThis` for:

- Production-critical state
- Long-lived state that should be isolated
- State that needs to be garbage collected
- Un-namespaced keys (risk of conflicts)

### ✅ DO: Use External Modules for:

- Shared utilities that should be imported
- Type definitions
- Pure functions (no state)
- Code that should be tree-shaken

---

## Summary

**Question:** Can `devtools` entry use global variables from `utils` that `rextive` main entry uses?

**Answer:** **No, not directly** - each entry gets its own bundled copy. But you can:

1. **Use `globalThis`** - Store state in global scope (works everywhere)
2. **External modules** - Import from main package (type-safe, but complex)
3. **Shared entry** - Import shared code from main (requires restructuring)
4. **Event bus** - Communicate via events (most flexible, but complex)

For Rextive, we use **`globalThis`** because DevTools is dev-only and state is ephemeral.

---

## Why This Issue Didn't Appear Before the Alias Refactor

**Short answer:** The issue was **always there**, but it wasn't noticed until DevTools was actually used and tested.

### The Issue Was Always Present

The module bundling behavior (separate instances per entry point) is **inherent to how Vite/Rollup bundles multiple entry points**. It doesn't matter whether you use:

- Relative imports: `../hooks`
- Alias imports: `@/hooks`
- Absolute imports: `/src/hooks`

**Rollup still bundles each entry point separately**, creating separate module instances.

### Why It Wasn't Noticed Before

1. **DevTools wasn't being used/tested** - The hooks sharing issue only manifests when:

   - `rextive` entry creates signals (calls `emit.signalCreate`)
   - `devtools` entry tries to read those signals (via hooks)
   - Both need to share the same hooks instance

2. **Timing coincidence** - The alias refactor happened around the same time as:

   - DevTools feature was added/enabled
   - Consumer app (`rextive-todo`) started using DevTools
   - The issue was finally exposed

3. **Import paths didn't change** - Looking at the actual code:

   ```typescript
   // devtools/index.ts - Still uses relative path!
   import { setDevToolsHooks } from "../hooks"; // Not @/hooks

   // createMutableSignal.ts - Still uses relative path!
   import { emit } from "./hooks"; // Not @/hooks
   ```

   The alias refactor updated some imports, but **not the critical ones** that caused the issue.

### What Actually Changed

The alias refactor likely:

- Made the codebase structure clearer
- Made it easier to see the module boundaries
- But **didn't change the bundling behavior**

The real trigger was: **DevTools was enabled and signals were being created**, which exposed the separate module instances issue for the first time.

### Proof: The Issue Exists Regardless of Import Style

```typescript
// Both of these create the same bundling behavior:

// Relative import
import { hooks } from "../hooks";

// Alias import
import { hooks } from "@/hooks";

// Result: Each entry point gets its own bundled copy
// Instance A.hooks ≠ Instance B.hooks
```

**Conclusion:** The alias refactor was coincidental timing. The issue was always there, waiting to be discovered when DevTools was actually used.

---

## Other Module-Level State That Needs Sharing

### Promise Cache in `task.ts`

The `promiseCache` in `src/utils/task.ts` has the same issue:

```typescript
// ❌ OLD - Separate cache per entry point
const promiseCache = new WeakMap<PromiseLike<unknown>, Task<unknown>>();

// ✅ NEW - Shared cache via globalThis
function getPromiseCache() {
  if (!globalThis.__REXTIVE_PROMISE_CACHE__) {
    globalThis.__REXTIVE_PROMISE_CACHE__ = new WeakMap();
  }
  return globalThis.__REXTIVE_PROMISE_CACHE__;
}
```

**Why this matters:**

- `devtools/panel` uses `task.from()` to extract signal values
- If a signal's value is a promise, it needs to share the same task cache
- Without sharing, each entry point would create separate task objects for the same promise

**Fixed:** Both `promiseCache` and `staticTaskCache` now use `globalThis` to share state across entry points.

### How to Identify Other Issues

Look for module-level state (variables, caches, maps, etc.) that:

1. Are used by multiple entry points
2. Need to share the same data
3. Are currently module-scoped (not in `globalThis`)

**Examples:**

- Caches (WeakMap, Map, Set)
- Counters/IDs
- Configuration state
- Event listeners
- Registry/registry maps

If they need to be shared, move them to `globalThis` with namespaced keys.
