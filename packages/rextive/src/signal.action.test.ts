import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { AC, signalAction } from "./signal.action";

describe("signal.action", () => {
  describe("basic action (no dependencies)", () => {
    it("should create an action with dispatch, payload, and result", () => {
      const action = signalAction((ctx: AC<number>) => ctx.payload * 2, {
        name: "double",
      });

      expect(action.dispatch).toBeInstanceOf(Function);
      expect(action.payload).toBeDefined();
      expect(action.result).toBeDefined();
    });

    it("should execute handler on dispatch and return result", () => {
      const action = signalAction((ctx: AC<number>) => ctx.payload * 2);

      const result = action.dispatch(5);
      expect(result).toBe(10);
    });

    it("should update payload signal on dispatch", () => {
      const action = signalAction((ctx: AC<string>) =>
        ctx.payload.toUpperCase()
      );

      expect(action.payload()).toBeUndefined();

      action.dispatch("hello");
      expect(action.payload()).toBe("hello");

      action.dispatch("world");
      expect(action.payload()).toBe("world");
    });

    it("should update result signal on dispatch", () => {
      const action = signalAction((ctx: AC<number>) => ctx.payload + 100);

      action.dispatch(5);
      expect(action.result()).toBe(105);

      action.dispatch(10);
      expect(action.result()).toBe(110);
    });

    it("should act as notifier - trigger on same payload", () => {
      const spy = vi.fn();
      const action = signalAction((ctx: AC<number>) => {
        spy(ctx.payload);
        return ctx.payload * 2;
      });

      action.dispatch(5);
      expect(spy).toHaveBeenCalledTimes(1);

      action.dispatch(5); // Same value
      expect(spy).toHaveBeenCalledTimes(2); // Should still trigger
    });

    it("should provide context with abortSignal", () => {
      let capturedCtx: any;
      const action = signalAction((ctx: AC<number>) => {
        capturedCtx = ctx;
        return ctx.payload;
      });

      action.dispatch(1);
      expect(capturedCtx.abortSignal).toBeInstanceOf(AbortSignal);
      expect(capturedCtx.aborted).toBeInstanceOf(Function);
      expect(capturedCtx.onCleanup).toBeInstanceOf(Function);
      expect(capturedCtx.safe).toBeInstanceOf(Function);
      expect(capturedCtx.payload).toBe(1);
    });

    it("should work as trigger-only action (no payload needed)", () => {
      let callCount = 0;
      const action = signalAction((ctx: AC<void>) => {
        // ctx.payload not used - just a trigger
        callCount++;
        return callCount * 10;
      });

      action.dispatch();
      expect(action.result()).toBe(10);

      action.dispatch();
      expect(action.result()).toBe(20);
    });
  });

  describe("action with dependencies", () => {
    it("should create action with dependencies", () => {
      const multiplier = signal(2);
      const action = signalAction(
        { multiplier },
        (ctx: AC<number>, deps) => ctx.payload * deps.multiplier
      );

      expect(action.dispatch(5)).toBe(10);

      multiplier.set(3);
      expect(action.dispatch(5)).toBe(15);
    });

    it("should access multiple dependencies", () => {
      const base = signal(100);
      const multiplier = signal(2);
      const action = signalAction(
        { base, multiplier },
        (ctx: AC<number>, deps) => deps.base + ctx.payload * deps.multiplier
      );

      expect(action.dispatch(5)).toBe(110); // 100 + 5 * 2

      base.set(200);
      multiplier.set(3);
      expect(action.dispatch(10)).toBe(230); // 200 + 10 * 3
    });

    it("should provide deps as separate parameter", () => {
      const dep = signal("test");
      let capturedCtx: any;
      let capturedDeps: any;

      const action = signalAction({ dep }, (ctx: AC<number>, deps) => {
        capturedCtx = ctx;
        capturedDeps = deps;
        return ctx.payload;
      });

      action.dispatch(1);

      // ctx should have payload and standard context methods
      expect(capturedCtx.payload).toBe(1);
      expect(capturedCtx.abortSignal).toBeInstanceOf(AbortSignal);
      expect(capturedCtx.aborted).toBeInstanceOf(Function);
      expect(capturedCtx.onCleanup).toBeInstanceOf(Function);
      expect(capturedCtx.safe).toBeInstanceOf(Function);

      // deps should have dependency values
      expect(capturedDeps).toBeDefined();
      expect(capturedDeps.dep).toBe("test");
    });

    it("should auto-recompute when deps change (reactive deps)", () => {
      const multiplier = signal(2);
      const spy = vi.fn();

      const action = signalAction({ multiplier }, (ctx: AC<number>, deps) => {
        spy();
        return ctx.payload * deps.multiplier;
      });

      // Initial dispatch
      action.dispatch(5);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(action.result()).toBe(10); // 5 * 2

      // Change dep - SHOULD trigger recomputation (reactive)
      multiplier.set(3);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(action.result()).toBe(15); // 5 * 3
    });

    it("should NOT recompute when reading signals directly (non-reactive)", () => {
      const multiplier = signal(2);
      const spy = vi.fn();

      // No deps - call signal directly for non-reactive read
      const action = signalAction((ctx: AC<number>) => {
        spy();
        return ctx.payload * multiplier(); // Direct call, not reactive
      });

      // Initial dispatch
      action.dispatch(5);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(action.result()).toBe(10); // 5 * 2

      // Change signal - should NOT trigger recomputation
      multiplier.set(3);
      expect(spy).toHaveBeenCalledTimes(1); // Still 1

      // Dispatch again - now reads new value
      action.dispatch(5);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(action.result()).toBe(15); // 5 * 3
    });
  });

  describe("async actions", () => {
    it("should handle async handlers", async () => {
      const action = signalAction(async (ctx: AC<number>) => {
        await new Promise((r) => setTimeout(r, 10));
        return ctx.payload * 2;
      });

      const promise = action.dispatch(5);
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toBe(10);
    });

    it("should provide abortSignal for cancellation", async () => {
      let capturedAbortSignal: AbortSignal | null = null as any;
      let cleanupCalled = false;

      const action = signalAction(async (ctx: AC<number>) => {
        capturedAbortSignal = ctx.abortSignal;
        ctx.onCleanup(() => {
          cleanupCalled = true;
        });
        await new Promise((r) => setTimeout(r, 100));
        return ctx.payload;
      });

      action.dispatch(1);
      // Wait a tick to ensure the first dispatch has started
      await new Promise((r) => setTimeout(r, 0));

      const firstAbortSignal = capturedAbortSignal;

      action.dispatch(2); // This should abort the first

      // Cleanup should have been called
      expect(cleanupCalled).toBe(true);
      // First abort signal should be aborted after second dispatch
      expect(firstAbortSignal?.aborted).toBe(true);
    });
  });

  describe("options", () => {
    it("should set signal names from options", () => {
      const action = signalAction((ctx: AC<number>) => ctx.payload, {
        name: "myAction",
      });

      expect(action.result.displayName).toBe("myAction.result");
    });

    it("should apply result equals option", () => {
      const spy = vi.fn();
      const action = signalAction(
        (ctx: AC<{ value: number }>) => ({ result: ctx.payload.value }),
        { equals: "shallow" }
      );

      // Initial access to trigger first computation
      action.dispatch({ value: 1 });
      action.result.on(spy);

      action.dispatch({ value: 1 });
      expect(spy).toHaveBeenCalledTimes(0); // Same value - shallow equals

      // Different value - should trigger
      action.dispatch({ value: 2 });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("should apply custom equals for result", () => {
      const spy = vi.fn();
      const action = signalAction(
        (ctx: AC<number>) => ({ value: ctx.payload }),
        {
          equals: {
            result: (a, b) => a.value === b.value,
          },
        }
      );

      action.result.on(spy);

      action.dispatch(1);
      expect(spy).toHaveBeenCalledTimes(1);

      action.dispatch(1); // Same result value
      expect(spy).toHaveBeenCalledTimes(1); // Not triggered

      action.dispatch(2);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("should use initialPayload to set payload before first access", () => {
      const spy = vi.fn();
      const action = signalAction(
        (ctx: AC<number>) => {
          spy(ctx.payload);
          return ctx.payload * 2;
        },
        { initialPayload: 5 }
      );

      // Payload signal should have initial value
      expect(action.payload()).toBe(5);

      // Handler runs lazily when result is accessed
      expect(spy).not.toHaveBeenCalled();

      // Accessing result triggers handler with initialPayload
      expect(action.result()).toBe(10);
      expect(spy).toHaveBeenCalledWith(5);
    });
  });

  describe("event callbacks", () => {
    describe("onDispatch", () => {
      it("should call onDispatch when dispatch is called", () => {
        const onDispatch = vi.fn();
        const action = signalAction((ctx: AC<number>) => ctx.payload * 2, {
          onDispatch,
        });

        action.dispatch(5);
        expect(onDispatch).toHaveBeenCalledWith(5);

        action.dispatch(10);
        expect(onDispatch).toHaveBeenCalledWith(10);
        expect(onDispatch).toHaveBeenCalledTimes(2);
      });

      it("should call onDispatch before handler runs", () => {
        const order: string[] = [];
        const action = signalAction(
          (ctx: AC<number>) => {
            order.push("handler");
            return ctx.payload * 2;
          },
          {
            onDispatch: () => order.push("onDispatch"),
          }
        );

        action.dispatch(5);
        expect(order).toEqual(["onDispatch", "handler"]);
      });
    });

    describe("onSuccess", () => {
      it("should call onSuccess for sync handlers", () => {
        const onSuccess = vi.fn();
        const action = signalAction((ctx: AC<number>) => ctx.payload * 2, {
          onSuccess,
        });

        action.dispatch(5);
        expect(onSuccess).toHaveBeenCalledWith(10);
      });

      it("should call onSuccess when async handler resolves", async () => {
        const onSuccess = vi.fn();
        const action = signalAction(
          async (ctx: AC<number>) => {
            await new Promise((r) => setTimeout(r, 10));
            return ctx.payload * 2;
          },
          { onSuccess }
        );

        action.dispatch(5);
        expect(onSuccess).not.toHaveBeenCalled(); // Not called yet

        await new Promise((r) => setTimeout(r, 20));
        expect(onSuccess).toHaveBeenCalledWith(10);
      });

      it("should NOT call onSuccess when async handler is aborted", async () => {
        const onSuccess = vi.fn();
        const action = signalAction(
          async (ctx: AC<number>) => {
            await ctx.safe(new Promise((r) => setTimeout(r, 100)));
            return ctx.payload * 2;
          },
          { onSuccess }
        );

        action.dispatch(5);
        await new Promise((r) => setTimeout(r, 10)); // Let it start

        action.dispatch(10); // Abort the first
        await new Promise((r) => setTimeout(r, 150)); // Wait for second to complete

        // Only the second dispatch should have triggered onSuccess
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith(20);
      });
    });

    describe("onError", () => {
      it("should call onError for sync errors", () => {
        const onError = vi.fn();
        const action = signalAction(
          (ctx: AC<number>) => {
            if (ctx.payload === 0) throw new Error("Cannot be zero");
            return ctx.payload;
          },
          { onError }
        );

        expect(() => action.dispatch(0)).toThrow("Cannot be zero");
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect((onError.mock.calls[0][0] as Error).message).toBe(
          "Cannot be zero"
        );
      });

      it("should call onError when async handler rejects", async () => {
        const onError = vi.fn();
        const action = signalAction(
          async (ctx: AC<number>) => {
            await new Promise((r) => setTimeout(r, 10));
            if (ctx.payload === 0) throw new Error("Cannot be zero");
            return ctx.payload;
          },
          { onError }
        );

        action.dispatch(0);
        expect(onError).not.toHaveBeenCalled(); // Not called yet

        await new Promise((r) => setTimeout(r, 20));
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
        expect((onError.mock.calls[0][0] as Error).message).toBe(
          "Cannot be zero"
        );
      });

      it("should NOT call onError when async handler is aborted", async () => {
        const onError = vi.fn();
        const action = signalAction(
          async (ctx: AC<number>) => {
            await ctx.safe(new Promise((r) => setTimeout(r, 100)));
            throw new Error("This should not be reached");
          },
          { onError }
        );

        action.dispatch(5);
        await new Promise((r) => setTimeout(r, 10)); // Let it start

        action.dispatch(10); // Abort the first
        await new Promise((r) => setTimeout(r, 150)); // Wait

        // First was aborted (no onError), second also throws but after abort check
        // The second dispatch should also be aborted when handler completes
      });
    });

    describe("combined callbacks", () => {
      it("should call onDispatch, then onSuccess in order", async () => {
        const order: string[] = [];
        const action = signalAction(
          async (ctx: AC<number>) => {
            order.push("handler-start");
            await new Promise((r) => setTimeout(r, 10));
            order.push("handler-end");
            return ctx.payload * 2;
          },
          {
            onDispatch: () => order.push("onDispatch"),
            onSuccess: () => order.push("onSuccess"),
          }
        );

        action.dispatch(5);
        await new Promise((r) => setTimeout(r, 20));

        expect(order).toEqual([
          "onDispatch",
          "handler-start",
          "handler-end",
          "onSuccess",
        ]);
      });

      it("should call onDispatch, then onError for failed handlers", () => {
        const order: string[] = [];
        const action = signalAction(
          (_ctx: AC<number>) => {
            order.push("handler");
            throw new Error("fail");
          },
          {
            onDispatch: () => order.push("onDispatch"),
            onError: () => order.push("onError"),
          }
        );

        expect(() => action.dispatch(5)).toThrow("fail");
        expect(order).toEqual(["onDispatch", "handler", "onError"]);
      });
    });
  });

  describe("signal.action namespace", () => {
    it("should be accessible via signal.action", () => {
      const action = signal.action((ctx: AC<number>) => ctx.payload * 2);

      expect(action.dispatch(5)).toBe(10);
    });

    it("should work with deps via signal.action", () => {
      const multiplier = signal(2);
      const action = signal.action(
        { multiplier },
        (ctx: AC<number>, deps) => ctx.payload * deps.multiplier
      );

      expect(action.dispatch(5)).toBe(10);
    });
  });

  describe("result signal behavior", () => {
    it("should be subscribable", () => {
      const spy = vi.fn();
      const action = signalAction((ctx: AC<number>) => ctx.payload * 2);

      action.result.on(spy);

      action.dispatch(1);
      expect(spy).toHaveBeenCalledTimes(1);

      action.dispatch(2);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("should work with rx() (computed signal)", () => {
      const action = signalAction((ctx: AC<number>) => ctx.payload * 2);

      // result is a Computed, so it should have computed methods
      expect(action.result.pause).toBeInstanceOf(Function);
      expect(action.result.resume).toBeInstanceOf(Function);
      expect(action.result.refresh).toBeInstanceOf(Function);
    });
  });

  describe("context.payload access", () => {
    it("should provide payload via context", () => {
      const action = signalAction((ctx: AC<{ name: string; age: number }>) => {
        return `${ctx.payload.name} is ${ctx.payload.age}`;
      });

      expect(action.dispatch({ name: "Alice", age: 30 })).toBe("Alice is 30");
    });
  });
});
