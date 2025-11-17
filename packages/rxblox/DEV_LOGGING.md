# Development Logging in rxblox

This document explains how rxblox handles environment-specific logging, following React's pattern with the `__DEV__` flag.

## The `__DEV__` Pattern

React (and now rxblox) uses a global `__DEV__` flag that gets replaced at build time:

### Development Build
```javascript
// In your code
if (__DEV__) {
  console.warn('This only shows in development');
}

// After build (development)
if (true) {
  console.warn('This only shows in development');
}
```

### Production Build
```javascript
// After build (production)
if (false) {
  console.warn('This only shows in development');
}
// ⬆️ Dead code elimination removes the entire block!
// Result: 0 bytes in production bundle
```

## How It Works

1. **Build Time Replacement**
   - Vite replaces `__DEV__` with `true` (dev) or `false` (prod)
   - Configured in `vite.config.ts`:
   
   ```ts
   define: {
     __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
   }
   ```

2. **Dead Code Elimination**
   - Terser (minifier) removes `if (false)` blocks entirely
   - Production bundle contains zero bytes of dev code
   - No runtime overhead

3. **TypeScript Support**
   - Global `declare const __DEV__: boolean;` in `dev.ts`
   - TypeScript knows about the flag
   - Type checking works correctly

## API

### `devLog(message, ...args)`

Log a message only in development.

```tsx
import { devLog } from "rxblox";

const signal = createSignal(0);
devLog("Signal created:", signal);
// Development: "[rxblox] Signal created:" {value: 0}
// Production: (removed entirely)
```

### `devWarn(message, ...args)`

Warn only in development.

```tsx
import { devWarn } from "rxblox";

devWarn("Deprecated API used");
// Development: "[rxblox] Deprecated API used"
// Production: (removed entirely)
```

### `devError(message, ...args)`

Error only in development.

```tsx
import { devError } from "rxblox";

devError("Invalid configuration:", config);
// Development: "[rxblox] Invalid configuration:" {...}
// Production: (removed entirely)
```

### `devOnly(fn)`

Execute code only in development.

```tsx
import { devOnly } from "rxblox";

devOnly(() => {
  validateSignalGraph();
  checkMemoryLeaks();
  console.log("Debug info:", complexCalculation());
});
// Development: executes the function
// Production: (removed entirely)
```

### `devAssert(condition, message)`

Assert a condition only in development.

```tsx
import { devAssert } from "rxblox";

devAssert(signal !== undefined, "Signal cannot be undefined");
devAssert(count > 0, "Count must be positive");
// Development: throws if condition is false
// Production: (removed entirely)
```

## Usage Examples

### Example 1: Validation

```tsx
import { signal, devAssert } from "rxblox";

function createTodoStore(initialTodos: Todo[]) {
  devAssert(Array.isArray(initialTodos), "initialTodos must be an array");
  devAssert(initialTodos.every(t => t.id), "All todos must have an id");
  
  const todos = signal(initialTodos);
  return { todos };
}
```

### Example 2: Performance Monitoring

```tsx
import { effect, devOnly } from "rxblox";

const count = signal(0);

effect(() => {
  const value = count();
  
  devOnly(() => {
    const start = performance.now();
    // ... expensive computation ...
    const duration = performance.now() - start;
    if (duration > 16) {
      console.warn(`Slow effect: ${duration}ms`);
    }
  });
  
  updateUI(value);
});
```

### Example 3: Deprecation Warnings

```tsx
import { devWarn } from "rxblox";

export function legacyAPI() {
  devWarn(
    "legacyAPI() is deprecated. Use newAPI() instead. " +
    "This will be removed in v2.0"
  );
  
  return newAPI();
}
```

### Example 4: Debug Information

```tsx
import { blox, signal, devLog } from "rxblox";

const Counter = blox(() => {
  const count = signal(0);
  
  devLog("Counter mounted with initial value:", count());
  
  const increment = () => {
    count.set(count() + 1);
    devLog("Count updated to:", count());
  };
  
  return (
    <button onClick={increment}>
      Count: {count()}
    </button>
  );
});
```

## Comparison: React vs rxblox

| Feature | React | rxblox |
|---------|-------|--------|
| Flag name | `__DEV__` | `__DEV__` |
| Build-time replacement | ✅ | ✅ |
| Dead code elimination | ✅ | ✅ |
| Zero production overhead | ✅ | ✅ |
| TypeScript support | ✅ | ✅ |
| Custom utilities | Limited | `devLog`, `devWarn`, `devError`, `devOnly`, `devAssert` |

## Benefits

✅ **Zero Production Cost**
- Dev code is completely removed from production bundle
- No runtime checks, no performance overhead

✅ **Better DX**
- Clear, intentional development-only code
- Type-safe with TypeScript
- Consistent API across the library

✅ **Bundle Size**
- Production: 122.43 kB
- Development: Larger (includes all dev utilities)
- Users only download production code

✅ **Debugging**
- Rich logging in development
- Assertions catch bugs early
- Performance monitoring without cost

## Best Practices

### DO ✅

```tsx
// Use dev utilities for expensive checks
devOnly(() => {
  validateComplexState();
});

// Add helpful warnings
devWarn("This prop will be required in v2.0");

// Assert invariants
devAssert(value > 0, "Value must be positive");

// Debug complex logic
devLog("Processing item:", item);
```

### DON'T ❌

```tsx
// Don't use for production logic
if (__DEV__) {
  return specialDevBehavior(); // ❌ Production will be broken!
}

// Don't put critical validations in dev only
devAssert(user.isAuthenticated, "Must be authenticated"); // ❌ No security!

// Don't use for feature flags
if (__DEV__) {
  enableExperimentalFeature(); // ❌ Use proper feature flags
}
```

## How This Differs from `isDev()` / `isProd()`

rxblox has TWO approaches for environment detection:

### 1. `__DEV__` (Build-time, Zero Cost)
```tsx
import { devLog } from "rxblox";

devLog("message"); // Removed in production build
```

**Use for:**
- Development-only logging
- Debug assertions
- Performance profiling
- Validation that slows down production

### 2. `isDev()` / `isProd()` (Runtime, Has Cost)
```tsx
import { isDev } from "rxblox";

if (isDev()) {
  console.log("message"); // Still in bundle, checked at runtime
}
```

**Use for:**
- User-facing features that need environment awareness
- Configuration that consumers control
- When you need to check the consuming app's environment

## Configuration

The `__DEV__` flag is automatically configured:

**Development:**
```bash
npm run dev        # __DEV__ = true
npm test           # __DEV__ = true
```

**Production:**
```bash
npm run build      # __DEV__ = false
NODE_ENV=production npm start  # __DEV__ = false
```

No additional setup needed!

## Verification

To verify dead code elimination works:

```bash
# Build production bundle
npm run build

# Search for dev code in bundle (should find nothing)
grep -r "devLog" dist/
grep -r "__DEV__" dist/

# Check bundle size
ls -lh dist/rxblox.js
```

## Summary

rxblox now follows React's proven pattern for development-only code:

1. ✅ Uses `__DEV__` flag for zero-cost dev utilities
2. ✅ Provides rich debugging API (`devLog`, `devWarn`, `devAssert`, etc.)
3. ✅ Complete dead code elimination in production
4. ✅ No runtime overhead
5. ✅ Type-safe with TypeScript

This gives developers powerful debugging tools without any cost to production users! 🎉

