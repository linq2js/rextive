/**
 * Tests for SignalContext.use() method
 */
import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";

describe("SignalContext.use()", () => {
  it("should pass context to the logic function", () => {
    const count = signal(1);
    let receivedContext: any = null;

    const computed = signal({ count }, (context) => {
      return context.use((ctx) => {
        receivedContext = ctx;
        return ctx.deps.count * 2;
      });
    });

    expect(computed()).toBe(2);
    expect(receivedContext).toBeTruthy();
    expect(receivedContext.deps).toBeDefined();
    expect(receivedContext.abortSignal).toBeDefined();
    expect(receivedContext.safe).toBeDefined();
    expect(receivedContext.use).toBeDefined();
  });

  it("should allow accessing all context properties", () => {
    const count = signal(1);

    const computed = signal({ count }, (context) => {
      return context.use((ctx) => {
        // Access deps
        const value = ctx.deps.count;

        // Access abortSignal
        expect(ctx.abortSignal).toBeInstanceOf(AbortSignal);

        // Access cleanup
        expect(typeof ctx.onCleanup).toBe("function");

        // Access safe
        expect(typeof ctx.safe).toBe("function");

        return value * 2;
      });
    });

    expect(computed()).toBe(2);
  });

  it("should pass additional arguments to logic function", () => {
    const count = signal(1);

    const computed = signal({ count }, (context) => {
      const multiply = (ctx: any, a: number, b: number, c: number) => {
        return ctx.deps.count * a * b * c;
      };

      return context.use(multiply, 2, 3, 4);
    });

    expect(computed()).toBe(24); // 1 * 2 * 3 * 4
  });

  it("should work with async logic functions", async () => {
    const count = signal(1);

    const computed = signal({ count }, async (context) => {
      return await context.use(async (ctx) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ctx.deps.count * 2;
      });
    });

    expect(await computed()).toBe(2);
  });

  it("should work with async logic and arguments", async () => {
    const count = signal(1);

    const computed = signal({ count }, async (context) => {
      const multiply = async (ctx: any, factor: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ctx.deps.count * factor;
      };

      return await context.use(multiply, 5);
    });

    expect(await computed()).toBe(5);
  });

  it("should be protected by safe() - throw if aborted (sync)", async () => {
    const count = signal(1);
    let logicExecuted = false;

    const computed = signal({ count }, async (context) => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      try {
        return context.use((ctx) => {
          logicExecuted = true;
          return ctx.deps.count * 2;
        });
      } catch (e) {
        return -1; // Aborted
      }
    });

    // Start first computation
    computed();

    // Trigger abort
    await new Promise((resolve) => setTimeout(resolve, 5));
    count.set(2);

    // Wait for second computation
    await new Promise((resolve) => setTimeout(resolve, 20));
    const result = await computed();

    expect(result).toBe(4); // Second computation: 2 * 2
  });

  it("should be protected by safe() - never-resolving promise if aborted (async)", async () => {
    const count = signal(1);

    const computed = signal({ count }, async (context) => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await Promise.race([
        context.use(async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return ctx.deps.count * 2;
        }),
        new Promise((resolve) => setTimeout(() => resolve("timeout"), 50)),
      ]);

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

    expect(result).toBe(4); // Second computation
  });

  it("should allow nested use() calls", () => {
    const count = signal(1);

    const computed = signal({ count }, (context) => {
      return context.use((ctx) => {
        const step1 = ctx.use((c) => c.deps.count * 2);
        const step2 = ctx.use((c) => step1 + 10);
        return step2;
      });
    });

    expect(computed()).toBe(12); // (1 * 2) + 10
  });

  it("should work with helper functions pattern", () => {
    const count = signal(1);

    // Helper that takes context
    const processValue = (ctx: any, multiplier: number) => {
      return ctx.deps.count * multiplier;
    };

    const computed = signal({ count }, (context) => {
      return context.use(processValue, 3);
    });

    expect(computed()).toBe(3);
  });

  it("should work with class methods", () => {
    const count = signal(1);

    class DataProcessor {
      multiplier = 5;

      process(ctx: any) {
        return ctx.deps.count * this.multiplier;
      }
    }

    const processor = new DataProcessor();

    const computed = signal({ count }, (context) => {
      return context.use((ctx) => processor.process(ctx));
    });

    expect(computed()).toBe(5);
  });

  it("should allow using safe() inside use() logic", () => {
    const count = signal(1);

    const computed = signal({ count }, (context) => {
      return context.use((ctx) => {
        const step1 = ctx.safe(() => ctx.deps.count * 2);
        const step2 = ctx.safe(() => step1 + 10);
        return step2;
      });
    });

    expect(computed()).toBe(12);
  });

  it("should allow using cleanup inside use() logic", () => {
    const count = signal(1);
    const cleanupSpy = vi.fn();

    const computed = signal({ count }, (context) => {
      return context.use((ctx) => {
        ctx.onCleanup(cleanupSpy);
        return ctx.deps.count * 2;
      });
    });

    expect(computed()).toBe(2);
    expect(cleanupSpy).not.toHaveBeenCalled();

    // Trigger recomputation
    count.set(2);
    expect(computed()).toBe(4);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("should work with complex async patterns", async () => {
    const userId = signal(1);

    const fetchUser = async (ctx: any) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { id: ctx.deps.userId, name: `User ${ctx.deps.userId}` };
    };

    const processUser = async (ctx: any, user: any) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { ...user, processed: true };
    };

    const userData = signal({ userId }, async (context) => {
      const user = await context.use(fetchUser);
      const processed = await context.use(processUser, user);
      return processed;
    });

    const result = await userData();
    expect(result.id).toBe(1);
    expect(result.name).toBe("User 1");
    expect(result.processed).toBe(true);
  });

  it("should handle errors in logic function", () => {
    const count = signal(1);

    const computed = signal({ count }, (context) => {
      try {
        return context.use((ctx) => {
          if (ctx.deps.count === 1) {
            throw new Error("Test error");
          }
          return ctx.deps.count * 2;
        });
      } catch (e: any) {
        return e.message;
      }
    });

    expect(computed()).toBe("Test error");

    count.set(2);
    expect(computed()).toBe(4);
  });

  it("should handle errors in async logic function", async () => {
    const count = signal(1);

    const computed = signal({ count }, async (context) => {
      try {
        return await context.use(async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (ctx.deps.count === 1) {
            throw new Error("Async error");
          }
          return ctx.deps.count * 2;
        });
      } catch (e: any) {
        return e.message;
      }
    });

    expect(await computed()).toBe("Async error");

    count.set(2);
    expect(await computed()).toBe(4);
  });

  it("should work with reusable logic functions", () => {
    const count = signal(1);
    const multiplier = signal(2);

    // Reusable logic that uses multiple deps
    const multiply = (ctx: any) => {
      return ctx.deps.count * ctx.deps.multiplier;
    };

    const computed1 = signal({ count, multiplier }, (context) => {
      return context.use(multiply);
    });

    const computed2 = signal({ count, multiplier }, (context) => {
      return context.use(multiply) + 10;
    });

    expect(computed1()).toBe(2); // 1 * 2
    expect(computed2()).toBe(12); // (1 * 2) + 10

    count.set(3);
    expect(computed1()).toBe(6); // 3 * 2
    expect(computed2()).toBe(16); // (3 * 2) + 10
  });

  it("should work in array operations", () => {
    const items = signal([1, 2, 3, 4, 5]);

    const processItem = (ctx: any, item: number) => {
      return item * 2;
    };

    const computed = signal({ items }, (context) => {
      return context.deps.items.map((item) => {
        return context.use(processItem, item);
      });
    });

    expect(computed()).toEqual([2, 4, 6, 8, 10]);
  });

  it("should maintain proper this binding", () => {
    const count = signal(1);

    class Calculator {
      factor = 10;

      calculate = (ctx: any) => {
        // Arrow function maintains 'this'
        return ctx.deps.count * this.factor;
      };
    }

    const calc = new Calculator();

    const computed = signal({ count }, (context) => {
      return context.use(calc.calculate);
    });

    expect(computed()).toBe(10);
  });

  it("should work with TypeScript type inference", () => {
    const count = signal(1);

    const computed = signal({ count }, (context) => {
      // TypeScript should infer the return type
      const result = context.use((ctx) => {
        const value: number = ctx.deps.count;
        return value * 2;
      });

      // result should be inferred as number
      const doubled: number = result;
      return doubled;
    });

    expect(computed()).toBe(2);
  });
});
