/**
 * Tests for setup utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setup } from "./setup";

describe("setup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("add()", () => {
    it("should add single function", () => {
      const fn = vi.fn();
      const stop = setup().add(fn).run();

      expect(fn).toHaveBeenCalledOnce();
      stop();
    });

    it("should add array of functions", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      const stop = setup().add([fn1, fn2, fn3]).run();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).toHaveBeenCalledOnce();
      stop();
    });

    it("should chain multiple add calls", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      const stop = setup().add(fn1).add(fn2).add(fn3).run();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).toHaveBeenCalledOnce();
      stop();
    });

    it("should mix single and array adds", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      const stop = setup().add(fn1).add([fn2, fn3]).run();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).toHaveBeenCalledOnce();
      stop();
    });
  });

  describe("run() immediate", () => {
    it("should run all effects immediately", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      setup().add(fn1).add(fn2).run();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
    });

    it("should return cleanup function", () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      const stop = setup()
        .add(() => cleanup1)
        .add(() => cleanup2)
        .run();

      expect(cleanup1).not.toHaveBeenCalled();
      expect(cleanup2).not.toHaveBeenCalled();

      stop();

      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
    });

    it("should handle effects without cleanup", () => {
      const fn1 = vi.fn();
      const cleanup2 = vi.fn();

      const stop = setup()
        .add(() => {
          fn1();
          // No return - no cleanup
        })
        .add(() => cleanup2)
        .run();

      expect(fn1).toHaveBeenCalledOnce();

      stop();

      expect(cleanup2).toHaveBeenCalledOnce();
    });

    it("should accumulate effects across multiple runs", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const s = setup();

      s.add(fn1);
      const stop1 = s.run();
      expect(fn1).toHaveBeenCalledTimes(1);

      s.add(fn2);
      const stop2 = s.run();
      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(1);

      stop1();
      stop2();
    });
  });

  describe("run() with trigger", () => {
    it("should delay execution via setTimeout trigger", () => {
      const effect = vi.fn();

      const stop = setup()
        .add(effect)
        .run((emit) => {
          const id = setTimeout(emit, 100);
          return () => clearTimeout(id);
        });

      expect(effect).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(effect).toHaveBeenCalledOnce();
      stop();
    });

    it("should cancel trigger if stopped before emit", () => {
      const effect = vi.fn();
      const cleanup = vi.fn();

      const stop = setup()
        .add(() => {
          effect();
          return cleanup;
        })
        .run((emit) => {
          const id = setTimeout(emit, 100);
          return () => clearTimeout(id);
        });

      expect(effect).not.toHaveBeenCalled();

      // Stop before timeout fires
      stop();

      vi.advanceTimersByTime(100);

      // Effect should never run
      expect(effect).not.toHaveBeenCalled();
      expect(cleanup).not.toHaveBeenCalled();
    });

    it("should cleanup both trigger and effects", () => {
      const effectCleanup = vi.fn();
      const triggerCleanup = vi.fn();

      const stop = setup()
        .add(() => effectCleanup)
        .run((emit) => {
          setTimeout(emit, 100);
          return triggerCleanup;
        });

      vi.advanceTimersByTime(100);

      stop();

      expect(triggerCleanup).toHaveBeenCalledOnce();
      expect(effectCleanup).toHaveBeenCalledOnce();
    });

    it("should work with requestAnimationFrame pattern", () => {
      const effect = vi.fn();
      let rafCallback: (() => void) | null = null;

      const stop = setup()
        .add(effect)
        .run((emit) => {
          rafCallback = emit;
          // Simulating requestAnimationFrame
        });

      expect(effect).not.toHaveBeenCalled();

      // Simulate RAF callback
      rafCallback?.();

      expect(effect).toHaveBeenCalledOnce();
      stop();
    });

    it("should work with event listener pattern", () => {
      const effect = vi.fn();
      const addListener = vi.fn();
      const removeListener = vi.fn();

      const stop = setup()
        .add(effect)
        .run((emit) => {
          addListener(emit);
          return () => removeListener(emit);
        });

      expect(addListener).toHaveBeenCalledOnce();
      expect(effect).not.toHaveBeenCalled();

      // Simulate event
      const emitFn = addListener.mock.calls[0][0];
      emitFn();

      expect(effect).toHaveBeenCalledOnce();

      stop();

      expect(removeListener).toHaveBeenCalledOnce();
    });

    it("should not run effects if emit called after stop", () => {
      const effect = vi.fn();
      let emitFn: (() => void) | null = null;

      const stop = setup()
        .add(effect)
        .run((emit) => {
          emitFn = emit;
        });

      stop();

      // Try to emit after stop
      emitFn?.();

      expect(effect).not.toHaveBeenCalled();
    });

    it("should support trigger with additional args", () => {
      const effect = vi.fn();

      const stop = setup()
        .add(effect)
        .run(
          (emit, delay: number, message: string) => {
            expect(delay).toBe(100);
            expect(message).toBe("test");
            const id = setTimeout(emit, delay);
            return () => clearTimeout(id);
          },
          100,
          "test"
        );

      vi.advanceTimersByTime(100);

      expect(effect).toHaveBeenCalledOnce();
      stop();
    });
  });

  describe("real-world patterns", () => {
    it("should work as dispose in logic pattern", () => {
      const timerCleanup = vi.fn();
      const subscriptionCleanup = vi.fn();

      function gameLogic() {
        return {
          dispose: setup()
            .add(() => timerCleanup)
            .add(() => subscriptionCleanup)
            .run(),
        };
      }

      const logic = gameLogic();

      logic.dispose();

      expect(timerCleanup).toHaveBeenCalledOnce();
      expect(subscriptionCleanup).toHaveBeenCalledOnce();
    });

    it("should work with interval setup", () => {
      const tick = vi.fn();
      let intervalId: ReturnType<typeof setInterval> | null = null;

      const stop = setup()
        .add(() => {
          intervalId = setInterval(tick, 100);
          return () => {
            if (intervalId) clearInterval(intervalId);
          };
        })
        .run();

      vi.advanceTimersByTime(350);

      expect(tick).toHaveBeenCalledTimes(3);

      stop();

      vi.advanceTimersByTime(200);

      // No more ticks after stop
      expect(tick).toHaveBeenCalledTimes(3);
    });
  });
});

