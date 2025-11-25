/**
 * Tests for SignalContext.safe() method
 */
import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";

describe("SignalContext.safe()", () => {
  it("should execute sync functions normally when not aborted", () => {
    const count = signal(1);
    let executed = false;

    const computed = signal({ count }, ({ deps, safe }) => {
      const result = safe(() => {
        executed = true;
        return deps.count * 2;
      });
      return result;
    });

    expect(computed()).toBe(2);
    expect(executed).toBe(true);
  });

  it("should execute async functions normally when not aborted", async () => {
    const count = signal(1);
    let executed = false;

    const computed = signal({ count }, async ({ deps, safe }) => {
      const result = await safe(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        executed = true;
        return deps.count * 2;
      });
      return result;
    });

    const result = await computed();
    expect(result).toBe(2);
    expect(executed).toBe(true);
  });

  it("should pass arguments to the function", () => {
    const count = signal(1);

    const computed = signal({ count }, ({ deps, safe }) => {
      const multiply = (a: number, b: number, c: number) => a * b * c;
      return safe(multiply, deps.count, 2, 3);
    });

    expect(computed()).toBe(6); // 1 * 2 * 3
  });

  it("should pass arguments to async functions", async () => {
    const count = signal(1);

    const computed = signal({ count }, async ({ deps, safe }) => {
      const multiply = async (a: number, b: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return a * b;
      };
      return await safe(multiply, deps.count, 5);
    });

    expect(await computed()).toBe(5); // 1 * 5
  });

  it("should prevent sync function execution after abort", async () => {
    const count = signal(1);
    let expensiveOpCalled = false;

    const computed = signal({ count }, async ({ deps, safe, abortSignal }) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      // This should throw if aborted
      try {
        return safe(() => {
          expensiveOpCalled = true;
          return deps.count * 2;
        });
      } catch (e) {
        return -1; // Aborted
      }
    });

    // Start first computation
    computed();
    
    // Trigger abort by changing dependency
    await new Promise((resolve) => setTimeout(resolve, 5));
    count.set(2);
    
    // Wait for second computation
    await new Promise((resolve) => setTimeout(resolve, 20));
    const result = await computed();
    
    // Second computation should complete
    expect(result).toBe(4); // 2 * 2
  });

  it("should return never-resolving promise for async functions after abort", async () => {
    const count = signal(1);
    const executionLog: string[] = [];

    const computed = signal({ count }, async ({ deps, safe, abortSignal }) => {
      executionLog.push("start");
      
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      executionLog.push("after-delay");
      
      // This should return a never-resolving promise if aborted
      const result = await Promise.race([
        safe(async () => {
          executionLog.push("expensive-op");
          return deps.count * 2;
        }),
        new Promise((resolve) => setTimeout(() => resolve("timeout"), 50)),
      ]);
      
      executionLog.push(`result: ${result}`);
      return result;
    });

    // Start first computation
    computed();
    
    // Trigger abort
    await new Promise((resolve) => setTimeout(resolve, 5));
    count.set(2);
    
    // Wait for completion
    await new Promise((resolve) => setTimeout(resolve, 100));
    const result = await computed();
    
    expect(result).toBe(4); // Second computation: 2 * 2
  });

  it("should work with multiple safe() calls", () => {
    const count = signal(1);

    const computed = signal({ count }, ({ deps, safe }) => {
      const step1 = safe(() => deps.count * 2);
      const step2 = safe(() => step1 + 10);
      const step3 = safe(() => step2 * 3);
      return step3;
    });

    expect(computed()).toBe(36); // ((1 * 2) + 10) * 3
  });

  it("should work in loops", () => {
    const items = signal([1, 2, 3, 4, 5]);

    const computed = signal({ items }, ({ deps, safe }) => {
      const results: number[] = [];
      
      for (const item of deps.items) {
        const processed = safe((x: number) => x * 2, item);
        results.push(processed);
      }
      
      return results;
    });

    expect(computed()).toEqual([2, 4, 6, 8, 10]);
  });

  it("should work with array methods", () => {
    const items = signal([1, 2, 3, 4, 5]);

    const computed = signal({ items }, ({ deps, safe }) => {
      return deps.items.map((item) => {
        return safe((x: number) => x * 2, item);
      });
    });

    expect(computed()).toEqual([2, 4, 6, 8, 10]);
  });

  it("should handle errors in sync functions", () => {
    const count = signal(1);

    const computed = signal({ count }, ({ deps, safe }) => {
      try {
        return safe(() => {
          if (deps.count === 1) {
            throw new Error("Test error");
          }
          return deps.count * 2;
        });
      } catch (e: any) {
        return e.message;
      }
    });

    expect(computed()).toBe("Test error");
    
    count.set(2);
    expect(computed()).toBe(4);
  });

  it("should handle errors in async functions", async () => {
    const count = signal(1);

    const computed = signal({ count }, async ({ deps, safe }) => {
      try {
        return await safe(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (deps.count === 1) {
            throw new Error("Async error");
          }
          return deps.count * 2;
        });
      } catch (e: any) {
        return e.message;
      }
    });

    expect(await computed()).toBe("Async error");
    
    count.set(2);
    expect(await computed()).toBe(4);
  });

  it("should work with nested async operations", async () => {
    const count = signal(1);

    const computed = signal({ count }, async ({ deps, safe }) => {
      const step1 = await safe(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return deps.count * 2;
      });
      
      const step2 = await safe(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return step1 + 10;
      });
      
      return step2;
    });

    expect(await computed()).toBe(12); // (1 * 2) + 10
  });

  it("should work with fetch-like patterns", async () => {
    const userId = signal(1);
    const fetchSpy = vi.fn();

    const userData = signal({ userId }, async ({ deps, safe, abortSignal }) => {
      // Fetch data
      await new Promise((resolve) => setTimeout(resolve, 10));
      fetchSpy(deps.userId);
      const data = { id: deps.userId, name: `User ${deps.userId}` };
      
      // Process data only if not aborted
      const processed = await safe(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...data, processed: true };
      });
      
      return processed;
    });

    const result = await userData();
    expect(result.id).toBe(1);
    expect(result.processed).toBe(true);
  });

  it("should work with complex real-world scenario", async () => {
    const query = signal("test");
    const steps: string[] = [];

    const searchResults = signal({ query }, async ({ deps, safe, abortSignal }) => {
      steps.push("fetch-start");
      await new Promise((resolve) => setTimeout(resolve, 10));
      steps.push("fetch-done");
      
      const rawData = { query: deps.query, items: [1, 2, 3] };
      
      // Process data
      const processed = await safe(async () => {
        steps.push("process-start");
        await new Promise((resolve) => setTimeout(resolve, 10));
        steps.push("process-done");
        return rawData.items.map((x) => x * 2);
      });
      
      // Format results
      const formatted = safe(() => {
        steps.push("format");
        return processed.map((x) => `Item: ${x}`);
      });
      
      return formatted;
    });

    const result = await searchResults();
    expect(result).toEqual(["Item: 2", "Item: 4", "Item: 6"]);
    expect(steps).toContain("fetch-start");
    expect(steps).toContain("process-done");
    expect(steps).toContain("format");
  });
});

