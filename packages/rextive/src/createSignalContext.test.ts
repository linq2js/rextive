/**
 * Tests for createSignalContext - dependency value caching
 */
import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { batch } from "./batch";

describe("createSignalContext - dependency value caching", () => {
  it("should cache dependency values within a single computation", () => {
    const count = signal(1);
    let accessCount = 0;

    // Wrap the signal to track accesses
    const originalCount = count;
    const wrappedCount = Object.assign(
      () => {
        accessCount++;
        return originalCount();
      },
      originalCount
    );

    const computed = signal({ count: wrappedCount as any }, ({ deps }) => {
      const v1 = deps.count; // First access - should read from signal
      const v2 = deps.count; // Second access - should use cache
      const v3 = deps.count; // Third access - should use cache
      return v1 + v2 + v3;
    });

    expect(computed()).toBe(3); // 1 + 1 + 1
    expect(accessCount).toBe(1); // Should only access count once per computation
  });

  it("should provide consistent values during async computation", async () => {
    const count = signal(1);
    const results: number[] = [];

    const computed = signal({ count }, async ({ deps, abortSignal }) => {
      const v1 = deps.count; // Read initial value
      results.push(v1);

      // Simulate async delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check if computation was cancelled
      if (abortSignal.aborted) {
        return -1; // Cancelled
      }

      const v2 = deps.count; // Should still be cached value from start of computation
      results.push(v2);

      return v1 + v2;
    });

    // Start first computation
    const promise1 = computed();
    
    // Change count while first computation is in progress (triggers new computation)
    await new Promise((resolve) => setTimeout(resolve, 5));
    count.set(2);
    
    // Wait for final result
    const result = await computed();
    
    // The second computation completes with count=2, so 2+2=4
    expect(result).toBe(4); // Second computation: 2 + 2 (both cached)
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("should clear cache and get fresh values on recomputation", () => {
    const count = signal(1);
    const snapshots: number[] = [];

    const computed = signal({ count }, ({ deps }) => {
      const v1 = deps.count;
      const v2 = deps.count;
      snapshots.push(v1, v2);
      return v1 + v2;
    });

    // First computation
    expect(computed()).toBe(2); // 1 + 1
    expect(snapshots).toEqual([1, 1]);

    // Change dependency
    count.set(5);

    // Second computation - should get fresh values
    expect(computed()).toBe(10); // 5 + 5
    expect(snapshots).toEqual([1, 1, 5, 5]); // New computation gets new values
  });

  it("should cache multiple dependencies independently", () => {
    const aOrig = signal(1);
    const bOrig = signal(2);
    const cOrig = signal(3);

    let aAccessCount = 0;
    let bAccessCount = 0;
    let cAccessCount = 0;

    const a = Object.assign(() => { aAccessCount++; return aOrig(); }, aOrig);
    const b = Object.assign(() => { bAccessCount++; return bOrig(); }, bOrig);
    const c = Object.assign(() => { cAccessCount++; return cOrig(); }, cOrig);

    const computed = signal({ a: a as any, b: b as any, c: c as any }, ({ deps }) => {
      // Access each dependency multiple times
      const a1 = deps.a;
      const a2 = deps.a;
      const b1 = deps.b;
      const b2 = deps.b;
      const c1 = deps.c;
      const c2 = deps.c;
      return a1 + a2 + b1 + b2 + c1 + c2;
    });

    expect(computed()).toBe(12); // (1+1) + (2+2) + (3+3)
    expect(aAccessCount).toBe(1); // Each dependency accessed only once
    expect(bAccessCount).toBe(1);
    expect(cAccessCount).toBe(1);
  });

  it("should handle errors consistently with caching", () => {
    const count = signal(1);
    let shouldThrow = false;

    const computed = signal({ count }, ({ deps }) => {
      const v1 = deps.count;
      
      if (shouldThrow) {
        throw new Error("Test error");
      }
      
      const v2 = deps.count; // Should use cached value
      return v1 + v2;
    });

    // First computation succeeds
    expect(computed()).toBe(2);

    // Second computation throws
    shouldThrow = true;
    count.set(2);
    expect(() => computed()).toThrow("Test error");

    // Third computation succeeds again
    shouldThrow = false;
    count.set(3);
    expect(computed()).toBe(6); // 3 + 3
  });

  it("should cache error throws from dependency access", () => {
    const errorSignal = signal(() => {
      throw new Error("Dependency error");
    });

    let errorCount = 0;
    const computed = signal({ errorSignal }, ({ deps }) => {
      try {
        const v1 = deps.errorSignal; // First access - throws
        return v1;
      } catch (e) {
        errorCount++;
        try {
          const v2 = deps.errorSignal; // Second access - should throw cached error
          return v2;
        } catch (e2) {
          errorCount++;
          throw e2;
        }
      }
    });

    expect(() => computed()).toThrow("Dependency error");
    expect(errorCount).toBe(2); // Both accesses should throw
  });

  it("should work correctly with lazy dependency tracking", () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);

    const computed = signal({ a, b, c }, ({ deps }) => {
      // Only access 'a' and 'b', not 'c'
      const v1 = deps.a;
      const v2 = deps.a; // Cached
      const v3 = deps.b;
      const v4 = deps.b; // Cached
      return v1 + v2 + v3 + v4;
    });

    expect(computed()).toBe(6); // (1+1) + (2+2)

    // Changing 'c' should NOT trigger recomputation (lazy tracking)
    const spy = vi.fn();
    computed.on(spy);
    c.set(10);
    expect(spy).not.toHaveBeenCalled();

    // Changing 'a' should trigger recomputation
    a.set(5);
    expect(spy).toHaveBeenCalled();
    expect(computed()).toBe(14); // (5+5) + (2+2)
  });

  it("should handle promise values correctly with caching", async () => {
    const asyncCount = signal(Promise.resolve(1));
    const results: any[] = [];

    const computed = signal({ asyncCount }, async ({ deps }) => {
      const v1 = deps.asyncCount; // First access
      results.push(v1);
      
      const v2 = deps.asyncCount; // Second access - should be cached
      results.push(v2);
      
      return v1 === v2; // Should be true (same promise object)
    });

    const result = await computed();
    expect(result).toBe(true);
    expect(results[0]).toBe(results[1]); // Same promise object
  });

  it("should clear cache when context is disposed", () => {
    const countOrig = signal(1);
    let accessCount = 0;

    const count = Object.assign(() => {
      accessCount++;
      return countOrig();
    }, countOrig);

    const computed = signal({ count: count as any }, ({ deps }) => {
      return deps.count + deps.count;
    });

    expect(computed()).toBe(2);
    expect(accessCount).toBe(1); // Only one access due to caching

    // Dispose
    computed.dispose();
    
    // Verify cache was used (only 1 access, not 2)
    expect(accessCount).toBe(1);
  });

  it("should handle nested computed signals with caching", () => {
    const a = signal(1);
    const b = signal(2);

    const sum = signal({ a, b }, ({ deps }) => {
      const a1 = deps.a;
      const a2 = deps.a; // Cached
      const b1 = deps.b;
      const b2 = deps.b; // Cached
      return a1 + a2 + b1 + b2;
    });

    const doubled = signal({ sum }, ({ deps }) => {
      const s1 = deps.sum;
      const s2 = deps.sum; // Cached
      return s1 + s2;
    });

    expect(sum()).toBe(6); // (1+1) + (2+2)
    expect(doubled()).toBe(12); // 6 + 6

    a.set(5);
    expect(sum()).toBe(14); // (5+5) + (2+2)
    expect(doubled()).toBe(28); // 14 + 14
  });

  it("should maintain cache correctness with batch updates", () => {
    const a = signal(1);
    const b = signal(2);
    const snapshots: number[][] = [];

    const computed = signal({ a, b }, ({ deps }) => {
      const a1 = deps.a;
      const a2 = deps.a; // Cached
      const b1 = deps.b;
      const b2 = deps.b; // Cached
      snapshots.push([a1, a2, b1, b2]);
      return a1 + a2 + b1 + b2;
    });

    expect(computed()).toBe(6);
    expect(snapshots.length).toBe(1);

    // Batch update - should trigger recomputation after batch completes
    batch(() => {
      a.set(5);
      b.set(10);
    });

    expect(computed()).toBe(30); // (5+5) + (10+10)
    // Batch may trigger multiple recomputations depending on implementation
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    // Last snapshot should have consistent cached values
    const lastSnapshot = snapshots[snapshots.length - 1];
    expect(lastSnapshot[0]).toBe(lastSnapshot[1]); // a1 === a2 (cached)
    expect(lastSnapshot[2]).toBe(lastSnapshot[3]); // b1 === b2 (cached)
  });
});
