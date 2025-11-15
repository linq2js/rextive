# QA Suggestions for Signal Persistence

## Priority 1: Critical Edge Cases

### 1. Signal Disposal with Persistence

```typescript
it("should cleanup persistence subscriptions on disposal", () => {
  const unsubscribeSpy = vi.fn();
  const persistor: Persistor<number> = {
    get: () => null,
    set: vi.fn(),
    on: () => unsubscribeSpy,
  };

  const disposable = disposableScope(() => {
    const count = signal(0, { persist: persistor });
    expect(count()).toBe(0);
  });

  disposable.dispose();
  expect(unsubscribeSpy).toHaveBeenCalled();
});
```

### 2. Error in persist.on() Subscribe

```typescript
it("should handle errors when subscribing to external changes", () => {
  const persistor: Persistor<number> = {
    get: () => null,
    set: vi.fn(),
    on: () => {
      throw new Error("Subscribe failed");
    },
  };

  // Should not throw - signal should still work
  expect(() => signal(0, { persist: persistor })).not.toThrow();
});
```

### 3. Persistor.get() Returning Undefined

```typescript
it("should handle persistor returning undefined (vs null)", async () => {
  const persistor: Persistor<number> = {
    get: () => undefined as any,
    set: vi.fn(),
  };

  const count = signal(42, { persist: persistor });

  expect(count()).toBe(42); // Should keep initial value
  expect(count.persistInfo.status).toBe("synced");
});
```

## Priority 2: Data Type Coverage

### 4. Array Values

```typescript
it("should persist array values correctly", async () => {
  const persistor: Persistor<number[]> = {
    get: () => ({ value: [1, 2, 3] }),
    set: vi.fn(),
  };

  const arr = signal<number[]>([], { persist: persistor });
  expect(arr()).toEqual([1, 2, 3]);

  arr.set([4, 5, 6]);
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(persistor.set).toHaveBeenCalledWith([4, 5, 6]);
});
```

### 5. Nested Objects

```typescript
it("should handle deeply nested objects", async () => {
  type Nested = { a: { b: { c: number } } };
  const persistor: Persistor<Nested> = {
    get: () => ({ value: { a: { b: { c: 42 } } } }),
    set: vi.fn(),
  };

  const nested = signal<Nested>({ a: { b: { c: 0 } } }, { persist: persistor });
  expect(nested().a.b.c).toBe(42);
});
```

## Priority 3: Type Guards

### 6. isSignal() Tests

```typescript
describe("isSignal", () => {
  it("should identify signals correctly", () => {
    const count = signal(0);
    expect(isSignal(count)).toBe(true);
  });

  it("should reject non-signals", () => {
    expect(isSignal(42)).toBe(false);
    expect(isSignal(() => 42)).toBe(false);
    expect(isSignal({ peek: () => 1 })).toBe(false); // Missing 'on'
    expect(isSignal({ on: () => {} })).toBe(false); // Missing 'peek'
  });
});
```

### 7. isMutableSignal() Tests

```typescript
describe("isMutableSignal", () => {
  it("should identify mutable signals", () => {
    const count = signal(0);
    expect(isMutableSignal(count)).toBe(true);
  });

  it("should reject readonly signals", () => {
    const count = signal(0);
    const readonly = count.readonly;
    expect(isMutableSignal(readonly)).toBe(false);
  });

  it("should reject non-signals", () => {
    expect(isMutableSignal(42)).toBe(false);
    expect(isMutableSignal(() => 42)).toBe(false);
  });
});
```

## Priority 4: Performance & Memory

### 8. Memory Leak Prevention

```typescript
it("should not leak memory with many persistence updates", async () => {
  const persistor: Persistor<number> = {
    get: () => null,
    set: vi.fn(),
  };

  const count = signal(0, { persist: persistor });

  // Rapid updates
  for (let i = 0; i < 1000; i++) {
    count.set(i);
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Should eventually stabilize
  expect(count.persistInfo.status).toBe("synced");
  expect(count()).toBe(999);
});
```

### 9. Large Data Sets

```typescript
it("should handle large data sets efficiently", async () => {
  const largeArray = Array.from({ length: 10000 }, (_, i) => i);
  const persistor: Persistor<number[]> = {
    get: () => ({ value: largeArray }),
    set: vi.fn(),
  };

  const start = performance.now();
  const data = signal<number[]>([], { persist: persistor });
  const duration = performance.now() - start;

  expect(data().length).toBe(10000);
  expect(duration).toBeLessThan(100); // Should be fast
});
```

## Priority 5: Documentation Examples

### 10. Verify README Examples

Ensure all examples in the documentation actually work:

- LocalStorage persistor example
- Debouncing example
- Cross-tab sync example
- Error handling examples

## Notes

- All Priority 1 tests should be implemented before release
- Priority 2-3 tests can be added incrementally
- Priority 4-5 are nice-to-have but valuable for production readiness
- Consider adding E2E tests with real localStorage/IndexedDB
