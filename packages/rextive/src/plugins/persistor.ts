import type { AnySignal, Plugin, Signal } from "../types";
import { isPromiseLike } from "../utils/isPromiseLike";

/**
 * Persisted values type - partial record with nullable values
 */
export type PersistedValues<
  TData extends Record<string, any> = Record<string, any>
> = Partial<{
  [K in keyof TData]: TData[K] | null;
}>;

/**
 * Save arguments - discriminated union for merge vs overwrite operations
 */
export type SaveArgs<TData extends Record<string, any> = Record<string, any>> =
  | {
      /** Partial update - caller should merge with existing data */
      type: "merge";
      values: Partial<TData>;
    }
  | {
      /** Full update - caller can overwrite existing data */
      type: "overwrite";
      values: TData;
    };

/**
 * Options for creating a persistor
 */
export type PersistorOptions<
  TData extends Record<string, any> = Record<string, any>
> = {
  /**
   * Load persisted values.
   * Called when starting persistence.
   *
   * **Memoization:** The `load()` function is called only once and the result is cached.
   * All signals (individual or group) share the same cached result. This means:
   * - Multiple `persist("key")` plugins will NOT call `load()` multiple times
   * - Concurrent calls are deduplicated (only one in-flight request)
   * - Group mode reuses the same cached result
   *
   * @returns Partial map of values (only loaded keys included)
   *
   * @example
   * ```ts
   * load: () => {
   *   // Called only once, even with multiple signals
   *   return JSON.parse(localStorage.getItem("state") || "{}");
   * }
   * ```
   */
  load?: () => PersistedValues<TData> | Promise<PersistedValues<TData>>;

  /**
   * Save values.
   * Called whenever any signal changes.
   *
   * The `type` field indicates how the caller should handle the values:
   * - `"merge"` - Partial update (individual mode). Caller should merge with existing data.
   * - `"overwrite"` - Full update (group mode). Caller can safely overwrite existing data.
   *
   * @param args - Save arguments with type discriminator and values
   *
   * @example Handle both merge and overwrite
   * ```ts
   * save: (args) => {
   *   if (args.type === "merge") {
   *     const existing = JSON.parse(localStorage.getItem("state") || "{}");
   *     localStorage.setItem("state", JSON.stringify({ ...existing, ...args.values }));
   *   } else {
   *     // Overwrite - we have the full shape
   *     localStorage.setItem("state", JSON.stringify(args.values));
   *   }
   * }
   * ```
   */
  save?: (args: SaveArgs<TData>) => void;

  /**
   * Error handling - fires for both load and save errors.
   * @param error - The error that occurred
   * @param type - Which operation failed: "load" or "save"
   */
  onError?: (error: unknown, type: "load" | "save") => void;
};

/**
 * A persistor function that can be used as:
 * 1. Plugin factory: `persistor("key")` → returns Plugin for individual signal
 * 2. GroupPlugin: `persistor(signals)` → returns cleanup function for signal group
 */
export interface Persistor<
  TData extends Record<string, any> = Record<string, any>
> {
  /**
   * Create a plugin for a single signal with the given key.
   * The key must be a valid key from the data shape.
   *
   * @param key - The storage key for this signal (must be keyof TData)
   * @returns A Plugin that persists the signal
   *
   * @example
   * ```ts
   * type MyData = { count: number; name: string };
   * const persist = persistor<MyData>({ load, save });
   *
   * const count = signal(0, { use: [persist("count")] }); // ✅
   * const name = signal("", { use: [persist("name")] });  // ✅
   * // persist("invalid") // ❌ TypeScript error
   * ```
   */
  <K extends keyof TData & string>(key: K): Plugin<TData[K], "any">;

  /**
   * Apply persistence to a group of signals.
   * Acts as a GroupPlugin - returns cleanup function.
   *
   * @param signals - Record of signal names to signal instances
   * @returns Cleanup function to stop persistence
   *
   * @example
   * ```ts
   * const persist = persistor({ load, save });
   * const cleanup = signal.use({ count, name }, [persist]);
   * ```
   */
  <T extends Record<string, AnySignal<any>>>(signals: T): VoidFunction;
}

/**
 * Create a persistor that can be used as both:
 * - A plugin factory: `persistor("key")` for individual signals
 * - A group plugin: `signal.use(signals, [persistor])` for multiple signals
 *
 * @typeParam TData - The shape of persisted data (default: Record<string, any>)
 * @param options - Persistence options (load, save, onError)
 * @returns A dual-purpose persistor function
 *
 * @example Type-safe localStorage persistence
 * ```ts
 * import { signal } from "rextive";
 * import { persistor } from "rextive/plugins";
 *
 * // Define your data shape
 * type AppState = { count: number; name: string };
 *
 * const persist = persistor<AppState>({
 *   // load() is memoized - called only once even with multiple signals
 *   load: () => JSON.parse(localStorage.getItem("state") || "{}"),
 *
 *   // save() receives { type, values } - handle merge vs overwrite
 *   save: (args) => {
 *     if (args.type === "merge") {
 *       // Individual mode - merge with existing
 *       const existing = JSON.parse(localStorage.getItem("state") || "{}");
 *       localStorage.setItem("state", JSON.stringify({ ...existing, ...args.values }));
 *     } else {
 *       // Group mode - safe to overwrite
 *       localStorage.setItem("state", JSON.stringify(args.values));
 *     }
 *   },
 * });
 *
 * // Type-safe keys - only "count" and "name" allowed
 * const count = signal(0, { use: [persist("count")] }); // ✅
 * const name = signal("", { use: [persist("name")] });  // ✅
 * // persist("invalid") // ❌ TypeScript error
 *
 * // Group mode - type: "overwrite", values: { count, name }
 * signal.use({ count, name }, [persist]);
 * ```
 */
