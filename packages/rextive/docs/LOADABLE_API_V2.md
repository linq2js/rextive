# Loadable API v2 - Breaking Changes

## Summary

The `loadable` API has been completely refactored to use a namespace-based design with a primary normalizer function. This is a **breaking change** that improves API consistency and discoverability.

## Migration Guide

###  Before (v1)

```typescript
import { loadable, isLoadable, getLoadable, setLoadable, toLoadable } from "rextive";

// Factory functions with status as first parameter
const loading = loadable("loading", promise);
const success = loadable("success", data);
const error = loadable("error", err);

// Type guard
if (isLoadable(value)) { ... }

// Cache management
const l = getLoadable(promise);
setLoadable(promise, loadable);

// Normalization
const normalized = toLoadable(value);
```

### After (v2)

```typescript
import { loadable } from "rextive";

// Main function: normalizes any value to loadable
const normalized = loadable(value);        // Automatic normalization
const normalized2 = loadable(promise);     // Wraps in loading loadable
const normalized3 = loadable(loadable);    // Returns as-is

// Namespace methods for explicit creation
const loading = loadable.loading(promise);
const success = loadable.success(data);
const error = loadable.error(err);

// Type guard namespace method
if (loadable.is(value)) { ... }

// Cache management namespace methods
const l = loadable.get(promise);
loadable.set(promise, l);
```

## API Changes

### 1. **Main Function: `loadable(value)`**

The primary `loadable()` function now normalizes any value to a Loadable:

```typescript
// Promise → LoadingLoadable
const l1 = loadable(fetchUser());
// { status: "loading", promise, ... }

// Plain value → SuccessLoadable
const l2 = loadable({ id: 1, name: "Alice" });
// { status: "success", value: { id: 1, name: "Alice" }, ... }

// Already loadable → returns as-is
const l3 = loadable(l1);
// l3 === l1 (same reference)
```

**Type Inference:**

```typescript
const promise = Promise.resolve(42);
const l = loadable(promise);
// Type: Loadable<number>

const data = { id: 1 };
const l2 = loadable(data);
// Type: Loadable<{ id: number }>
```

### 2. **Namespace Methods**

All factory and helper functions are now under the `loadable` namespace:

#### **Factory Methods**

```typescript
// Create loading loadable
loadable.loading<T>(promise: PromiseLike<T>): LoadingLoadable<T>

// Create success loadable  
loadable.success<T>(value: T, promise?: PromiseLike<T>): SuccessLoadable<T>

// Create error loadable
loadable.error<T>(error: unknown, promise?: PromiseLike<T>): ErrorLoadable<T>
```

#### **Type Guard**

```typescript
// Check if value is a loadable
loadable.is<T>(value: unknown): value is Loadable<T>

// Example
if (loadable.is<User>(value)) {
  console.log(value.status); // Type-safe
}
```

#### **Cache Management**

```typescript
// Get or create loadable for promise
loadable.get<T>(promise: PromiseLike<T>): Loadable<T>

// Set loadable for promise
loadable.set<T>(promise: PromiseLike<T>, l: Loadable<T>): Loadable<T>
```

### 3. **Removed Exports**

The following standalone functions have been **removed**:

- ❌ `isLoadable()` → Use `loadable.is()`
- ❌ `getLoadable()` → Use `loadable.get()`
- ❌ `setLoadable()` → Use `loadable.set()`
- ❌ `toLoadable()` → Use `loadable()`

## Migration Steps

### Step 1: Update Imports

```typescript
// Before
import { loadable, isLoadable, getLoadable, setLoadable, toLoadable } from "rextive";

// After
import { loadable } from "rextive";
```

### Step 2: Update Factory Calls

```typescript
// Before
const l1 = loadable("loading", promise);
const l2 = loadable("success", data);
const l3 = loadable("error", err);

// After
const l1 = loadable.loading(promise);
const l2 = loadable.success(data);
const l3 = loadable.error(err);
```

### Step 3: Update Type Guards

```typescript
// Before
if (isLoadable(value)) { ... }

// After
if (loadable.is(value)) { ... }
```

