# rxblox Quick Reference for AI Assistants

**Last Updated**: 2024 | **Version**: 1.0

This is a concise reference for AI assistants helping with rxblox code. For detailed information, see the linked documentation.

---

## 🎯 What is rxblox?

Fine-grained reactive state management for React with signals, computed values, and effects.

**Philosophy**: No dependency arrays, no re-renders, automatic reactivity tracking.

---

## 📦 Core Primitives (30-Second Overview)

```typescript
// 1. Signals - reactive state
const count = signal(0);
count();           // read
count.set(1);      // write

// 2. Computed - derived state (auto-tracked)
const doubled = signal(() => count() * 2);

// 3. Effects - side effects (auto-tracked)
effect(() => {
  console.log(count()); // subscribes automatically
});

// 4. blox - reactive components (run once)
const Counter = blox(() => {
  const count = signal(0);
  return rx(() => <div>{count()}</div>); // only this updates
});

// 5. rx - fine-grained reactive UI
rx(() => <div>{count()}</div>) // updates without re-rendering parent
```

---

## 🔑 Key Rules & Constraints

### Context Restrictions

| API | Where it Works |
|-----|---------------|
| `signal()`, `effect()`, `action()` | Anywhere EXCEPT inside rx(), batch(), or computed signals |
| `blox()` | Global scope only (not nested) |
| `rx()` | Inside blox components only (can read signals, cannot create) |
| `blox.on()`, `blox.hook()`, `blox.slot()` | Inside blox components only |
| `ref()` | **Anywhere** (no restrictions) |
| `ref.ready()` | Anywhere, typically in `blox.on({ mount })` or `effect()` |

### Important Constraints

1. **No Promises in signals directly**
   ```typescript
   // ❌ DON'T
   const data = signal(fetchData()); // Promise!
   
   // ✅ DO - use signal.async()
   const data = signal.async(async () => {
     return await fetchData();
   });
   ```

2. **Signals hold immutable values**
   ```typescript
   // Use immer-style updates
   count.set(prev => prev + 1);
   state.set(prev => ({ ...prev, name: 'new' }));
   ```

3. **ref() is just a mutable container** - not signal-like, no reactivity

---

## 🏗️ Naming Conventions

Follow these patterns strictly:

```typescript
// ✅ createXXX - factories that work anywhere
function createTodoStore() { /* ... */ }

// ✅ withXXX - component utilities (blox-only, use blox.on(), etc.)
function withWebSocket(url: string) {
  blox.on({ unmount: () => ws.close() });
  // ...
}

// ✅ xxxStore - global stores
const authStore = createAuthStore();

// ❌ NEVER use useXXX - reserved for React hooks
```

---

## 📚 Common Patterns

### Global State
```typescript
// Create once, use everywhere
const todoStore = signal<Todo[]>([]);

export function addTodo(text: string) {
  todoStore.set(prev => [...prev, { id: Date.now(), text, done: false }]);
}
```

### Component-Local State
```typescript
const Counter = blox(() => {
  const count = signal(0); // local to this component
  
  return (
    <div>
      {rx(() => <span>{count()}</span>)}
      <button onClick={() => count.set(c => c + 1)}>+</button>
    </div>
  );
});
```

### Async Data
```typescript
// Pattern 1: signal.async
const user = signal.async(async () => {
  const res = await fetch('/api/user');
  return res.json();
});

// Pattern 2: loadable states
const data = signal(loadable('loading'));
fetch('/api/data')
  .then(res => data.set(loadable('success', res)))
  .catch(err => data.set(loadable('error', undefined, err)));

// Pattern 3: actions (stateful async functions)
const fetchUser = action(async (id: number) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});
// Auto-tracked: fetchUser.status, fetchUser.result, fetchUser.error
```

### Lifecycle Events
```typescript
const Component = blox(() => {
  blox.on({
    mount: () => console.log('Mounted!'),
    unmount: () => console.log('Cleanup!'),
    render: () => {
      // React hooks can be used here
      const params = useParams();
    }
  });
  
  return <div>Content</div>;
});
```

### React Hooks in blox
```typescript
const Component = blox(() => {
  // ✅ Use blox.hook() to capture React hooks
  const router = blox.hook(() => ({
    history: useHistory(),
    location: useLocation()
  }));
  
  // Access via .current
  const handleNav = () => router.current?.history.push('/home');
  
  return <button onClick={handleNav}>Navigate</button>;
});
```

### Refs (DOM or Any Value)
```typescript
const Component = blox(() => {
  const inputRef = ref<HTMLInputElement>();
  
  blox.on({
    mount: () => {
      inputRef.ready((input) => {
        input.focus(); // Type-safe, no null checking
      });
    }
  });
  
  return <input ref={inputRef} />;
});
```

### Cleanup Pattern
```typescript
// Component utility with cleanup
function withWebSocket(url: string) {
  const messages = signal<string[]>([]);
  const ws = new WebSocket(url);
  
  ws.onmessage = (e) => messages.set(prev => [...prev, e.data]);
  
  blox.on({
    unmount: () => ws.close() // ✅ Cleanup
  });
  
  return { messages };
}
```

---

## 🔧 API Quick Reference

### Core Creation

```typescript
// Signals
signal(initialValue)
signal(initialValue, { equals?, persist?, tags? })
signal(() => computedValue) // computed signal
signal.async(async () => value)
signal.snapshot({ key: signal })
signal.history(() => value, options?)

// Effects
effect(() => {
  // auto-tracks all signal reads
  return () => cleanup(); // optional
})

// Actions
action(async (arg) => result, options?)
action.cancellable(async (arg, aborter) => result)

// Components
blox(() => ReactNode)
blox((props, expose) => ReactNode) // with imperative handle

// Reactive UI
rx(() => ReactNode)
rx([signal1, signal2], (val1, val2) => ReactNode)
rx({ key: signal }, ({ key }) => ReactNode)

// Refs
ref<T>() // creates BloxRef<T>
ref.ready([ref1, ref2], (val1, val2) => result)
```

