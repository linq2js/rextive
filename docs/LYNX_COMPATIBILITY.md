# ReactLynx Compatibility Guide for React Libraries

This document describes how to make React-based libraries compatible with ReactLynx (Lynx's React-like framework from ByteDance).

## What is ReactLynx?

ReactLynx is a cross-platform UI framework that uses a React-compatible API but with a **dual-threaded architecture**:

- **Main Thread**: Handles DOM/native rendering
- **Background Thread**: Runs React logic (components, hooks, effects)

Website: https://lynxjs.org/

## Key Differences from React

### 1. Effects Run Asynchronously

In standard React:

```
Render → Commit → useEffect (synchronous in same task)
```

In ReactLynx:

```
Render (background) → Commit → useEffect (async, may be delayed)
```

**Implication**: Timing-based patterns (microtasks, short timeouts) that assume effects run quickly after render will fail.

### 2. Dual-Thread Execution with Separate Module Instances

ReactLynx runs components in **TWO SEPARATE THREADS** with **TWO SEPARATE MODULE INSTANCES**:

```
Main Thread:       Has its own copy of all modules
Background Thread: Has its own copy of all modules (NOT shared!)
```

**Proof:**

```typescript
const globalValues = [1, 2];

function nextGlobal() {
  console.log("nextGlobal", globalValues.length);
  return { id: globalValues.shift() };
}

function Component() {
  const ref = useRef();
  if (!ref.current) {
    ref.current = nextGlobal();
  }
}

// Console output:
// nextGlobal 2  ← Main thread (array length = 2)
// nextGlobal 2  ← Background thread (array length = 2, NOT 1!)
```

Both calls see `length = 2` because each thread has its **own array copy**.

| Behavior                      | React StrictMode | ReactLynx                      |
| ----------------------------- | ---------------- | ------------------------------ |
| Component called              | 2x (same thread) | 2x (**different threads**)     |
| useRef persists between calls | ✅ Yes           | ❌ **No** (separate instances) |
| Module-level state shared     | ✅ Yes           | ❌ **No** (separate copies)    |
| Which result is used          | 2nd call         | Background thread (hydrated)   |

**Implication**:

- Ref-based orphan detection is impossible
- Module-level Maps/Sets exist separately in each thread
- Cannot communicate between the two executions

### 3. React Imports Must Use @lynx-js/react

ReactLynx provides its own React implementation. Libraries that import from `"react"` need aliasing:

```typescript
// lynx.config.ts
export default defineConfig({
  resolve: {
    alias: {
      react: "@lynx-js/react",
    },
  },
});
```

**Implication**: Even with aliasing, deeply nested dependencies may not resolve correctly. The safest approach is to use `@lynx-js/react` directly in Lynx-specific code.

### 4. No Direct DOM Access (Must Use Refs)

Since component code runs in the background thread but DOM lives in the main thread:

```typescript
function Component() {
  // ❌ FAILS - DOM doesn't exist in background thread
  document.getElementById("myElement");
  document.querySelector(".foo");
  window.innerWidth;

  // ✅ WORKS - Refs are bridged between threads
  const ref = useRef();

  useEffect(() => {
    // ref.current is bridged to main thread element
    console.log(ref.current);
  }, []);

  return <view ref={ref} />;
}
```

**Implication**:

- No direct DOM manipulation
- No `document.*` or `window.*` in component code
- All element interaction must go through refs
- Similar to React Native's architecture

### 5. Native Components

ReactLynx uses native components instead of HTML:

| HTML            | ReactLynx |
| --------------- | --------- |
| `<div>`         | `<view>`  |
| `<span>`, `<p>` | `<text>`  |
| `<img>`         | `<image>` |
| `onClick`       | `bindtap` |

## Setting Up a Lynx Test Environment

### Package Dependencies

```json
{
  "dependencies": {
    "@lynx-js/react": "^0.114.5",
    "@lynx-js/web-core": "^0.1.0",
    "@lynx-js/web-elements": "^0.3.2",
    "@lynx-js/types": "^3.6.0",
    "remote-web-worker": "^1.1.0"
  },
  "devDependencies": {
    "@lynx-js/rspeedy": "^0.12.0",
    "@lynx-js/react-rsbuild-plugin": "^0.11.4",
    "@lynx-js/testing-environment": "^0.9.2"
  }
}
```

### Configuration (lynx.config.ts)

```typescript
import { defineConfig } from "@lynx-js/rspeedy";
import { pluginReactLynx } from "@lynx-js/react-rsbuild-plugin";

export default defineConfig({
  plugins: [pluginReactLynx()],
  source: {
    entry: {
      index: "./src/index.tsx",
    },
  },
  resolve: {
    alias: {
      react: "@lynx-js/react",
    },
  },
  environments: {
    lynx: {},
    web: {},
  },
});
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@lynx-js/react",
    "types": ["@lynx-js/types"]
  }
}
```

### Running

```bash
pnpm rspeedy dev   # Development server
pnpm rspeedy build # Production build
```

Web preview URL: `http://localhost:3000/__web_preview?casename=index.web.bundle`

## Making React Hooks Work with ReactLynx

### Problem: Standard useScope Pattern Fails

The standard pattern for scoped state with orphan detection:

```typescript
// ❌ DOES NOT WORK in ReactLynx
function useSafeFactory(factory, deps) {
  const controllerRef = useRef(null);

  return useMemo(() => {
    // Dispose previous via ref - FAILS because ref resets!
    controllerRef.current?.dispose();

    const result = factory();
    controllerRef.current = result;
    return result;
  }, deps);
}
```

### Solution: Embed Metadata in Return Object

Since the scope object itself IS passed from useMemo to useEffect, embed tracking data on it:

```typescript
// ✅ WORKS in ReactLynx
const SCOPE_META = Symbol("scopeMeta");

function useScopeLynx(factory) {
  const scope = useMemo(() => {
    const result = factory();

    // Embed metadata ON the object itself
    result[SCOPE_META] = {
      signals: collectedSignals,
      disposed: false,
    };

    return result;
  }, []);

  useEffect(() => {
    return () => {
      // Read metadata from the object
      const meta = scope[SCOPE_META];
      if (meta && !meta.disposed) {
        meta.disposed = true;
        meta.signals.forEach((s) => s.dispose());
      }
    };
  }, [scope]);

  return scope;
}
```

### Accepting the Orphan Leak

In ReactLynx, orphaned scopes from double-invoke **cannot** be detected or disposed because:

1. Refs don't persist between calls
2. Module-level state resets between calls
3. Each call runs in isolation

**This is acceptable because:**

- Double-invoke is dev-only behavior
- Orphaned signals are not referenced by UI
- They receive no updates (subscriptions not active in practice)
- They will be garbage collected eventually

## Signal Tracking Pattern

To track signals created inside a factory:

```typescript
let currentCollector: Set<Signal> | null = null;

// Wrap signal creation
export function signal(initial, options) {
  const s = createSignal(initial, options);
  if (currentCollector) {
    currentCollector.add(s);
  }
  return s;
}

// In useScopeLynx
const scope = useMemo(() => {
  currentCollector = new Set();
  try {
    return factory();
  } finally {
    // Store collected signals for disposal
    storedSignals = currentCollector;
    currentCollector = null;
  }
}, []);
```

## Testing with @lynx-js/testing-environment

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: "@lynx-js/testing-environment/env/vitest",
  },
});
```

```typescript
// test file
import { render } from "@testing-library/react";

it("should work", () => {
  const { getByText } = render(<Component />);
  expect(getByText("Hello")).toBeInTheDocument();
});
```

## Summary for AI Assistants

When helping users integrate React libraries with ReactLynx:

1. **Don't assume React patterns work** - ReactLynx's dual-thread model breaks many assumptions
2. **Avoid timing-based detection** - setTimeout, microtasks, Promise.resolve() race with async effects
3. **Don't rely on refs persisting** - They reset between double-invoke calls
4. **Don't rely on module-level state** - It resets between double-invoke calls
5. **Use the return object as carrier** - The scope object from useMemo IS the link to useEffect
6. **Accept some limitations** - Orphan disposal across double-invoke is impossible
7. **Import from @lynx-js/react directly** - Aliasing may not work for all dependencies
8. **Use native components** - `<view>`, `<text>` instead of `<div>`, `<span>`
9. **Use bindtap instead of onClick** - Different event naming

## Files in This Package

- `src/hooks/useScopeLynx.ts` - ReactLynx-compatible useScope implementation
- `src/components/App.tsx` - Test application demonstrating working patterns
- `lynx.config.ts` - Rspeedy/Rsbuild configuration for Lynx
- `vitest.config.ts` - Test configuration with Lynx testing environment
