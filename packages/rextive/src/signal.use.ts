import type { AnySignal, GroupPlugin } from "./types";

/**
 * Apply group plugins to multiple signals at once.
 *
 * Unlike individual plugins applied via the `use` option during signal creation,
 * `signal.use` allows applying plugins to existing signals and enables plugins
 * that need coordinated access to multiple signals.
 *
 * @param signals - Record of signal names to signal instances
 * @param plugins - Array of group plugins to apply
 * @returns Cleanup function that disposes all plugin cleanups
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const name = signal("");
 * const enabled = signal(true);
 *
 * // Apply multiple group plugins
 * const cleanup = signal.use(
 *   { count, name, enabled },
 *   [
 *     // Logger for all signals
 *     (signals) => {
 *       const unsubs = Object.entries(signals).map(([key, sig]) =>
 *         sig.on(() => console.log(`[${key}]`, sig()))
 *       );
 *       return () => unsubs.forEach(fn => fn());
 *     },
 *
 *     // Coordinated persistence
 *     (signals) => {
 *       const save = () => {
 *         localStorage.setItem('form', JSON.stringify({
 *           count: signals.count(),
 *           name: signals.name(),
 *         }));
 *       };
 *       const unsubs = [
 *         signals.count.on(save),
 *         signals.name.on(save),
 *       ];
 *       return () => unsubs.forEach(fn => fn());
 *     },
 *   ]
 * );
 *
 * // Later: cleanup all plugins
 * cleanup();
 * ```
 */
export function signalUse<TSignals extends Record<string, AnySignal<any>>>(
  signals: TSignals,
  plugins: GroupPlugin<TSignals>[]
): VoidFunction {
  const cleanups: VoidFunction[] = [];

  for (const plugin of plugins) {
    try {
      const cleanup = plugin(signals);
      if (typeof cleanup === "function") {
        cleanups.push(cleanup);
      }
    } catch (error) {
      // Clean up already-applied plugins before re-throwing
      for (const cleanup of cleanups) {
        try {
          cleanup();
        } catch {
          // Ignore cleanup errors during error handling
        }
      }
      throw error;
    }
  }

  // Return combined cleanup function
  return () => {
    // Run cleanups in reverse order (LIFO)
    for (let i = cleanups.length - 1; i >= 0; i--) {
      try {
        cleanups[i]();
      } catch (error) {
        // Log but don't throw during cleanup
        console.error("Error during signal.use cleanup:", error);
      }
    }
  };
}

