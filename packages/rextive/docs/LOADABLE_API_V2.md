# Task API v2 - Breaking Changes

## Summary

The `task` API has been completely refactored to use a namespace-based design with a primary normalizer function. This is a **breaking change** that improves API consistency and discoverability.

## Migration Guide

###  Before (v1)

```typescript
import { task, isTask, getTask, setTask, toTask } from "rextive";

// Factory functions with status as first parameter
const loading = task("loading", promise);
const success = task("success", data);
const error = task("error", err);

// Type guard
if (isTask(value)) { ... }

// Cache management
const l = getTask(promise);
setTask(promise, task);

// Normalization
const normalized = toTask(value);
```

### After (v2)

```typescript
import { task } from "rextive";

// Main function: normalizes any value to task
const normalized = task.from(value);        // Automatic normalization
const normalized2 = task.from(promise);     // Wraps in loading task
const normalized3 = task.from(task);    // Returns as-is

// Namespace methods for explicit creation
const loading = task.loading(promise);
const success = task.success(data);
const error = task.error(err);

// Type guard namespace method
if (task.is(value)) { ... }

// Cache management namespace methods
const l = task.get(promise);
task.set(promise, l);
```

## API Changes

### 1. **Main Function: `task.from(value)`**

The primary `task.from()` function normalizes any value to a Task:

```typescript
// Promise → LoadingTask
const l1 = task.from(fetchUser());
// { status: "loading", promise, ... }

// Plain value → SuccessTask
const l2 = task.from({ id: 1, name: "Alice" });
// { status: "success", value: { id: 1, name: "Alice" }, ... }

// Already task → returns as-is
const l3 = task.from(l1);
// l3 === l1 (same reference)
```

**Type Inference:**

```typescript
const promise = Promise.resolve(42);
const l = task.from(promise);
// Type: Task<number>

const data = { id: 1 };
const l2 = task(data);
// Type: Task<{ id: number }>
```

### 2. **Namespace Methods**

All factory and helper functions are now under the `task` namespace:

#### **Factory Methods**

```typescript
// Create loading task
task.loading<T>(promise: PromiseLike<T>): LoadingTask<T>

// Create success task  
task.success<T>(value: T, promise?: PromiseLike<T>): SuccessTask<T>

// Create error task
task.error<T>(error: unknown, promise?: PromiseLike<T>): ErrorTask<T>
```

#### **Type Guard**

```typescript
// Check if value is a task
task.is<T>(value: unknown): value is Task<T>

// Example
if (task.is<User>(value)) {
  console.log(value.status); // Type-safe
}
```

#### **Cache Management**

```typescript
// Get or create task for promise
task.get<T>(promise: PromiseLike<T>): Task<T>

// Set task for promise
task.set<T>(promise: PromiseLike<T>, l: Task<T>): Task<T>
```

### 3. **Removed Exports**

The following standalone functions have been **removed**:

- ❌ `isTask()` → Use `task.is()`
- ❌ `getTask()` → Use `task.get()`
- ❌ `setTask()` → Use `task.set()`
- ❌ `toTask()` → Use `task.from()`

## Migration Steps

### Step 1: Update Imports

```typescript
// Before
import { task, isTask, getTask, setTask, toTask } from "rextive";

// After
import { task } from "rextive";
```

### Step 2: Update Factory Calls

```typescript
// Before
const l1 = task("loading", promise);
const l2 = task("success", data);
const l3 = task("error", err);

// After
const l1 = task.loading(promise);
const l2 = task.success(data);
const l3 = task.error(err);
```

### Step 3: Update Type Guards

```typescript
// Before
if (isTask(value)) { ... }

// After
if (task.is(value)) { ... }
```

### Step 4: Update Cache Functions

```typescript
// Before
const l = getTask(promise);
setTask(promise, l);

// After
const l = task.get(promise);
task.set(promise, l);
```

### Step 5: Update Normalization

```typescript
// Before
const normalized = toTask(value);

// After
const normalized = task.from(value);
```

## Benefits of New API

### 1. **Better Discoverability**

All task-related functionality is under one namespace:

```typescript
import { task } from "rextive";

task.           // IDE autocomplete shows all methods:
  // - from()
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
import { task, isTask, getTask, setTask, toTask } from "rextive";

// After: 1 import
import { task } from "rextive";
```

### 3. **More Intuitive Primary Function**

The main `task.from()` function does what you expect - converts any value to a task:

```typescript
// Automatic "do what I mean" behavior
const l1 = task.from(promise);      // Loading
const l2 = task.from(data);         // Success
const l3 = task.from(existingL);    // Pass-through
```

### 4. **Consistent with Modern APIs**

Follows patterns from popular libraries:
- React: `React.useState()`, `React.useEffect()`
- RxJS: `rx.of()`, `rx.from()`
- Lodash: `_.map()`, `_.filter()`

## Examples

### Creating Tasks

```typescript
// Explicit creation
const loading = task.loading(fetchUser());
const success = task.success({ id: 1, name: "Alice" });
const error = task.error(new Error("Failed"));

// Automatic normalization
const l1 = task.from(Promise.resolve(42));        // LoadingTask<number>
const l2 = task.from({ id: 1 });                  // SuccessTask<{ id: number }>
const l3 = task.from(task.success(42));       // SuccessTask<number> (same reference)
```

### Type Guards

```typescript
function handleValue(value: unknown) {
  if (task.is<User>(value)) {
    switch (value.status) {
      case "loading":
        return <Spinner />;
      case "success":
        return <UserCard user={value.value} />;
      case "error":
        return <Error error={value.error} />;
    }
  }
  return <div>Not a task</div>;
}
```

### Cache Management

```typescript
// Fetch with caching
async function fetchWithCache(url: string) {
  const promise = fetch(url).then(r => r.json());
  
  // Get or create task
  const l = task.get(promise);
  
  if (l.status === "loading") {
    const data = await l.promise;
    // Cache is automatically updated
  }
  
  return l;
}
```

### Integration with wait()

```typescript
import { wait, task } from "rextive";

// wait() uses task.from() internally
const user = task.from(fetchUser());
const posts = task.from(fetchPosts());

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
sed -i 's/task("loading",/task.loading(/g' **/*.ts
sed -i 's/task("success",/task.success(/g' **/*.ts
sed -i 's/task("error",/task.error(/g' **/*.ts

# Replace type guard
sed -i 's/isTask(/task.is(/g' **/*.ts

# Replace cache functions
sed -i 's/getTask(/task.get(/g' **/*.ts
sed -i 's/setTask(/task.set(/g' **/*.ts

# Replace normalization
sed -i 's/toTask(/task.from(/g' **/*.ts
sed -i 's/task(\([^)]*\))/task.from(\1)/g' **/*.ts
```

## Type Compatibility

The underlying types (`Task<T>`, `LoadingTask<T>`, `SuccessTask<T>`, `ErrorTask<T>`) remain unchanged, so existing type annotations work without modification.

## Questions?

If you have questions about the migration, please refer to:
- API Reference: `docs/api-reference.md`
- Examples: `examples/`
- Tests: `src/utils/task.test.ts`