### blox APIs (Inside blox components only)

```typescript
blox.on({ mount?, unmount?, render? }) // returns cleanup function
blox.hook(() => hookResult) // captures React hooks
blox.slot(() => { blox.fill(<Component />); return data })
blox.fill(reactNode) // inside blox.slot() only
```

### Signal Methods

```typescript
count()              // read (tracks dependency)
count.peek()         // read without tracking
count.set(value)     // write
count.set(prev => newValue) // update function (uses immer)
count.on(listener)   // subscribe (returns unsubscribe)
count.reset()        // recompute (computed signals only)
count.proxy          // readonly proxy for object values (stable reference)
```

### Utilities

```typescript
batch(() => {}) // batch multiple signal updates
wait(signal | loadable | promise) // React Suspense integration
pool(key => instance) // shared/cached instances
pool(key => instance).once() // one-off instances
provider(name, value) // dependency injection
emitter() // event emitter
diff(current, previous) // deep value comparison
shallowEquals(a, b) // shallow equality check
```

---

## 🗂️ Where to Find Detailed Info

| Topic | File | Lines | What's There |
|-------|------|-------|--------------|
| **Complete API** | `docs/api-reference.md` | ~3900 | Every API with signatures, examples, edge cases |
| **Learning** | `docs/core-concepts.md` | ~1400 | Fundamentals, how things work, mental models |
| **Patterns** | `docs/patterns.md` | ~980 | Real-world usage, best practices, anti-patterns |
| **Context Rules** | `docs/context-and-scope.md` | ~594 | What works where, restrictions, tables |
| **Memory/Cleanup** | `docs/lifecycle-cleanup.md` | ~111 | Preventing memory leaks |
| **Performance** | `docs/performance.md` | - | Optimization strategies |
| **Persistence** | `docs/PERSISTENCE.md` | - | Saving signals to storage |
| **Main README** | `../../README.md` | - | Installation, quick start |

---

## 🎨 Code Style

### TypeScript Types

```typescript
import type { Signal, MutableSignal, BloxRef } from 'rxblox';

// Signals are typed
const count: Signal<number> = signal(0);

// Prefer inference
const count = signal(0); // inferred as MutableSignal<number>
```

### Testing Patterns

```typescript
import { describe, it, expect } from 'vitest';
import { signal, effect, blox, rx } from 'rxblox';

// Use 'it' not 'test'
it('should update reactively', () => {
  const count = signal(0);
  let effectRun = 0;
  
  effect(() => {
    count();
    effectRun++;
  });
  
  expect(effectRun).toBe(1);
  count.set(1);
  expect(effectRun).toBe(2);
});
```

---

## ⚠️ Common Mistakes to Avoid

```typescript
// ❌ Creating signals in rx()
rx(() => {
  const count = signal(0); // ERROR: Can't create signals in rx()
  return <div>{count()}</div>;
});

// ❌ Promise in signal
const data = signal(fetchData()); // ERROR: Use signal.async()

// ❌ Mutating signal values
const state = signal({ count: 0 });
state().count++; // ERROR: Signals hold immutable values

// ❌ Using useXXX naming for non-React hooks
function useTodoStore() {} // WRONG: Reserved for React hooks
function createTodoStore() {} // ✅ Correct

// ❌ Creating blox inside blox
blox(() => {
  const Inner = blox(() => {}); // ERROR: No nested blox
});

// ❌ Using blox APIs outside blox
function RegularComponent() {
  blox.on({ mount: () => {} }); // ERROR: Not in blox context
}
```

---

## 🚀 Quick Troubleshooting

| Error/Issue | Solution |
|-------------|----------|
| "Cannot create signals inside rx()" | Move signal creation outside rx() |
| "Cannot create signals inside batch()" | Move signal creation outside batch() |
| "blox.on() must be called inside blox" | Use inside `blox(() => {})` only |
| "Signals cannot hold Promise values" | Use `signal.async()` or `loadable` |
| Signal updates but UI doesn't | Wrap JSX in `rx(() => {})` |
| Memory leak suspicion | Check manual `.on()` subscriptions have cleanup |
| "ref() must be called inside blox" | (Old constraint - now works anywhere!) |

---

## 📖 Reading Order for Humans

1. Start: `../../README.md` (why rxblox, quick start)
2. Learn: `docs/core-concepts.md` (sections 1-5)
3. Practice: `docs/patterns.md` (common patterns)
4. Reference: `docs/api-reference.md` (when needed)
5. Rules: `docs/context-and-scope.md` (when confused about context)

---

## 🤖 Tips for AI Assistants

1. **Search before assuming**: Use `codebase_search` to verify current API
2. **Check context**: Verify where code is running (global, blox, rx, effect)
3. **Follow naming**: Strictly use `createXXX` / `withXXX` patterns
4. **Test-driven**: Write tests first (user preference)
5. **No backward compat**: Don't maintain old APIs (e.g., `blox.onMount` removed)
6. **Immutability**: Always use `.set(prev => ...)` for updates
7. **Ref clarity**: `ref()` is not reactive, just a mutable container

---

## 📝 Version Notes

- `ref()` now works anywhere (not restricted to blox)
- `blox.onMount/onUnmount/onRender` removed → use `blox.on({ mount, unmount, render })`
- `blox.handle` renamed to `blox.hook`
- `blox.ref` removed → use `ref()` directly
- `blox.ready` moved to `ref.ready()`

---

**End of AI Quick Reference** | Full docs: `packages/rxblox/docs/`

