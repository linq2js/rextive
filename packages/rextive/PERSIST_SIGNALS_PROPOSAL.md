# persistSignals API Proposal

## Current Concept

```ts
const { cancel, pause } = persistSignals({ s1, s2, s3 }, {
  load?: () => Partial<TSignals> | Promise<Partial<TSignals>>,
  save?: (values) => void,
  onError?: () => {}
})
```

## Review & Suggestions

### ✅ Strengths
1. **Batch operations** - Single load/save for multiple signals
2. **Simple API** - Good for common localStorage use cases
3. **Control functions** - `cancel` and `pause` provide flexibility
4. **Error handling** - Centralized via `onError`

### 🤔 Questions & Considerations

#### 1. **Naming**
- `persistSignals` ✅ Good, clear intent
- Alternative: `createPersistedSignals` (more explicit about creation)
- Alternative: `persist` (shorter, but less clear)

#### 2. **Return Value**
Current: `{ cancel, pause }`

**Questions:**
- What does `cancel` do? Stop persisting? Clear persisted data?
- What does `pause` do? Temporarily stop saving?
- Should there be a `resume()` function?
- Should it return the signals themselves?

**Suggestion:**
```ts
const { signals, cancel, pause, resume, clear } = persistSignals(...)
// or
const persisted = persistSignals(...)
persisted.cancel()
persisted.pause()
persisted.resume()
persisted.clear() // Clear persisted data
```

#### 3. **Load Function**
Current: `load?: () => Partial<TSignals> | Promise<Partial<TSignals>>`

**Issues:**
- `Partial<TSignals>` means some signals might not be loaded
- No way to know which signals were loaded vs not
- Should it accept the signal map as parameter for type safety?

**Suggestions:**

**Option A: Explicit signal map**
```ts
load?: (signals: TSignals) => Partial<Record<keyof TSignals, any>> | Promise<...>
```

**Option B: Return full map with nulls**
```ts
load?: () => Record<keyof TSignals, any | null> | Promise<...>
```

**Option C: Return values object**
```ts
load?: () => { [K in keyof TSignals]?: TSignals[K] extends Signal<infer T> ? T : never } | Promise<...>
```

#### 4. **Save Function**
Current: `save?: (values) => void`

**Issues:**
- Should `save` be async? (localStorage is sync, but IndexedDB/API calls are async)
- What type is `values`? Should it be typed?
- Should it receive the signal map too?

**Suggestions:**
```ts
save?: (values: Record<keyof TSignals, any>) => void | Promise<void>
// or
save?: (signals: TSignals, values: Record<keyof TSignals, any>) => void | Promise<void>
```

#### 5. **Auto-load & Auto-save**
**Questions:**
- Should it auto-load on initialization? (probably yes)
- Should it auto-save on signal changes? (probably yes, with debouncing?)
- Should there be options to control this?

**Suggestion:**
```ts
persistSignals({ s1, s2, s3 }, {
  load: ...,
  save: ...,
  autoLoad?: boolean, // default: true
  autoSave?: boolean, // default: true
  debounceMs?: number, // default: 300
})
```

#### 6. **Error Handling**
Current: `onError?: () => {}`

**Issues:**
- No error parameter?
- Should it handle load errors vs save errors differently?
- Should errors prevent signal updates?

**Suggestion:**
```ts
onError?: (error: unknown, operation: 'load' | 'save') => void
// or separate callbacks
onLoadError?: (error: unknown) => void
onSaveError?: (error: unknown) => void
```

#### 7. **Integration with useScope**
Should it work seamlessly with `useScope`?

```ts
const scope = useScope(() => {
  const { signals } = persistSignals({ count: signal(0) }, { ... });
  return signals;
});
```

## Final API Design

```ts
type PersistSignalsOptions<TSignals extends SignalMap> = {
  // Load persisted values
  // Returns partial map of signal values (only loaded signals included)
  load?: () => 
    | Partial<Record<keyof TSignals, any>>
    | Promise<Partial<Record<keyof TSignals, any>>>;
  
  // Save current values
  // Called whenever any signal changes (calling site handles debouncing)
  save?: (values: Record<keyof TSignals, any>) => void;
  
  // Error handling - fires for both load and save errors
  // Use `type` to determine which operation failed
  onError?: (error: unknown, type: 'load' | 'save') => void;
  
  // Behavior options
  autoStart?: boolean; // default: true - start persistence immediately
};

type PersistorStatus = 
  | 'idle'      // Not started yet, or cancelled
  | 'loading'   // Currently loading initial data
  | 'watching'  // Actively saving changes
  | 'paused';   // Temporarily not saving (but subscribed)

type PersistSignalsResult<TSignals extends SignalMap> = {
  // The signals themselves (same reference)
  signals: TSignals;
  
  // Control functions
  start: () => void; // Start persistence (load + subscribe to signals)
  cancel: () => void; // Stop all persistence (unsubscribe from signals)
  pause: () => void; // Temporarily stop saving (stores latest state)
  resume: () => void; // Resume saving (saves latest state if paused)
  
  // Status - single state machine
  status: () => PersistorStatus;
};

function persistSignals<TSignals extends SignalMap>(
  signals: TSignals,
  options?: PersistSignalsOptions<TSignals>
): PersistSignalsResult<TSignals>;
```