### Step 4: Update Cache Functions

```typescript
// Before
const l = getLoadable(promise);
setLoadable(promise, l);

// After
const l = loadable.get(promise);
loadable.set(promise, l);
```

### Step 5: Update Normalization

```typescript
// Before
const normalized = toLoadable(value);

// After
const normalized = loadable(value);
```

## Benefits of New API

### 1. **Better Discoverability**

All loadable-related functionality is under one namespace:

```typescript
import { loadable } from "rextive";

loadable.           // IDE autocomplete shows all methods:
  // - loading()
  // - success()
  // - error()
  // - is()
  // - get()
  // - set()
```

### 2. **Cleaner Imports**

```typescript
// Before: 5+ imports
import { loadable, isLoadable, getLoadable, setLoadable, toLoadable } from "rextive";

// After: 1 import
import { loadable } from "rextive";
```

### 3. **More Intuitive Primary Function**

The main `loadable()` function does what you expect - converts any value to a loadable:

```typescript
// Automatic "do what I mean" behavior
const l1 = loadable(promise);      // Loading
const l2 = loadable(data);         // Success
const l3 = loadable(existingL);    // Pass-through
```

### 4. **Consistent with Modern APIs**

Follows patterns from popular libraries:
- React: `React.useState()`, `React.useEffect()`
- RxJS: `rx.of()`, `rx.from()`
- Lodash: `_.map()`, `_.filter()`

## Examples

### Creating Loadables

```typescript
// Explicit creation
const loading = loadable.loading(fetchUser());
const success = loadable.success({ id: 1, name: "Alice" });
const error = loadable.error(new Error("Failed"));

// Automatic normalization
const l1 = loadable(Promise.resolve(42));        // LoadingLoadable<number>
const l2 = loadable({ id: 1 });                  // SuccessLoadable<{ id: number }>
const l3 = loadable(loadable.success(42));       // SuccessLoadable<number> (same reference)
```

### Type Guards

```typescript
function handleValue(value: unknown) {
  if (loadable.is<User>(value)) {
    switch (value.status) {
      case "loading":
        return <Spinner />;
      case "success":
        return <UserCard user={value.value} />;
      case "error":
        return <Error error={value.error} />;
    }
  }
  return <div>Not a loadable</div>;
}
```

### Cache Management

```typescript
// Fetch with caching
async function fetchWithCache(url: string) {
  const promise = fetch(url).then(r => r.json());
  
  // Get or create loadable
  const l = loadable.get(promise);
  
  if (l.status === "loading") {
    const data = await l.promise;
    // Cache is automatically updated
  }
  
  return l;
}
```

### Integration with wait()

```typescript
import { wait, loadable } from "rextive";

// wait() uses loadable() internally
const user = loadable(fetchUser());
const posts = loadable(fetchPosts());

// Suspense-style
const [userData, postsData] = wait([user, posts]);

// Promise-style
await wait([user, posts], (u, p) => {
  console.log(u, p);
});
```

## Automated Migration

If you have a large codebase, you can use find-and-replace:

```bash
# Replace factory calls
sed -i 's/loadable("loading",/loadable.loading(/g' **/*.ts
sed -i 's/loadable("success",/loadable.success(/g' **/*.ts
sed -i 's/loadable("error",/loadable.error(/g' **/*.ts

# Replace type guard
sed -i 's/isLoadable(/loadable.is(/g' **/*.ts

# Replace cache functions
sed -i 's/getLoadable(/loadable.get(/g' **/*.ts
sed -i 's/setLoadable(/loadable.set(/g' **/*.ts

# Replace normalization
sed -i 's/toLoadable(/loadable(/g' **/*.ts
```

## Type Compatibility

The underlying types (`Loadable<T>`, `LoadingLoadable<T>`, `SuccessLoadable<T>`, `ErrorLoadable<T>`) remain unchanged, so existing type annotations work without modification.

## Questions?

If you have questions about the migration, please refer to:
- API Reference: `docs/api-reference.md`
- Examples: `examples/`
- Tests: `src/utils/loadable.test.ts`

