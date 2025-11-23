# Signal Persistence API

## Overview

The signal persistence API enables automatic saving and loading of signal values to/from storage. The architecture follows a clean separation of concerns:

- **Signal**: Manages state and tracks persistence status
- **Persistor**: Minimal I/O interface for storage operations
- **User Implementation**: Custom persistors for specific needs

## Architecture

### Status Flow

```
IDLE (initial)
  ↓
  ├─ get() success → SYNCED
  ├─ get() throws → READ-FAILED
  │
  └─ set() called:
      ├─ set() success → SYNCED
      └─ set() throws → WRITE-FAILED

SYNCED
  ↓
  └─ set() called:
      ├─ set() success → SYNCED
      └─ set() throws → WRITE-FAILED

READ-FAILED
  ↓
  └─ set() called:
      ├─ set() success → SYNCED (recovered!)
      └─ set() throws → WRITE-FAILED

WRITE-FAILED
  ↓
  └─ set() called:
      ├─ set() success → SYNCED (recovered!)
      └─ set() throws → WRITE-FAILED
```

### Key Features

1. **Minimal Persistor Interface**
   - Just `get()`, `set()`, and optional `on()` methods
   - Persistors throw errors on failure
   - No status tracking in persistor

2. **Reactive `persistInfo` Property**
   - Automatically tracks as dependency in reactive contexts (`rx`, `effect`, computed signals)
   - Natural API: `count.persistInfo.status` (no function call)
   - Transparent reactivity: Looks like plain object, behaves reactively
   - UI automatically updates when persistence status changes
   - Tracks `promise` field for async operations

3. **Signal-Level Status Tracking**
   - `persistInfo.status`: Current operation status
   - `persistInfo.error`: Last error (if any)
   - `persistInfo.promise`: Current async operation (for race condition detection)
   - Single source of truth

4. **Zero-Flicker Synchronous Hydration**
   - Synchronous persistors apply values immediately
   - Async persistors handled in microtask
   - No unnecessary UI flicker on initial render

5. **Race Condition Handling**
   - Tracks current promise to handle concurrent operations correctly
   - If multiple writes occur, only the latest write's result updates status
   - Prevents stale operations from overwriting correct status
   - Works for both writes and hydration (e.g., cross-tab sync)

6. **Dirty Tracking**
   - Prevents hydration from overwriting user changes
   - If value is modified before hydration completes, hydrated value is ignored

7. **Custom Equality**
   - Respects signal's `equals` option during hydration
   - Prevents unnecessary updates and emissions

## Types

```typescript
interface Persistor<T> {
  /**
   * Retrieves the persisted value from storage.
   * @returns Object with `value` property if found, `null` if no value stored
   * @throws Error if read operation fails
   */
  get(): { value: T } | null | Promise<{ value: T } | null>;

  /**
   * Saves a value to persistent storage.
   * @param value - The value to persist
   * @throws Error if write operation fails
   */
  set(value: T): void | Promise<void>;

  /**
   * Optional: Subscribe to external storage changes (e.g., from other tabs).
   * @param callback - Function to call when storage changes externally
   * @returns Unsubscribe function
   */
  on?(callback: VoidFunction): VoidFunction;
}

type PersistStatus =
  | "idle"          // No persist operation yet
  | "reading"       // Currently loading from storage
  | "read-failed"   // Failed to load (get() threw)
  | "writing"       // Currently saving to storage
  | "write-failed"  // Failed to save (set() threw)
  | "synced";       // Value is up-to-date with storage

type PersistInfo = {
  status: PersistStatus;
  error?: unknown;  // Last error from read or write operation
};
```

## Usage

### Basic Example

```typescript
// 1. Create a persistor
function createLocalStoragePersistor<T>(
  key: string,
  debounceMs = 0
): Persistor<T> {
  const setDebounced = debounceMs > 0
    ? debounce((val: T) => localStorage.setItem(key, JSON.stringify(val)), debounceMs)
    : (val: T) => localStorage.setItem(key, JSON.stringify(val));

  return {
    get() {
      const item = localStorage.getItem(key);
      return item ? { value: JSON.parse(item) } : null;
    },
    set(value) {
      setDebounced(value);
    },
    on(callback) {
      const handler = (e: StorageEvent) => {
        if (e.key === key) callback();
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    }
  };
}

// 2. Use with signal
const count = signal(0, {
  persist: createLocalStoragePersistor('count', 300)
});

// 3. Check persistence status
count.persistInfo.status; // "idle" | "reading" | "synced" | "read-failed" | "write-failed"
count.persistInfo.error;  // Error if failed
```