### Key Design Decisions

1. **Single state machine** - Use one `status` field instead of multiple booleans for clarity
   ```
          ┌─────────┐
     ┌────│  idle   │◄─────────┐
     │    └─────────┘          │
     │         │              cancel()
   start()     │                │
     │         ▼                │
     │    ┌─────────┐          │
     └───►│ loading │          │
          └─────────┘          │
               │               │
         load done             │
               │               │
               ▼               │
          ┌─────────┐          │
      ┌──►│watching │──────────┤
      │   └─────────┘          │
      │        │               │
   resume()  pause()           │
      │        │               │
      │        ▼               │
      │   ┌─────────┐          │
      └───│ paused  │──────────┘
          └─────────┘
   ```

2. **Sync/async handling** - Sync loads apply immediately (no flicker), async loads use loading state
3. **No internal debouncing** - Calling site handles debouncing (e.g., with lodash)
4. **pause/resume behavior** - During `pause()`, store latest state. On `resume()`, save that state
5. **No clear()** - We don't handle storage, so no need for clear function
6. **save is void** - We don't await save operations, so `void` is sufficient
7. **onError with type** - Single callback with `type: 'load' | 'save'` parameter
8. **start() API** - Allows manual control over when persistence begins
   - If `autoStart: false`, don't load or subscribe until `start()` is called
   - After `cancel()`, can call `start()` again to restart
   - Useful for conditional persistence, lazy initialization, testing


## Usage Examples

### Example 1: localStorage with debouncing
```ts
import { debounce } from 'lodash-es';

const { signals } = persistSignals(
  { count: signal(0), name: signal("") },
  {
    load: () => {
      const stored = localStorage.getItem("my-app-state");
      return stored ? JSON.parse(stored) : {};
    },
    save: debounce((values) => {
      localStorage.setItem("my-app-state", JSON.stringify(values));
    }, 300),
    onError: (error, type) => {
      console.error(`Failed to ${type}:`, error);
    }
  }
);

// signals.count and signals.name are automatically persisted
```

### Example 2: Custom storage with pause/resume
```ts
import { debounce } from 'lodash-es';

const { signals, pause, resume } = persistSignals(
  { user: signal(null), settings: signal({}) },
  {
    load: async () => {
      const data = await fetch("/api/user-state").then(r => r.json());
      return { user: data.user, settings: data.settings };
    },
    save: debounce((values) => {
      fetch("/api/user-state", {
        method: "POST",
        body: JSON.stringify(values)
      }).catch(error => {
        // Handle error in onError callback
        throw error;
      });
    }, 500),
    onError: (error, type) => {
      if (type === 'save') {
        // Show toast notification for save errors
        showToast("Failed to save changes");
      }
      console.error(`Failed to ${type}:`, error);
    }
  }
);

// Pause saving during bulk operations
pause();
signals.user.set(newUser);
signals.settings.set(newSettings);
resume(); // Saves latest state immediately
```

### Example 3: Conditional persistence with start()
```ts
import { debounce } from 'lodash-es';

const { signals, start } = persistSignals(
  { user: signal(null), settings: signal({}) },
  {
    autoStart: false, // Don't start automatically
    load: () => {
      const stored = localStorage.getItem("user-state");
      return stored ? JSON.parse(stored) : {};
    },
    save: debounce((values) => {
      localStorage.setItem("user-state", JSON.stringify(values));
    }, 300)
  }
);

// Start persistence only when user is logged in
if (isLoggedIn) {
  start();
}
```

### Example 4: Restart after cancel
```ts
const { signals, start, cancel } = persistSignals(
  { count: signal(0) },
  { key: "count-state" }
);

// Later, stop persistence
cancel();

// Even later, restart persistence
start(); // Reloads and resumes saving
```

### Example 5: With useScope
```ts
import { debounce } from 'lodash-es';

const scope = useScope(() => {
  const { signals } = persistSignals(
    { todos: signal([]), filter: signal("all") },
    {
      load: () => {
        const stored = localStorage.getItem("todos-state");
        return stored ? JSON.parse(stored) : {};
      },
      save: debounce((values) => {
        localStorage.setItem("todos-state", JSON.stringify(values));
      }, 300)
    }
  );
  return signals;
});
```

