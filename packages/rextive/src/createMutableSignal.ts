import { Emitter, emitter } from "./utils/emitter";
import { guardDisposed } from "./utils/guardDisposed";
import {
  MutableSignal,
  SignalContext,
  SignalMap,
  SignalOptions,
  HydrateStatus,
} from "./types";
import { scheduleNotification } from "./batch";
import { SIGNAL_TYPE } from "./is";
import { FallbackError } from "./signal";
import { resolveEquals } from "./utils/resolveEquals";
import { pipeSignals } from "./utils/pipeSignals";
import { createComputedSignal } from "./createComputedSignal";
import { createSignalContext } from "./createSignalContext";
import { Tag } from "./tag";

/**
 * Create a mutable signal (no dependencies)
 * Has: set(), hydrate()
 * No: pause(), resume()
 */
export function createMutableSignal(
  deps: SignalMap, // Always empty {} for mutable signals
  fn: (context: SignalContext) => any,
  options: SignalOptions<any> = {},
  initialValue: { value: any } | undefined,
  createContext: (
    deps: SignalMap,
    onCleanup: Emitter,
    onDepChange: VoidFunction,
    onRefresh?: () => void,
    onStale?: () => void
  ) => any
): MutableSignal<any> {
  const {
    equals: equalsOption,
    name,
    fallback,
    onChange: onChangeCallbacks,
    onError: onErrorCallbacks,
    tags,
    lazy = true,
  } = options as SignalOptions<any> & { tags?: readonly Tag<any, "mutable">[] };

  // Resolve equals option to actual function (handles string shortcuts)
  const equals = resolveEquals(equalsOption) || Object.is;

  const onChange = emitter<void>();
  const onChangeValue = emitter<any>();
  if (onChangeCallbacks) {
    onChangeValue.on(onChangeCallbacks);
  }

  const onErrorValue = emitter<unknown>();
  if (onErrorCallbacks) {
    onErrorValue.on(onErrorCallbacks);
  }

  const onCleanup = emitter<void>();

  let current: { value: any; error?: unknown } | undefined = initialValue;
  let disposed = false;
  let context: ReturnType<typeof createContext> | undefined;
  let instanceRef: MutableSignal<any> | undefined;
  let hasBeenModified = false; // Track if signal has been modified (for hydrate)
  let refreshScheduled = false; // Track if refresh is scheduled (for batching)
  let whenUnsubscribers: VoidFunction[] = []; // Store when() subscriptions separately

  const isDisposed = () => disposed;

  const dispose = () => {
    if (disposed) return;
    context?.dispose();
    disposed = true;
    context = undefined;

    if (tags && tags.length > 0 && instanceRef) {
      tags.forEach((tag) => (tag as any)._remove(instanceRef));
    }

    // Cleanup when() subscriptions
    whenUnsubscribers.forEach((unsub) => unsub());
    whenUnsubscribers = [];

    onChange.clear();
    onCleanup.emitAndClear();
  };

  const recompute = () => {
    if (disposed) {
      throw new Error("Cannot recompute disposed signal");
    }

    onCleanup.emitAndClear();
    context?.dispose();

    context = createContext(
      deps,
      onCleanup,
      recompute,
      () => recompute(), // onRefresh
      () => {
        current = undefined;
      } // onStale
    );

    try {
      const result = fn(context);

      const hadError = current?.error;
      const changed = hadError || !equals(current?.value, result);

      if (changed) {
        current = { value: result };
      }

      if (changed) {
        scheduleNotification(() => {
          onChangeValue.emit(result);
          onChange.emit();
        });
      }
    } catch (error) {
      onErrorValue.emit(error);

      if (fallback) {
        try {
          const fallbackValue = fallback(error);
          const changed =
            current?.error || !equals(current?.value, fallbackValue);

          if (changed) {
            current = { value: fallbackValue };
            scheduleNotification(() => {
              onChangeValue.emit(fallbackValue);
              onChange.emit();
            });
          }
        } catch (fallbackError) {
          current = {
            error: new FallbackError(error, fallbackError, name),
            value: undefined,
          };
          // Don't throw - just store error state
        }
      } else {
        current = { error, value: undefined };
        // Don't throw - just store error state
      }
    } finally {
      // Mark computation as complete - allow context.refresh() and context.stale() to be called
      context._endComputing();
    }
  };

  const get = () => {
    if (!current && !disposed) {
      recompute();
    }

    if (current?.error) {
      throw current.error;
    }

    return current!.value;
  };

  const reset = guardDisposed(
    isDisposed,
    "Cannot reset disposed signal",
    () => {
      const prevValue = current?.value;
      current = initialValue;
      hasBeenModified = false; // Clear modified flag on reset

      // Recompute to get new value
      recompute();

      // Notify only if value actually changed or there's an error
      if (!current || current.error || !equals(prevValue, current.value)) {
        scheduleNotification(() => onChange.emit());
      }
    }
  );

  const set = guardDisposed(
    isDisposed,
    "Cannot set value on disposed signal",
    (value: any) => {
      const next = typeof value === "function" ? value(get()) : value;

      if (equals(current?.value, next)) return;
      hasBeenModified = true; // Mark as modified
      current = { value: next };
      scheduleNotification(() => {
        onChangeValue.emit(next);
        onChange.emit();
      });
    }
  );

  const on = (listener: VoidFunction) => {
    if (!current && Object.keys(deps).length > 0) {
      get();
    }
    return onChange.on(listener);
  };

  // Hydrate for mutable signals - skip if already modified
  const hydrate = (value: any): HydrateStatus => {
    if (hasBeenModified) {
      // Already modified (via set), skip hydration
      return "skipped";
    }
    // Not modified yet, apply hydration
    set(value);
    hasBeenModified = false; // Reset flag - hydration doesn't count as user modification
    return "success";
  };

  const pipe = function (...operators: Array<(source: any) => any>): any {
    return pipeSignals(instance, operators);
  };

  const to = function (
    selector: (value: any, context: SignalContext) => any
  ): any {
    return createComputedSignal(
      { source: instance } as any,
      (ctx: any) => selector(ctx.deps.source, ctx),
      {},
      createSignalContext,
      undefined // _signal parameter (unused)
    );
  };

  const refresh = guardDisposed(
    isDisposed,
    "Cannot refresh disposed signal",
    () => {
      // Batch multiple refresh calls into a single recomputation
      if (refreshScheduled) return;

      refreshScheduled = true;
      // Use queueMicrotask to batch multiple synchronous refresh() calls
      queueMicrotask(() => {
        if (!refreshScheduled) return; // Already processed
        refreshScheduled = false;
        recompute();
      });
    }
  );

  const stale = guardDisposed(
    isDisposed,
    "Cannot mark disposed signal as stale",
    () => {
      // Mark signal as stale - will recompute on next access
      current = undefined;
    }
  );

  const when = guardDisposed(
    isDisposed,
    "Cannot attach when() listener to disposed signal",
    (target: any, callback: any) => {
      const targets = Array.isArray(target) ? target : [target];

      // Subscribe to each target signal
      targets.forEach((targetSignal) => {
        const unsubscribe = targetSignal.on(() => {
          callback(instance, targetSignal);
        });

        // Store unsubscribe function to clean up on disposal (not on recompute)
        whenUnsubscribers.push(unsubscribe);
      });

      return instance;
    }
  );

  const instance = Object.assign(get, {
    [SIGNAL_TYPE]: true,
    displayName: name,
    get,
    on,
    dispose,
    set,
    reset,
    toJSON: get,
    hydrate,
    pipe,
    to,
    refresh,
    stale,
    when,
  });

  instanceRef = instance as unknown as MutableSignal<any>;

  if (tags && tags.length > 0) {
    tags.forEach((tag) => (tag as any)._add(instanceRef!));
  }

  if (!lazy) {
    instance.get();
  }

  return instance as unknown as MutableSignal<any>;
}
