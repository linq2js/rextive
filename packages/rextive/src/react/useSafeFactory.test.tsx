import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSafeFactory } from "./useSafeFactory";
import { signal } from "../signal";
import React, { StrictMode, Fragment } from "react";
import "@testing-library/jest-dom/vitest";
import { Computed } from "../types";

// Test modes: normal and StrictMode
const testModes = [
  { name: "normal", wrapper: Fragment, isStrictMode: false },
  { name: "StrictMode", wrapper: StrictMode, isStrictMode: true },
] as const;

describe.each(testModes)(
  "useSafeFactory ($name mode)",
  ({ wrapper, isStrictMode }) => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should create object using factory", () => {
      const factory = vi.fn(() => ({ value: 42 }));

      const { result } = renderHook(() => useSafeFactory(factory, []), {
        wrapper,
      });

      // Result is wrapped with disposable() which adds dispose method
      expect(result.current.result).toMatchObject({ value: 42 });
      expect((result.current.result as any).dispose).toBeInstanceOf(Function);
    });

    it("should handle committed objects correctly", async () => {
      const disposeTracker = vi.fn();
      const factory = vi.fn(() => ({
        value: 42,
        dispose: disposeTracker,
      }));

      const { result } = renderHook(() => useSafeFactory(factory, []), {
        wrapper,
      });

      // Commit immediately
      act(() => {
        result.current.commit();
      });

      // Flush microtasks
      await act(async () => {
        await Promise.resolve();
      });

      // In StrictMode, useMemo runs twice - first instance becomes orphan and is disposed
      // In normal mode, the committed instance is not disposed
      if (isStrictMode) {
        // One orphan from StrictMode double-invoke gets disposed
        expect(disposeTracker).toHaveBeenCalledTimes(1);
      } else {
        expect(disposeTracker).not.toHaveBeenCalled();
      }
    });

    it("should handle scheduleDispose and re-commit (remount simulation)", async () => {
      const disposeTracker = vi.fn();
      const factory = vi.fn(() => ({
        value: 42,
        dispose: disposeTracker,
      }));

      const { result } = renderHook(() => useSafeFactory(factory, []), {
        wrapper,
      });

      // Commit first
      act(() => {
        result.current.commit();
      });

      // Flush initial check
      await act(async () => {
        await Promise.resolve();
      });

      // Clear any calls from orphan disposal in StrictMode
      disposeTracker.mockClear();

      // Schedule dispose (simulates cleanup phase)
      act(() => {
        result.current.scheduleDispose();
      });

      // Re-commit before microtask (simulates remount)
      act(() => {
        result.current.commit();
      });

      // Flush microtasks
      await act(async () => {
        await Promise.resolve();
      });

      // Re-committed before microtask = dispose not called
      expect(disposeTracker).not.toHaveBeenCalled();
    });

    it("should call dispose when scheduleDispose and NOT re-committed (real unmount)", async () => {
      const disposeTracker = vi.fn();
      const factory = vi.fn(() => ({
        value: 42,
        dispose: disposeTracker,
      }));

      const { result } = renderHook(() => useSafeFactory(factory, []), {
        wrapper,
      });

      // Commit first
      act(() => {
        result.current.commit();
      });

      // Flush initial orphan check
      await act(async () => {
        await Promise.resolve();
      });

      // Clear any calls from orphan disposal in StrictMode
      disposeTracker.mockClear();

      // Schedule dispose (simulates cleanup phase)
      act(() => {
        result.current.scheduleDispose();
      });

      // DO NOT re-commit (simulates real unmount)

      // Flush microtasks
      await act(async () => {
        await Promise.resolve();
      });

      // Not re-committed = dispose called
      expect(disposeTracker).toHaveBeenCalledTimes(1);
    });

    it("should recreate when deps change", async () => {
      const factory = vi.fn(() => ({ value: Math.random() }));

      const { result, rerender } = renderHook(
        ({ dep }) => useSafeFactory(factory, [dep]),
        { initialProps: { dep: 1 }, wrapper }
      );

      const firstResult = result.current.result;

      // Commit first instance
      act(() => {
        result.current.commit();
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Change deps
      rerender({ dep: 2 });

      const secondResult = result.current.result;
      expect(secondResult).not.toBe(firstResult);

      // Commit second instance
      act(() => {
        result.current.commit();
      });

      await act(async () => {
        await Promise.resolve();
      });
    });

    it("should handle multiple scheduleDispose/commit cycles", async () => {
      const disposeTracker = vi.fn();
      const factory = vi.fn(() => ({
        value: 42,
        dispose: disposeTracker,
      }));

      const { result } = renderHook(() => useSafeFactory(factory, []), {
        wrapper,
      });

      // First commit
      act(() => {
        result.current.commit();
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Clear any calls from orphan disposal in StrictMode
      disposeTracker.mockClear();

      // First cycle: scheduleDispose -> commit
      act(() => {
        result.current.scheduleDispose();
      });
      act(() => {
        result.current.commit();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(disposeTracker).not.toHaveBeenCalled();

      // Second cycle: scheduleDispose -> commit
      act(() => {
        result.current.scheduleDispose();
      });
      act(() => {
        result.current.commit();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(disposeTracker).not.toHaveBeenCalled();

      // Third cycle: scheduleDispose -> NO commit (real unmount)
      act(() => {
        result.current.scheduleDispose();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(disposeTracker).toHaveBeenCalledTimes(1);
    });

    it("should return stable result reference between renders when deps unchanged", () => {
      const factory = vi.fn(() => ({ value: 42 }));

      const { result, rerender } = renderHook(
        () => useSafeFactory(factory, []),
        { wrapper }
      );

      const firstResult = result.current.result;

      rerender();

      const secondResult = result.current.result;

      expect(firstResult).toBe(secondResult);
    });

    describe("integration with useEffect", () => {
      it("should work with standard useEffect lifecycle", async () => {
        const disposeTracker = vi.fn();
        const factory = vi.fn(() => ({
          value: 42,
          dispose: disposeTracker,
        }));

        const { result, unmount } = renderHook(
          () => {
            const controller = useSafeFactory(factory, []);

            // Simulate useEffect commit pattern
            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        // Initial microtask - should NOT dispose because useEffect commits
        await act(async () => {
          await Promise.resolve();
        });

        // Clear any calls from orphan disposal in StrictMode
        disposeTracker.mockClear();

        expect(result.current.result).toMatchObject({ value: 42 });

        // Unmount - useEffect cleanup runs scheduleDispose
        unmount();

        // After unmount microtask
        await act(async () => {
          await Promise.resolve();
        });

        // dispose called (normal disposal)
        expect(disposeTracker).toHaveBeenCalledTimes(1);
      });

      it("should handle deps change correctly", async () => {
        const disposeLog: number[] = [];
        let instanceCounter = 0;

        const { result, rerender } = renderHook(
          ({ dep }) => {
            const controller = useSafeFactory(() => {
              const id = ++instanceCounter;
              return {
                id,
                dispose: () => disposeLog.push(id),
              };
            }, [dep]);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { initialProps: { dep: 1 }, wrapper }
        );

        // Wait for initial effects
        await act(async () => {
          await Promise.resolve();
        });

        const initialId = result.current.result.id;

        // Clear dispose log (StrictMode may have disposed orphans)
        disposeLog.length = 0;

        // Change deps - should create new instance
        rerender({ dep: 2 });

        // Wait for cleanup and new effects
        await act(async () => {
          await Promise.resolve();
        });

        expect(result.current.result.id).not.toBe(initialId);
        // First instance disposed from useEffect cleanup
        expect(disposeLog).toContain(initialId);
      });
    });

    describe("signal auto-tracking", () => {
      it("should auto-dispose signals created inside factory", async () => {
        let createdSignal: ReturnType<typeof signal<number>> | null = null;

        const { unmount } = renderHook(
          () => {
            const controller = useSafeFactory(() => {
              // Create signal inside factory - should be auto-tracked
              createdSignal = signal(0, { name: "autoTracked" });
              return { value: 42 };
            }, []);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        // Wait for effects
        await act(async () => {
          await Promise.resolve();
        });

        // Signal should exist and not be disposed
        expect(createdSignal).not.toBeNull();
        expect(createdSignal!.disposed()).toBe(false);

        // Unmount - should dispose the signal
        unmount();

        await act(async () => {
          await Promise.resolve();
        });

        // Signal should be disposed (set throws, disposed flag is true)
        expect(createdSignal!.disposed()).toBe(true);
        expect(() => createdSignal!.set(1)).toThrow();
      });

      it("should auto-dispose multiple signals created inside factory", async () => {
        let sig1: ReturnType<typeof signal<number>> | null = null as any;
        let sig2: ReturnType<typeof signal<string>> | null = null as any;
        let computedSig: Computed<number> | null = null as any;

        const { unmount } = renderHook(
          () => {
            const controller = useSafeFactory(() => {
              sig1 = signal(1, { name: "sig1" });
              sig2 = signal("hello", { name: "sig2" });
              // Computed signal depends on sig1
              computedSig = signal({ sig1 }, ({ deps }) => deps.sig1 * 2);
              return { sig1, sig2, computedSig };
            }, []);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        // All signals should work before unmount
        expect(sig1!()).toBe(1);
        expect(sig2!()).toBe("hello");
        expect(computedSig!()).toBe(2);
        expect(sig1!.disposed()).toBe(false);
        expect(sig2!.disposed()).toBe(false);
        expect(computedSig!.disposed()).toBe(false);

        unmount();

        await act(async () => {
          await Promise.resolve();
        });

        // All signals should be disposed
        expect(sig1!.disposed()).toBe(true);
        expect(sig2!.disposed()).toBe(true);
        expect(computedSig!.disposed()).toBe(true);
      });

      it("should not require explicit dispose array when signals are created inside factory", async () => {
        let count: ReturnType<typeof signal<number>> | null = null;

        const { unmount } = renderHook(
          () => {
            const controller = useSafeFactory(() => {
              count = signal(0);
              // No need to return { dispose: [count] } or disposable()
              return { count };
            }, []);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        // Can use the signal normally
        expect(count!()).toBe(0);
        expect(count!.disposed()).toBe(false);
        count!.set(5);
        expect(count!()).toBe(5);

        unmount();

        await act(async () => {
          await Promise.resolve();
        });

        // Signal auto-disposed
        expect(count!.disposed()).toBe(true);
        expect(() => count!.set(10)).toThrow();
      });

      it("should dispose signals on deps change", async () => {
        let prevSignal: ReturnType<typeof signal<number>> | null = null as any;

        const { rerender } = renderHook(
          ({ dep }) => {
            const controller = useSafeFactory(() => {
              prevSignal = signal(dep);
              return { value: dep };
            }, [dep]);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { initialProps: { dep: 1 }, wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        const firstSignal = prevSignal;
        expect(firstSignal!()).toBe(1);
        expect(firstSignal!.disposed()).toBe(false);

        // Change deps - should create new signal and dispose old one
        rerender({ dep: 2 });

        await act(async () => {
          await Promise.resolve();
        });

        // Old signal should be disposed (disposeRef.current?.() runs synchronously on deps change)
        expect(firstSignal!.disposed()).toBe(true);
        // New signal should work
        expect(prevSignal!()).toBe(2);
        expect(prevSignal!.disposed()).toBe(false);
      });

      it("should handle factory errors and still dispose tracked signals", async () => {
        let trackedSignal: ReturnType<typeof signal<number>> | null = null;
        let errorCaught = false;

        renderHook(
          () => {
            try {
              return useSafeFactory(() => {
                trackedSignal = signal(42);
                throw new Error("Factory error");
              }, []);
            } catch {
              errorCaught = true;
              return null;
            }
          },
          { wrapper }
        );

        // Error should be caught
        expect(errorCaught).toBe(true);

        // Signal created before error should be disposed
        expect(trackedSignal).not.toBeNull();
        expect(trackedSignal!.disposed()).toBe(true);
      });

      it("should work with orphan disposal in StrictMode", async () => {
        if (!isStrictMode) return; // Only test in StrictMode

        let lastSignal: ReturnType<typeof signal<number>> | null = null;

        const { result } = renderHook(
          () => {
            const controller = useSafeFactory(() => {
              const sig = signal(0, {
                name: `sig-${Math.random().toString(36).slice(2, 6)}`,
              });
              lastSignal = sig;
              return { sig };
            }, []);

            React.useEffect(() => {
              controller.commit();
              return () => controller.scheduleDispose();
            }, [controller]);

            return controller;
          },
          { wrapper }
        );

        await act(async () => {
          await Promise.resolve();
        });

        // In StrictMode, first signal (orphan) should be disposed
        // The committed signal should still work (not disposed)
        expect(lastSignal!.disposed()).toBe(false);
      });
    });
  }
);
