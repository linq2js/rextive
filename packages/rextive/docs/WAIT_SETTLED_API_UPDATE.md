# wait.settled() API Update

## Summary

Updated `wait.settled()` to have a consistent API pattern and clearer semantics around error handling.

## Changes Made

### 1. **Callback Parameter Renamed**
- **Before**: `onResolve` and optional `onError` parameters
- **After**: Single `onSettled` parameter
- **Reason**: `wait.settled()` never rejects, so `onError` doesn't make semantic sense. The settled results already contain error information as `{ status: "rejected", reason }`.

### 2. **Function Signature Updates**

#### Before:
```typescript
export function waitSettled<R, E = never>(
  awaitable: Awaitable<any>,
  onResolve: (result: PromiseSettledResult<any>) => R | PromiseLike<R>,
  onError?: (error: unknown) => E | PromiseLike<E>
): Promise<Awaited<R | E>>;
```

#### After:
```typescript
export function waitSettled<R>(
  awaitable: Awaitable<any>,
  onSettled: (result: PromiseSettledResult<any>) => R | PromiseLike<R>
): Promise<Awaited<R>>;
```

### 3. **Implementation Fixed**

#### Before (Broken):
```typescript
// waitSettledAsync didn't accept onResolve/onError parameters
async function waitSettledAsync(awaitableOrCollection: any): Promise<any> {
  // ... implementation
  return result; // No callback handling
}

// Main function chained .then/.catch incorrectly
const promise = waitSettledAsync(awaitableOrCollection)
  .then((result) => (onResolve ? onResolve(result) : result))
  .catch((error) => {
    if (!onError) throw error;
    return onError(error);
  });
```

#### After (Fixed):
```typescript
// waitSettledAsync now accepts and handles onSettled callback
async function waitSettledAsync(
  awaitableOrCollection: any,
  onSettled?: any
): Promise<any> {
  // ... implementation
  return onSettled ? await onSettled(result) : result;
}

// Main function passes callback directly
const promise = waitSettledAsync(awaitableOrCollection, onSettled);
```

## API Behavior

### Synchronous Mode (No Callback)
```typescript
// Throws promises while loading (Suspense-compatible)
// Never throws errors - errors become { status: "rejected", reason }
const results = wait.settled([promise1, promise2]);
// Results: [
//   { status: "fulfilled", value: ... } | { status: "rejected", reason: ... },
//   { status: "fulfilled", value: ... } | { status: "rejected", reason: ... }
// ]
```

### Async Mode (With Callback)
```typescript
// Always resolves (never rejects)
// Callback receives PromiseSettledResult shapes
const data = await wait.settled([p1, p2, p3], (results) => {
  // Transform settled results however you want
  return results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);
});
```

## Key Differences from Other wait APIs

| API | Throws Promises (loading)? | Throws Errors (failed)? | Use Case |
|-----|---------------------------|------------------------|----------|
| `wait()` / `wait.all()` | ✅ Yes | ✅ Yes - if ANY fails | All-or-nothing, need all to succeed |
| `wait.any()` | ✅ Yes | ✅ Yes - if ALL fail | First success wins |
| `wait.race()` | ✅ Yes | ✅ Yes - if first is error | First completion wins |
| `wait.settled()` | ✅ Yes | ❌ Never - captures as "rejected" | Partial failures OK, need all results |

## Use Cases for wait.settled()

1. **Graceful Degradation**: Load multiple resources, use what succeeds
2. **Validation**: Check multiple fields, collect all errors
3. **Best Effort**: Try multiple data sources, take what works
4. **Statistics**: Count successes/failures
5. **Fallback Chains**: Try primary, backup, cache in order

## Migration Guide

If you were using the old API with `onResolve`/`onError`:

### Before:
```typescript
await wait.settled(
  [p1, p2, p3],
  (results) => processResults(results),
  (error) => handleError(error) // This never ran anyway!
);
```

### After:
```typescript
await wait.settled(
  [p1, p2, p3],
  (results) => {
    // Handle both successes and failures in the callback
    const successes = results.filter(r => r.status === "fulfilled");
    const failures = results.filter(r => r.status === "rejected");
    return processResults(successes, failures);
  }
);
```

## Documentation Updates

1. ✅ Updated `wait.ts` header comments
2. ✅ Updated `wait.settled()` JSDoc with comprehensive examples
3. ✅ Updated `README.md` with correct usage
4. ✅ Updated `wait.test.ts` to test new API
5. ✅ Created `examples/wait-settled-example.tsx` with real-world patterns

## Testing

All 65 tests in `wait.test.ts` pass, including:
- Synchronous mode tests
- Async mode tests  
- Single awaitable, arrays, and records
- Error handling (errors become "rejected" status)
- Transform callbacks
- Edge cases

## Related Files

- `/packages/rextive/src/wait.ts` - Main implementation
- `/packages/rextive/src/wait.test.ts` - Comprehensive tests
- `/packages/rextive/src/wait.type.check.ts` - Type safety checks
- `/packages/rextive/README.md` - User-facing documentation
- `/packages/rextive/examples/wait-settled-example.tsx` - Example patterns

