import { Emitter, emitter } from "./utils/emitter";
import { guardDisposed } from "./utils/guardDisposed";
import {
  ComputedSignal,
  ComputedSignalContext,
  SignalMap,
  SignalOptions,
  HydrateStatus,
  UseList,
} from "./types";
import { scheduleNotification } from "./batch";
import { SIGNAL_TYPE } from "./is";
import { FallbackError } from "./common";
import { resolveEquals } from "./utils/resolveEquals";
import { pipeSignals } from "./utils/pipeSignals";
import { createSignalContext } from "./createSignalContext";
import { attacher } from "./attacher";
import { getCurrent } from "./contextDispatcher";

/**
 * Create a computed signal (with dependencies)
 * Has: pause(), resume(), paused(), hydrate()
 * No: set()
 */
export function createComputedSignal(
  deps: SignalMap,
  fn: (context: ComputedSignalContext<SignalMap>) => any,
  options: SignalOptions<any> = {},
  createContext: (
    deps: SignalMap,
    onCleanup: Emitter,
    onDepChange: VoidFunction,
    onRefresh?: () => void,
    onStale?: () => void
  ) => any,
  _signal: any // Pass signal function to avoid circular dependency (unused here)
): ComputedSignal<any> {
  // Similar to createSignal but without set()
  // and with pause/resume functionality

  const {
    equals: equalsOption,
    name,
    fallback,
    onChange: onChangeCallbacks,
    onError: onErrorCallbacks,
    lazy = true,
    use = [],
  } = options as SignalOptions<any> & {
    use?: UseList<any, "computed">;
  };

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

  let current: { value: any; error?: unknown } | undefined = undefined;
  let disposed = false;
  let context: ReturnType<typeof createContext> | undefined;
  let instanceRef: ComputedSignal<any> | undefined;
  let isPaused = false;
  let hasComputed = false; // Track if signal has been computed (for hydrate)
  let refreshScheduled = false; // Track if refresh is scheduled (for batching)
  let whenUnsubscribers: VoidFunction[] = []; // Store when() subscriptions separately
  const onDispose = emitter<void>();

  const isDisposed = () => disposed;

  const dispose = () => {
    if (disposed) return;
    context?.dispose();
    onChange.clear();
    onCleanup.emitAndClear();
    onDispose.emitAndClear();
    disposed = true;
    context = undefined;

    // Cleanup when() subscriptions
    whenUnsubscribers.forEach((unsub) => unsub());
    whenUnsubscribers = [];
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
      () => {
        if (!isPaused) {
          recompute();
        }
      },
      () => recompute(), // onRefresh
      () => {
        current = undefined;
      } // onStale
    );

    try {
      const result = fn(context);
      hasComputed = true;

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

      const hadValue = current && !current.error;

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
          // Notify about error state change
          if (hadValue) {
            scheduleNotification(() => onChange.emit());
          }
        }
      } else {
        current = { error, value: undefined };
        // Notify about error state change
        if (hadValue) {
          scheduleNotification(() => onChange.emit());
        }
      }
    } finally {
      // Mark computation as complete - allow context.refresh() and context.stale() to be called
      context._endComputing();
    }
  };

  const get = () => {
    getCurrent().trackSignal(instance);
    // Allow reading last value/error even after disposal
    // Only recompute if not disposed and no current value
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
      current = undefined;
      hasComputed = false;
      recompute();

      // Always notify on reset (value changed, error state changed, or recomputed)
      scheduleNotification(() => onChange.emit());
    }
  );

  const on = (listener: VoidFunction) => {
    if (!current && Object.keys(deps).length > 0) {
      get();
    }
    return onChange.on(listener);
  };

  // Pause/Resume/Paused for computed signals
  const pause = () => {
    isPaused = true;
  };

  const resume = () => {
    if (!isPaused) return;
    isPaused = false;
    // Recompute with latest dependencies
    recompute();
    scheduleNotification(() => onChange.emit());
  };

  const paused = () => isPaused;

  // Hydrate for computed signals - skip if already computed
  const hydrate = (value: any): HydrateStatus => {
    if (hasComputed) {
      // Already computed, skip hydration
      return "skipped" as const;
    }
    // Set value without computing
    current = { value };
    hasComputed = true;
    return "success" as const;
  };

  const pipe = function (...operators: Array<(source: any) => any>): any {
    return pipeSignals(instance, operators);
  };

  const to = function (selector: (value: any, ctx: any) => any): any {
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
    reset,
    toJSON: get,
    pause,
    resume,
    paused,
    hydrate,
    pipe,
    to,
    refresh,
    stale,
    when,
  });

  instanceRef = instance as unknown as ComputedSignal<any>;

  attacher(instanceRef, onDispose).attach(use);

  if (!lazy) {
    try {
      instance.get();
    } catch {
      // Ignore errors during eager computation
    }
  }

  return instance as unknown as ComputedSignal<any>;
}