### Example 3: With useScope
```ts
const scope = useScope(() => {
  const { signals } = persistSignals(
    { todos: signal([]), filter: signal("all") },
    { key: "todos-state" }
  );
  return signals;
});
```

## Comparison with rxblox persist API

**rxblox approach:**
- Each signal has its own `persist` option
- More granular control
- Better for individual signal persistence

**This approach:**
- Batch operations for multiple signals
- Simpler for common cases (single localStorage key)
- Centralized error handling
- Control functions for pause/resume

**Recommendation:** Both APIs can coexist:
- Use `persist` option for individual signals
- Use `persistSignals` for batch operations

## Implementation Considerations

1. **Subscription management**: 
   - **Initialization**: If `autoStart` is true (default), begin persistence immediately
   - **Timing**: Wait for async `load()` to complete before subscribing (prevents saving initial values)
   - Sync loads apply immediately, then subscribe
   - Subscribe to all signals once load completes (or immediately if no load)
   - Unsubscribe on `cancel()`
   - During `pause()`, stop calling `save()` but keep subscriptions
   - **start() behavior**: 
     - If not started, call `load()` if provided
     - For async loads: set status to 'loading', wait, then subscribe
     - For sync loads: apply values immediately, set status to 'watching', then subscribe
     - If already started, no-op
   - **cancel() behavior**: 
     - Unsubscribe from all signals
     - Reset state (can call `start()` again to restart)
   - **Rationale**: Prevents saving initial values that will be overwritten by loaded values

2. **pause/resume behavior**:
   - When `pause()` is called, store the current state of all signals
   - When `resume()` is called, if paused, call `save()` with the stored state
   - If not paused, `resume()` is a no-op

3. **Load behavior**:
   - Call `load()` on start (if provided)
   - Check if result is promise-like using `isPromiseLike()`
   - **Sync loads**: Apply values immediately in same tick (no flicker), go straight to 'watching'
   - **Async loads**: Set status to 'loading', apply when resolved, then transition to 'watching'
   - Apply loaded values to signals (only for signals that were loaded)
   - **Subscription timing**: 
     - Wait for async load to complete before subscribing to signals
     - For sync loads, subscribe immediately after applying values
     - If load fails: Subscribe immediately (don't block forever)
   - This prevents unnecessary saves of initial values that will be overwritten

4. **Save behavior**:
   - Always subscribe to signal changes (no autoSave option)
   - **Important**: Wait for async `load()` to complete before subscribing
   - For sync loads, subscribe immediately after applying values
   - On any signal change, call `save()` with current values of all signals
   - Don't await save (it's void, calling site handles async if needed)

5. **Error handling**:
   - Wrap `load()` in try/catch, call `onError(error, 'load')` on failure
   - Wrap `save()` in try/catch, call `onError(error, 'save')` on failure
   - Errors don't prevent signal updates (load errors = keep initial values)

6. **Type safety**: 
   - Ensure proper TypeScript inference for signal map
   - `values` parameter in `save` should be typed properly based on signal types
   - Use `PersistedValues<TSignals>` type for load return values

7. **Memory leaks**: 
   - Clean up subscriptions on `cancel()` using emitter pattern
   - Consider integration with `useScope` for automatic cleanup

## Subscription Timing Decision

### Why wait for load before subscribing?

**Problem without waiting:**
```ts
const { signals } = persistSignals(
  { count: signal(0), name: signal("") },
  {
    load: async () => {
      // Async load takes 100ms
      const data = await fetch("/api/state");
      return { count: 42, name: "John" };
    },
    save: (values) => { /* save to API */ }
  }
);

// Timeline:
// 0ms:   Signals created with initial values (count: 0, name: "")
// 0ms:   Subscribe immediately → triggers save({ count: 0, name: "" }) ❌
// 100ms: Load completes → applies { count: 42, name: "John" }
// 100ms: Signal change → triggers save({ count: 42, name: "John" }) ✅
```

**Solution: Wait for load**
```ts
// Timeline:
// 0ms:   Signals created with initial values (count: 0, name: "")
// 0ms:   Start loading, DON'T subscribe yet
// 100ms: Load completes → applies { count: 42, name: "John" }
// 100ms: Now subscribe → no save triggered (no changes since load)
// Future: Any changes trigger save ✅
```

**Edge cases handled:**
- If `load` is sync (localStorage): Wait is instant, no delay
- If `load` fails: Subscribe immediately (don't block forever)
- If `autoLoad` is false: Subscribe immediately
- If no `load` provided: Subscribe immediately

This ensures we only save values that the user actually set, not initial values that were overwritten by loaded data.

