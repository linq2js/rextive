# Sharing State Between Sub-Module Exports

When a library has multiple entry points (sub-exports), each entry point gets its own bundled copy of shared modules. This creates separate module instances with separate closures, breaking shared state.

## The Problem

```typescript
// hooks.ts (shared module)
let sharedState = null; // ❌ Each bundle gets its own copy!

// rextive/index.ts imports hooks.ts → Instance A
// rextive/devtools/index.ts imports hooks.ts → Instance B
// Instance A.sharedState ≠ Instance B.sharedState
```

## Solutions

### 1. **globalThis (Current Solution)** ✅

**Best for:** Runtime state that needs to be shared across all instances

```typescript
// hooks.ts
function getSharedState() {
  if (!globalThis.__REXTIVE_STATE__) {
    globalThis.__REXTIVE_STATE__ = { hooks: null, queue: [] };
  }
  return globalThis.__REXTIVE_STATE__;
}

export function setHooks(hooks) {
  const state = getSharedState();
  state.hooks = hooks;
  // Replay queued items...
}

export const emit = {
  signalCreate: (signal) => {
    const state = getSharedState();
    if (state.hooks) {
      state.hooks.onSignalCreate(signal);
    } else {
      state.queue.push(signal);
    }
  }
};
```

**Pros:**
- ✅ Works across all module instances
- ✅ Simple to implement
- ✅ No build configuration changes

**Cons:**
- ❌ Pollutes global scope
- ❌ Potential naming conflicts
- ❌ Not ideal for SSR (multiple contexts)

---

### 2. **External Shared Module** ✅

**Best for:** Shared code that should be imported, not bundled

Mark shared modules as external so they're imported from the main package:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: {
        rextive: "src/index.ts",
        "devtools/index": "src/devtools/index.ts",
      }
    },
    rollupOptions: {
      external: [
        "react",
        // Mark shared modules as external
        /^\.\.\/hooks$/,  // Relative imports to hooks
        /^@\/hooks$/,      // Alias imports to hooks
      ],
      output: {
        // Ensure external modules are imported, not bundled
        globals: {
          "../hooks": "rextive.hooks",  // Map to main package
        }
      }
    }
  }
});
```

**Pros:**
- ✅ Single source of truth
- ✅ No global scope pollution
- ✅ Type-safe

**Cons:**
- ❌ Requires consumers to import from main package
- ❌ More complex build configuration
- ❌ May not work with all bundlers

---

### 3. **Shared Entry Point + Re-exports**

**Best for:** When you want to explicitly share code

Create a shared entry point that both modules import from:

```typescript
// src/shared/hooks.ts
export let sharedState = { hooks: null, queue: [] };

// src/index.ts
export * from "./shared/hooks";
export * from "./signal";

// src/devtools/index.ts
import { sharedState } from "../shared/hooks";  // Import from main
export * from "./devtools";
```

Then configure Vite to not bundle shared modules:

```typescript
// vite.config.ts
rollupOptions: {
  external: (id) => {
    // Don't bundle shared modules - import from main package
    return id.includes("/shared/");
  }
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

### 4. **Module Registry Pattern**

**Best for:** Plugin systems or dynamic registries

```typescript
// registry.ts
const registry = new Map<string, any>();

export function register(key: string, value: any) {
  registry.set(key, value);
}

export function get(key: string) {
  return registry.get(key);
}

// In each module instance
import { register, get } from "./registry";

// Module A
register("hooks", myHooks);

// Module B
const hooks = get("hooks");
```

**Pros:**
- ✅ Flexible
- ✅ No global scope pollution
- ✅ Can handle multiple registries

**Cons:**
- ❌ Still needs global storage (Map) or external module
- ❌ More complex API

---

### 5. **Build-Time Code Splitting**

**Best for:** When you want Rollup to handle sharing automatically

Configure Rollup to create shared chunks:

```typescript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: (id) => {
      // Put shared modules in a separate chunk
      if (id.includes("hooks") || id.includes("shared")) {
        return "shared";
      }
    }
  }
}
```

**Pros:**
- ✅ Automatic sharing
- ✅ Smaller bundles (shared code not duplicated)

**Cons:**
- ❌ Requires consumers to load shared chunk
- ❌ More complex for library builds
- ❌ May not work with all bundlers

---

## Recommended Approach for Rextive

**Use `globalThis` for runtime state** (current solution) because:

1. ✅ DevTools hooks are runtime-only (development feature)
2. ✅ Simple and works everywhere
3. ✅ No build configuration complexity
4. ✅ Consumers don't need to do anything special

**Alternative for production code:**

If you need shared state in production code, use **External Shared Module** approach:

```typescript
// vite.config.ts
rollupOptions: {
  external: (id) => {
    // Don't bundle core hooks - import from main package
    if (id === "../hooks" || id === "@/hooks") {
      return true;
    }
  }
}
```

Then in `devtools/index.ts`:
```typescript
// Import hooks from main package (not bundled)
import { setDevToolsHooks } from "rextive/hooks";  // External import
```

But this requires:
- Exporting hooks from main package
- Consumers importing hooks from main package
- More complex setup

---

## Current Implementation

Rextive uses **globalThis** for DevTools state sharing:

```typescript
// hooks.ts
globalThis.__REXTIVE_DEVTOOLS__ = hooks;  // Shared hooks
globalThis.__REXTIVE_QUEUE__ = [];        // Shared queue
```

This works because:
- DevTools is a development-only feature
- State is ephemeral (reset on page reload)
- No conflicts with other libraries (namespaced)
- Simple and reliable

