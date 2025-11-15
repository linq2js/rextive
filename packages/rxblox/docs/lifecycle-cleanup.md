# Lifecycle & Cleanup

Understanding lifecycle and cleanup is crucial for preventing memory leaks and ensuring your rxblox applications run efficiently.

## Table of Contents

- [Automatic Cleanup in `blox` Components](#automatic-cleanup-in-blox-components)
- [Effect Cleanup](#effect-cleanup)
- [Signal Lifecycle](#signal-lifecycle)
- [Global Signals](#global-signals)
- [Cleanup Checklist](#cleanup-checklist)

---

## Automatic Cleanup in `blox` Components

When a `blox` component unmounts, the following are automatically cleaned up:

- All `effect()` subscriptions created in the definition phase
- All `blox.onUnmount()` callbacks
- Signal subscriptions are NOT automatically cleaned up unless explicitly managed

**Important**: Signal subscriptions created with `.on()` must be manually unsubscribed:

```tsx
// ❌ Memory leak - subscription never cleaned up
const MyComponent = blox(() => {
  const count = signal(0);
  count.on((value) => console.log(value)); // Leaks!

  return <div />;
});

// ✅ Correct - manual cleanup
const MyComponent = blox(() => {
  const count = signal(0);
  const unsubscribe = count.on((value) => console.log(value));

  blox.onUnmount(() => unsubscribe());

  return <div />;
});

// ✅ Better - use effect() for automatic cleanup
const MyComponent = blox(() => {
  const count = signal(0);

  effect(() => {
    console.log(count()); // Auto-tracked and cleaned up
  });

  return <div />;
});
```

## Effect Cleanup

Effects return cleanup functions that run before the effect re-executes or when the component unmounts:

```tsx
effect(() => {
  const timer = setInterval(() => console.log("tick"), 1000);

  // Cleanup function - runs before re-execution or on unmount
  return () => clearInterval(timer);
});
```

**Effect Lifecycle:**

1. Effect runs immediately upon creation
2. When dependencies change, cleanup runs, then effect re-runs
3. On component unmount (in `blox`), cleanup runs and effect is disposed

## Signal Lifecycle

- **Creation**: Signals can be created anywhere (global, component, function scope)
- **Subscription**: Calling `.on()` creates a subscription that must be manually cleaned up
- **Garbage Collection**: Signals are garbage collected when no references remain and all subscriptions are cleared
- **Memory**: Each signal maintains a Set of subscribers - ensure subscriptions are cleaned up to avoid memory leaks

## Global Signals

Global signals (created outside components) persist for the application lifetime:

```tsx
// Global signal - lives for entire app lifetime
const globalCount = signal(0);

// Subscription cleanup is your responsibility
const unsubscribe = globalCount.on((value) => {
  console.log(value);
});

// Clean up when no longer needed
unsubscribe();
```

## Cleanup Checklist

- ✅ Effects in `blox` components clean up automatically
- ✅ `blox.onUnmount()` callbacks run automatically
- ⚠️ Manual `.on()` subscriptions need `blox.onUnmount()` cleanup
- ⚠️ Global signal subscriptions must be manually unsubscribed
- ⚠️ Resources (timers, listeners, connections) need explicit cleanup

---

[Back to Main Documentation](../README.md)

