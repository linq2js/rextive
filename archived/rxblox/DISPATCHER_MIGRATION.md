# Dispatcher System Migration Guide

## Overview

The old `contextToken`/`contextDispatcher` pattern has been replaced with a unified dispatcher system that uses `contextType` metadata in `withDispatchers` options.

## Benefits of New System

✅ **Unified approach**: Single `getContextType()` function instead of multiple tokens  
✅ **Type-safe**: `ContextType` union provides IDE autocomplete  
✅ **Simpler API**: Context type is metadata, not a separate dispatcher  
✅ **Less boilerplate**: No need to create and pass context dispatchers  
✅ **Better organization**: Context type lives alongside dispatchers, not separately

## Migration Examples

### Checking Context Type

**Old way:**
```typescript
import { getDispatcher } from "./dispatcher";
import { contextToken } from "./contextDispatcher";

const context = getDispatcher(contextToken);
if (context?.type !== "blox") {
  throw new Error("Must be called inside a blox component");
}
```

**New way:**
```typescript
import { getContextType } from "./dispatcher";

const contextType = getContextType();
if (contextType !== "blox") {
  throw new Error("Must be called inside a blox component");
}
```

### Setting Context Type

**Old way:**
```typescript
import { withDispatchers } from "./dispatcher";
import { contextToken, contextDispatcher } from "./contextDispatcher";

withDispatchers(
  [
    contextToken(contextDispatcher("blox")),
    otherToken(otherDispatcher),
  ],
  fn
);
```

**New way:**
```typescript
import { withDispatchers } from "./dispatcher";

withDispatchers(
  [otherToken(otherDispatcher)],
  fn,
  { contextType: "blox" }
);
```

## Available Context Types

```typescript
type ContextType = "blox" | "effect" | "slot" | "signal" | "batch";
```

## Updated Files

- `src/dispatcher.ts`: Added `getContextType()` and `contextType` option
- `src/blox.ts`: Removed `contextToken`/`contextDispatcher` usage
- `src/slot.ts`: Uses `getContextType()` instead of `contextToken`
- `src/handle.ts`: Uses `getContextType()` instead of `contextToken`
- `src/contextDispatcher.ts`: **Deprecated** (marked with `@deprecated`)

## Deprecation Timeline

- **Current**: `contextDispatcher.ts` is marked as deprecated but still works
- **Future**: Will be removed in next major version

## Internal Implementation

The new system stores context type as metadata within the dispatcher context:

```typescript
interface DispatcherContext {
  dispatchers: Record<symbol, unknown>;  // Dispatcher registry
  contextType?: ContextType;             // Metadata about scope
}
```

This allows `getContextType()` to retrieve the current scope type without needing a separate dispatcher token.