### Advanced Examples

#### With Custom Serialization

```typescript
function createLocalStoragePersistor<T>(
  key: string,
  options: {
    debounce?: number;
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  } = {}
): Persistor<T> {
  const {
    debounce: debounceMs = 0,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const setImmediate = (value: T): void => {
    try {
      const serialized = serialize(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      throw new Error(`Failed to save to localStorage (key: ${key}): ${error}`);
    }
  };

  const set = debounceMs > 0 
    ? debounce(setImmediate, debounceMs) 
    : setImmediate;

  return {
    get() {
      try {
        const item = localStorage.getItem(key);
        if (item === null) return null;
        return { value: deserialize(item) };
      } catch (error) {
        throw new Error(`Failed to load from localStorage (key: ${key}): ${error}`);
      }
    },
    set(value) {
      set(value);
    },
    on(callback) {
      const handler = (event: StorageEvent) => {
        if (event.key === key && event.storageArea === localStorage) {
          callback();
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}

// Usage with Date serialization
const lastVisit = signal(new Date(), {
  persist: createLocalStoragePersistor('lastVisit', {
    serialize: (d) => d.toISOString(),
    deserialize: (s) => new Date(s),
    debounce: 1000
  })
});
```

#### Memory Storage (for testing)

```typescript
const storage = new Map<string, string>();
const listeners = new Map<string, Set<VoidFunction>>();

function createMemoryPersistor<T>(key: string): Persistor<T> {
  return {
    get() {
      const item = storage.get(key);
      return item ? { value: JSON.parse(item) } : null;
    },
    set(value) {
      storage.set(key, JSON.stringify(value));
      listeners.get(key)?.forEach(cb => cb());
    },
    on(callback) {
      if (!listeners.has(key)) {
        listeners.set(key, new Set());
      }
      listeners.get(key)!.add(callback);
      return () => listeners.get(key)?.delete(callback);
    }
  };
}
```

### Reactive `persistInfo`

The `persistInfo` property is **automatically reactive** using a getter-based approach. When accessed within a reactive context (`rx()`, `effect()`, computed signals), it automatically tracks as a dependency and triggers updates when the persistence status changes.

#### How It Works

```typescript
// Natural API - looks like a plain property
const count = signal(0, { persist: persistor });

// In reactive contexts - automatically tracks
rx(() => {
  count.persistInfo.status; // ✅ Tracks dependencies
  // UI updates when status changes
});

// Outside reactive contexts - just returns value
const status = count.persistInfo.status; // ❌ No tracking
```

**Key Benefits:**
- ✅ **Natural API**: `count.persistInfo.status` (no function call needed)
- ✅ **Automatic Tracking**: Integrates seamlessly with rxblox reactivity
- ✅ **Transparent Reactivity**: Looks like plain object, behaves reactively
- ✅ **Performance**: Only triggers updates when status/error actually changes

#### Examples

```tsx
// Reactive in computed signals
const statusMessage = signal(() => {
  const status = count.persistInfo.status;
  return status === "reading" ? "Loading..."
       : status === "writing" ? "Saving..."
       : status === "synced" ? "Saved"
       : "Error";
});
// Automatically recomputes when persist status changes

// Reactive in effects
effect(() => {
  console.log("Status changed:", count.persistInfo.status);
  
  if (count.persistInfo.status === "write-failed") {
    errorTracker.log(count.persistInfo.error);
  }
});
// Re-runs whenever status changes

// Conditional tracking
const showDebug = signal(false);
rx(() => {
  if (showDebug()) {
    return <div>Status: {count.persistInfo.status}</div>;
  }
  return <div>Hidden</div>;
});
// Only tracks persistInfo when showDebug is true
```

### UI Patterns

#### Loading Indicator

```tsx
const UserProfile = blox(() => {
  const profile = signal({ name: '', email: '' }, {
    persist: createLocalStoragePersistor('profile')
  });

  return rx(() => {
    if (profile.persistInfo.status === "reading") {
      return <Skeleton />;
    }

    return (
      <div>
        <h1>{profile().name}</h1>
        <p>{profile().email}</p>
      </div>
    );
  });
});
```