export function persistor<
  TData extends Record<string, any> = Record<string, any>
>(options: PersistorOptions<TData> = {}): Persistor<TData> {
  const { load, save, onError } = options;

  // Track cleanup functions for individual plugin mode
  const cleanups = new Map<string, VoidFunction>();

  // Memoized load - only call load() once, cache the result
  let loadCache: PersistedValues<TData> | null = null;
  let loadPromise: Promise<PersistedValues<TData>> | null = null;

  const getLoadedValues = async (): Promise<PersistedValues<TData>> => {
    if (!load) return {} as PersistedValues<TData>;

    // Return cached value if already loaded
    if (loadCache !== null) return loadCache;

    // Return in-flight promise if currently loading (deduplication)
    if (loadPromise !== null) return loadPromise;

    // Start new load
    try {
      const result = load();
      if (isPromiseLike(result)) {
        loadPromise = result
          .then((values) => {
            loadCache = values;
            loadPromise = null;
            return values;
          })
          .catch((error) => {
            loadPromise = null;
            if (onError) onError(error, "load");
            return {} as PersistedValues<TData>;
          });
        return loadPromise;
      } else {
        loadCache = result;
        return result;
      }
    } catch (error) {
      if (onError) onError(error, "load");
      return {} as PersistedValues<TData>;
    }
  };

  // Save a single key (individual mode) - type: "merge"
  const saveKey = (key: string, value: any) => {
    if (!save) return;

    try {
      const result = save({
        type: "merge",
        values: { [key]: value },
      } as SaveArgs<TData>);
      if (isPromiseLike(result)) {
        result.then(null, (error) => {
          if (onError) onError(error, "save");
        });
      }
    } catch (error) {
      if (onError) onError(error, "save");
    }
  };

  // Safe hydration that won't throw if signal is disposed
  const safeHydrate = (signal: AnySignal<any>, value: any) => {
    try {
      (signal as any).hydrate?.(value);
    } catch {
      // Signal may have been disposed - ignore
    }
  };

  // Load values for a specific key (individual mode)
  const loadForKey = async (key: string, signal: AnySignal<any>) => {
    const values = await getLoadedValues();

    if (key in (values as Record<string, any>)) {
      const value = (values as Record<string, any>)[key];
      if (value !== null && value !== undefined) {
        safeHydrate(signal, value);
      }
    }
  };

  // The dual-purpose function
  function persistorFn(keyOrSignals: string | Record<string, AnySignal<any>>) {
    // Check if it's a string key (individual plugin mode)
    if (typeof keyOrSignals === "string") {
      const key = keyOrSignals;

      // Return a Plugin
      return ((signal: AnySignal<any>) => {
        // Load initial value
        loadForKey(key, signal);

        // Subscribe to changes - save only this key
        const unsub = signal.on(() => {
          saveKey(key, signal());
        });

        // Store cleanup
        cleanups.set(key, unsub);

        // Return cleanup function
        return () => {
          unsub();
          cleanups.delete(key);
        };
      }) as Plugin<any, "any">;
    }

    // Group plugin mode - keyOrSignals is a signals record
    const signals = keyOrSignals;
    const groupCleanups: VoidFunction[] = [];

    // Get current values of all signals
    const getCurrentValues = (): TData => {
      const values: Record<string, any> = {};
      for (const key in signals) {
        values[key] = (signals[key] as Signal<any>)();
      }
      return values as TData;
    };

    // Save all values (group mode) - type: "overwrite"
    const saveGroup = () => {
      if (!save) return;

      try {
        const values = getCurrentValues();
        const result = save({ type: "overwrite", values });
        if (isPromiseLike(result)) {
          result.then(null, (error) => {
            if (onError) onError(error, "save");
          });
        }
      } catch (error) {
        if (onError) onError(error, "save");
      }
    };

    // Load initial values (uses memoized getLoadedValues)
    const loadGroup = async () => {
      const loaded = await getLoadedValues();

      for (const key in loaded) {
        if (key in signals) {
          const signal = signals[key];
          const value = (loaded as Record<string, any>)[key];
          if (value !== null && value !== undefined) {
            safeHydrate(signal, value);
          }
        }
      }
    };

    // Start loading
    loadGroup();

    // Subscribe to all signals
    for (const key in signals) {
      const signal = signals[key] as Signal<any>;
      const unsub = signal.on(() => {
        saveGroup();
      });
      groupCleanups.push(unsub);
    }

    // Return cleanup function
    return () => {
      for (const cleanup of groupCleanups) {
        cleanup();
      }
    };
  }

  return persistorFn as Persistor<TData>;
}

