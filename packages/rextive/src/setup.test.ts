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

  describe("add() with per-effect trigger", () => {
    it("should run effect only when its trigger emits", () => {
      const immediateEffect = vi.fn();
      const triggeredEffect = vi.fn();

      const stop = setup()
        .add(immediateEffect)
        .add(triggeredEffect, (emit) => {
          const id = setTimeout(emit, 100);
          return () => clearTimeout(id);
        })
        .run();

      // Immediate effect runs right away
      expect(immediateEffect).toHaveBeenCalledOnce();
      // Triggered effect waits
      expect(triggeredEffect).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      // Now triggered effect runs
      expect(triggeredEffect).toHaveBeenCalledOnce();
      stop();
    });

    it("should cleanup per-effect trigger on stop", () => {
      const effect = vi.fn();
      const triggerCleanup = vi.fn();

      const stop = setup()
        .add(effect, (emit) => {
          const id = setTimeout(emit, 100);
          return () => {
            clearTimeout(id);
            triggerCleanup();
          };
        })
        .run();

      // Stop before trigger fires
      stop();

      expect(effect).not.toHaveBeenCalled();
      expect(triggerCleanup).toHaveBeenCalledOnce();
    });

    it("should cleanup both trigger and effect", () => {
      const effectCleanup = vi.fn();
      const triggerCleanup = vi.fn();

      const stop = setup()
        .add(
          () => {
            return effectCleanup;
          },
          (emit) => {
            setTimeout(emit, 100);
            return triggerCleanup;
          }
        )
        .run();

      vi.advanceTimersByTime(100);

      stop();

      expect(triggerCleanup).toHaveBeenCalledOnce();
      expect(effectCleanup).toHaveBeenCalledOnce();
    });

    it("should support multiple effects with different triggers", () => {
      const effect1 = vi.fn();
      const effect2 = vi.fn();
      const effect3 = vi.fn();

      const stop = setup()
        .add(effect1) // Runs immediately
        .add(effect2, (emit) => {
          const id = setTimeout(emit, 50);
          return () => clearTimeout(id);
        })
        .add(effect3, (emit) => {
          const id = setTimeout(emit, 100);
          return () => clearTimeout(id);
        })
        .run();

      expect(effect1).toHaveBeenCalledOnce();
      expect(effect2).not.toHaveBeenCalled();
      expect(effect3).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      expect(effect2).toHaveBeenCalledOnce();
      expect(effect3).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      expect(effect3).toHaveBeenCalledOnce();
      stop();
    });

    it("should not run triggered effect if stop called before emit", () => {
      const effect = vi.fn();
      let emitFn: (() => void) | null = null;

      const stop = setup()
        .add(effect, (emit) => {
          emitFn = emit;
        })
        .run();

      stop();

      // Try to emit after stop
      emitFn?.();

      expect(effect).not.toHaveBeenCalled();
    });

    it("should work with event-based trigger pattern", () => {
      const effect = vi.fn();
      const addListener = vi.fn();
      const removeListener = vi.fn();

      const stop = setup()
        .add(effect, (emit) => {
          addListener(emit);
          return () => removeListener(emit);
        })
        .run();

      expect(addListener).toHaveBeenCalledOnce();
      expect(effect).not.toHaveBeenCalled();

      // Simulate event
      const emitFn = addListener.mock.calls[0][0];
      emitFn();

      expect(effect).toHaveBeenCalledOnce();

      stop();

      expect(removeListener).toHaveBeenCalledOnce();
    });
  });

  describe("add() with trigger args", () => {
    it("should pass args to per-effect function trigger", () => {
      const effect = vi.fn();
      const triggerFn = vi.fn(
        (emit: () => void, delay: number, message: string) => {
          expect(delay).toBe(100);
          expect(message).toBe("test");
          const id = setTimeout(emit, delay);
          return () => clearTimeout(id);
        }
      );

      const stop = setup().add(effect, triggerFn, 100, "test").run();

      expect(triggerFn).toHaveBeenCalledOnce();
      expect(effect).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(effect).toHaveBeenCalledOnce();
      stop();
    });

    it("should work with multiple effects having different trigger args", () => {
      const effect1 = vi.fn();
      const effect2 = vi.fn();
      const effect3 = vi.fn();

      const stop = setup()
        .add(effect1, (emit, ms: number) => {
          const id = setTimeout(emit, ms);
          return () => clearTimeout(id);
        }, 50)
        .add(effect2, (emit, ms: number) => {
          const id = setTimeout(emit, ms);
          return () => clearTimeout(id);
        }, 100)
        .add(effect3, (emit, ms: number) => {
          const id = setTimeout(emit, ms);
          return () => clearTimeout(id);
        }, 150)
        .run();

      expect(effect1).not.toHaveBeenCalled();
      expect(effect2).not.toHaveBeenCalled();
      expect(effect3).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(effect1).toHaveBeenCalledOnce();
      expect(effect2).not.toHaveBeenCalled();
      expect(effect3).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(effect2).toHaveBeenCalledOnce();
      expect(effect3).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(effect3).toHaveBeenCalledOnce();

      stop();
    });

    it("should not pass args to Observable triggers (args ignored)", () => {
      const effect = vi.fn();
      const listeners: (() => void)[] = [];

      const observable = {
        on: (listener: () => void) => {
          listeners.push(listener);
          return () => {
            const idx = listeners.indexOf(listener);
            if (idx >= 0) listeners.splice(idx, 1);
          };
        },
      };

      // Args should be ignored for Observable triggers
      const stop = setup()
        .add(effect, observable as any, "ignored", 123)
        .run();

      expect(effect).not.toHaveBeenCalled();

      // Emit from observable
      listeners.forEach((l) => l());

      expect(effect).toHaveBeenCalledOnce();
      stop();
    });

    it("should cleanup properly when trigger has args", () => {
      const effect = vi.fn();
      const effectCleanup = vi.fn();
      const triggerCleanup = vi.fn();

      const stop = setup()
        .add(
          () => {
            effect();
            return effectCleanup;
          },
          (emit, ms: number) => {
            const id = setTimeout(emit, ms);
            return () => {
              clearTimeout(id);
              triggerCleanup();
            };
          },
          100
        )
        .run();

      // Stop before trigger fires
      stop();

      expect(effect).not.toHaveBeenCalled();
      expect(effectCleanup).not.toHaveBeenCalled();
      expect(triggerCleanup).toHaveBeenCalledOnce();
    });
  });

  describe("global trigger with per-effect triggers", () => {
    it("should gate all effects behind global trigger", () => {
      const immediateEffect = vi.fn();
      const triggeredEffect = vi.fn();

      const stop = setup()
        .add(immediateEffect)
        .add(triggeredEffect, (emit) => {
          const id = setTimeout(emit, 50);
          return () => clearTimeout(id);
        })
        .run((emit) => {
          const id = setTimeout(emit, 100);
          return () => clearTimeout(id);
        });

      // Nothing runs yet - waiting for global trigger
      expect(immediateEffect).not.toHaveBeenCalled();
      expect(triggeredEffect).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      // Global trigger fired - immediate effect runs
      expect(immediateEffect).toHaveBeenCalledOnce();
      // Per-effect trigger started, but not fired yet
      expect(triggeredEffect).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      // Per-effect trigger fired
      expect(triggeredEffect).toHaveBeenCalledOnce();
      stop();
    });

    it("should cleanup all triggers when stopped before global emit", () => {
      const effect = vi.fn();
      const globalTriggerCleanup = vi.fn();

      const stop = setup()
        .add(effect, (emit) => {
          const id = setTimeout(emit, 50);
          return () => clearTimeout(id);
        })
        .run((emit) => {
          const id = setTimeout(emit, 100);
          return () => {
            clearTimeout(id);
            globalTriggerCleanup();
          };
        });

      // Stop before global trigger fires
      stop();

      vi.advanceTimersByTime(200);

      expect(effect).not.toHaveBeenCalled();
      expect(globalTriggerCleanup).toHaveBeenCalledOnce();
    });
  });

  describe("Observable triggers", () => {
    // Helper to create a mock Observable
    function createMockObservable() {
      let listener: (() => void) | null = null;
      const unsubscribe = vi.fn();

      return {
        observable: {
          on: (fn: () => void) => {
            listener = fn;
            return unsubscribe;
          },
        },
        emit: () => listener?.(),
        unsubscribe,
      };
    }

    it("should run effect when Observable emits (per-effect trigger)", () => {
      const effect = vi.fn();
      const { observable, emit, unsubscribe } = createMockObservable();

      const stop = setup().add(effect, observable).run();

      // Effect waits for observable to emit
      expect(effect).not.toHaveBeenCalled();

      // Emit from observable
      emit();

      expect(effect).toHaveBeenCalledOnce();

      stop();
      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it("should cleanup Observable subscription on stop", () => {
      const effect = vi.fn();
      const { observable, unsubscribe } = createMockObservable();

      const stop = setup().add(effect, observable).run();

      // Stop before observable emits
      stop();

      expect(effect).not.toHaveBeenCalled();
      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it("should run effect when Observable emits (global trigger)", () => {
      const effect = vi.fn();
      const { observable, emit, unsubscribe } = createMockObservable();

      const stop = setup().add(effect).run(observable);

      // Effect waits for observable to emit
      expect(effect).not.toHaveBeenCalled();

      // Emit from observable
      emit();

      expect(effect).toHaveBeenCalledOnce();

      stop();
      expect(unsubscribe).toHaveBeenCalledOnce();
    });

    it("should mix Observable and function triggers", () => {
      const immediateEffect = vi.fn();
      const observableEffect = vi.fn();
      const functionEffect = vi.fn();
      const { observable, emit } = createMockObservable();

      const stop = setup()
        .add(immediateEffect)
        .add(observableEffect, observable)
        .add(functionEffect, (emitFn) => {
          const id = setTimeout(emitFn, 100);
          return () => clearTimeout(id);
        })
        .run();

      // Only immediate runs right away
      expect(immediateEffect).toHaveBeenCalledOnce();
      expect(observableEffect).not.toHaveBeenCalled();
      expect(functionEffect).not.toHaveBeenCalled();

      // Observable emits
      emit();
      expect(observableEffect).toHaveBeenCalledOnce();
      expect(functionEffect).not.toHaveBeenCalled();

      // Timer fires
      vi.advanceTimersByTime(100);
      expect(functionEffect).toHaveBeenCalledOnce();

      stop();
    });

    it("should not run effect if cancelled before Observable emits", () => {
      const effect = vi.fn();
      const { observable, emit } = createMockObservable();

      const stop = setup().add(effect, observable).run();

      stop();

      // Try to emit after stop
      emit();

      expect(effect).not.toHaveBeenCalled();
    });

    it("should work with real signal-like object", () => {
      const effect = vi.fn();
      const listeners: (() => void)[] = [];

      // Create a signal-like observable
      const signalLike = {
        on: (listener: () => void) => {
          listeners.push(listener);
          return () => {
            const idx = listeners.indexOf(listener);
            if (idx >= 0) listeners.splice(idx, 1);
          };
        },
        // Method to trigger all listeners (like signal.set())
        emit: () => listeners.forEach((l) => l()),
      };

      const stop = setup().add(effect, signalLike).run();

      expect(effect).not.toHaveBeenCalled();

      // Simulate signal change
      signalLike.emit();

      expect(effect).toHaveBeenCalledOnce();

      stop();
      expect(listeners).toHaveLength(0); // Subscription cleaned up
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