#### Error Feedback

```tsx
const SaveIndicator = blox(() => {
  const count = signal(0, {
    persist: createLocalStoragePersistor('count', { debounce: 300 })
  });

  return rx(() => (
    <div>
      <input
        type="number"
        value={count()}
        onChange={(e) => count.set(Number(e.target.value))}
      />
      
      {count.persistInfo.status === "writing" && <Spinner />}
      {count.persistInfo.status === "synced" && <CheckIcon />}
      {count.persistInfo.status === "write-failed" && (
        <ErrorTooltip>
          Failed to save: {String(count.persistInfo.error)}
        </ErrorTooltip>
      )}
    </div>
  ));
});
```

#### Retry on Error

```tsx
const count = signal(0, {
  persist: createLocalStoragePersistor('count')
});

effect(() => {
  if (count.persistInfo.status === "write-failed") {
    // Retry after 5 seconds
    setTimeout(() => {
      count.set(count.peek()); // Trigger a re-save
    }, 5000);
  }
});
```

### Race Condition Handling

The persistence system properly handles concurrent operations to prevent stale results from overwriting correct status:

#### Problem: Concurrent Writes

```typescript
const count = signal(0, { persist: slowPersistor });

// User rapidly changes value
count.set(1); // Write 1 starts (takes 100ms)
count.set(2); // Write 2 starts (takes 50ms)

// Without race condition handling:
// - Write 2 completes first → status: "synced" ✅
// - Write 1 completes later → status: "synced" (wrong! value is 2, not 1)

// With race condition handling:
// - Write 2 completes first → status: "synced" ✅
// - Write 1 completes later → ignored (stale promise) ✅
```

#### Solution: Promise Tracking

Each async operation's promise is tracked in `persistInfo.promise`:

```typescript
// When starting an async operation
setPersistInfo("writing", undefined, promise);

// When the promise completes
result.then(() => {
  // Only update status if this is still the current promise
  if (persistInfo.promise === result) {
    setPersistInfo("synced");
  }
});
```

**Key behaviors:**
- ✅ Tracks the latest promise for each operation type
- ✅ Ignores stale promise results
- ✅ Prevents errors from old operations from showing
- ✅ Works for both writes and hydration
- ✅ Handles rapid successive operations correctly

#### Examples

**Concurrent Writes:**
```typescript
const count = signal(0, { persist: persistor });

count.set(1); // Promise A (slow)
count.set(2); // Promise B (fast) ← becomes current

// Promise B completes → status: "synced" ✅
// Promise A completes → ignored (not current promise)
```

**Write Failure After Success:**
```typescript
count.set(1); // Promise A (will fail after 100ms)
count.set(2); // Promise B (will succeed after 50ms) ← becomes current

// Promise B succeeds → status: "synced", error: undefined ✅
// Promise A fails → ignored (not current promise) ✅
// Status remains "synced" with no error shown
```

**Concurrent Hydration (Cross-Tab Sync):**
```typescript
// Tab 1: Initial hydration starts
const count = signal(0, { persist: persistor }); // Promise A (slow)

// Tab 2: Updates storage, triggers re-hydration
// → Promise B starts (fast) ← becomes current

// Promise B completes → value: 20, status: "synced" ✅
// Promise A completes → ignored (not current promise)
```

## Implementation Details

### Hydration Process

1. **Signal Creation**: Status is `"idle"`
2. **Hydration Starts**: Status changes to `"reading"`, calls `persistor.get()`
3. **Result Handling**:
   - **Synchronous Result**: Applied immediately (zero flicker!)
   - **Async Result (Promise)**: Applied in microtask
4. **Success**: 
   - If not dirty: Apply hydrated value (respecting custom equality)
   - If dirty: Keep current value
   - Status changes to `"synced"`
5. **Failure**: 
   - Keep initial/current value
   - Status changes to `"read-failed"`
   - Error stored in `persistInfo.error`

#### Zero-Flicker Synchronous Hydration

The implementation detects whether `persistor.get()` returns a Promise or a value:

```typescript
const result = persistor.get();

if (result instanceof Promise) {
  // Async: handle in microtask
  result.then(applyHydratedValue);
} else {
  // Sync: apply immediately (no flicker!)
  applyHydratedValue(result);
}
```

**Benefits:**
- Synchronous persistors (e.g., in-memory, sessionStorage) apply values immediately
- No UI flicker on initial render
- First paint shows correct persisted value
- Async persistors still work correctly (IndexedDB, network, etc.)

### Write Process

1. **Value Changes**: Call `signal.set(newValue)`
2. **Status Update**: Status changes to `"writing"`
3. **Persist**: Call `persistor.set(newValue)` asynchronously
4. **Success**: Status changes to `"synced"`, error cleared
5. **Failure**: Status changes to `"write-failed"`, error stored

### Dirty Tracking

- Tracks if signal value was modified before hydration completes
- If dirty, hydrated value is ignored
- Prevents race conditions between user input and storage load

### External Changes

- If persistor provides `on()` method, signal subscribes to external changes
- On notification, re-runs hydration process
- Useful for cross-tab synchronization

## Testing

The implementation includes comprehensive tests covering:

- **Basic hydration**: Sync and async persistors
- **Zero-flicker behavior**: Sync values applied immediately
- **Read errors**: Sync and async error handling
- **Write operations**: Sync and async writes, error recovery
- **Dirty tracking**: Race conditions between user input and hydration
- **External change notifications**: Cross-tab synchronization
- **Custom equality**: Preventing unnecessary updates
- **Reactive persistInfo**: Automatic tracking in rx(), effect(), computed signals
- **Conditional tracking**: Only tracks when accessed in reactive context
- **Multiple contexts**: Multiple effects tracking same persistInfo simultaneously
- **Race condition handling**:
  - Concurrent write operations (slow write after fast write)
  - Write failure after successful write
  - Concurrent hydration via storage events
  - Rapid successive writes
  - Promise tracking in persistInfo
- **Integration**: Computed signals, listeners

All 31 persistence tests pass, along with 554 other tests in the library (585 total).

### Example Test Cases

```typescript
// Zero-flicker sync hydration
it("should apply sync persistor value immediately (no flicker)", () => {
  const persistor: Persistor<number> = {
    get: () => ({ value: 100 }),
    set: vi.fn(),
  };

  const count = signal(0, { persist: persistor });

  // Value is hydrated synchronously before any renders (no flicker!)
  expect(count()).toBe(100);
  expect(count.persistInfo.status).toBe("synced");
});

// Async hydration
it("should handle async persistor.get()", async () => {
  const persistor: Persistor<number> = {
    get: async () => {
      await delay(50);
      return { value: 100 };
    },
    set: vi.fn(),
  };

  const count = signal(0, { persist: persistor });

  // Status is reading during async operation
  await delay(10);
  expect(count.persistInfo.status).toBe("reading");

  // Value applied after resolution
  await delay(60);
  expect(count()).toBe(100);
  expect(count.persistInfo.status).toBe("synced");
});
```

## Design Decisions

### Why Persistor Throws Instead of Returning Status?

- **Simpler Persistor API**: Persistors focus on I/O, not status management
- **Standard Practice**: Throwing on error is idiomatic JavaScript
- **Signal Handles Complexity**: Signal tracks status, error, and recovery
- **Better Separation**: Clear boundary between persistor and signal responsibilities

### Why `{ value: T }` Instead of `T` for `get()`?

- **Explicit Null Handling**: Distinguishes "no value" (`null`) from "value is null/undefined"
- **Future Extensibility**: Can add metadata like `version`, `timestamp` later
- **Type Safety**: Clear contract that return value is wrapped

### Why Status at Signal Level?

- **Single Source of Truth**: One place to check persistence state
- **Reactive**: UI can react to status changes
- **Complete Information**: Includes both read and write status
- **Recovery Tracking**: Can detect when errors are resolved

## Future Enhancements

Potential improvements (not currently implemented):

- **Retry Logic**: Automatic retry with exponential backoff
- **Batching**: Combine multiple signal updates into one write
- **Versioning**: Handle schema changes and migrations
- **Compression**: Automatic compression for large values
- **Encryption**: Built-in encryption support
- **Sync Status**: More granular status (e.g., "syncing", "conflict")

These are intentionally left to user implementation for maximum flexibility.

