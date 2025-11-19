# Performance & Memory Considerations

Understanding the performance characteristics of rxblox helps you build efficient, scalable applications.

## Table of Contents

- [Subscription Overhead](#subscription-overhead)
- [Dependency Tracking](#dependency-tracking)
- [Update Batching](#update-batching)
- [Memory Leaks Prevention](#memory-leaks-prevention)
- [Large Lists & Virtualization](#large-lists--virtualization)
- [Profiling](#profiling)

---

## Subscription Overhead

Each signal maintains subscriptions via a Set data structure:

- **Memory per signal**: Minimal overhead (Set + internal state)
- **Memory per subscription**: One reference per subscriber in the Set
- **Notification cost**: O(n) where n = number of subscribers

**Best practices:**

- Clean up subscriptions when no longer needed
- Use computed signals for derived values instead of multiple manual subscriptions
- Prefer `blox` components where cleanup is automatic

## Dependency Tracking

rxblox uses a dispatcher-based tracking system:

- **Computed signals**: Track dependencies automatically during execution
- **Effects**: Subscribe to all accessed signals
- **`rx()` expressions**: Re-execute only when tracked dependencies change

**Performance characteristics:**

- Dependency tracking is synchronous and lightweight
- Computed signals cache results until dependencies change
- Updates propagate synchronously through the dependency graph

## Update Batching

- Signal updates trigger immediate subscriber notifications
- React batches resulting state updates automatically (React 18+)
- Multiple signal changes in the same event handler result in a single React render cycle

## Memory Leaks Prevention

**Common pitfall:**

```tsx
// ❌ Subscription leak - never cleaned up
function SomeUtility() {
  const count = signal(0);
  count.on((value) => {
    // This subscription lives forever!
    apiCall(value);
  });
}
```

**Correct approach:**

```tsx
// ✅ Cleanup in blox component
const MyComponent = blox(() => {
  const count = signal(0);
  const sub = count.on((value) => apiCall(value));

  blox.on({ unmount: () => sub() });

  return <div />;
});

// ✅ Better - use effect() for automatic cleanup
const MyComponent = blox(() => {
  const count = signal(0);

  effect(() => {
    apiCall(count()); // Auto-tracked and cleaned up
  });

  return <div />;
});
```

## Large Lists & Virtualization

For lists with thousands of items:

- Use virtualization libraries (react-virtual, react-window)
- Individual list items can be `blox` components for fine-grained updates
- Signals work well with virtualized rendering

## Profiling

Use React DevTools Profiler:

- `blox` components appear as memoized components
- `rx()` updates won't show as full component renders
- Use `signal.on()` with `console.log` for debugging signal changes

---

[Back to Main Documentation](../README.md)

