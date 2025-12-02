import { Emitter, emitter } from "./utils/emitter";
import { guardDisposed } from "./utils/guardDisposed";
import {
  Computed,
  ComputedSignalContext,
  SignalMap,
  SignalOptions,
  HydrateStatus,
  UseList,
  SingleOrMultipleListeners,
} from "./types";
import { scheduleNotification } from "./batch";
import { SIGNAL_TYPE } from "./is";
import { FallbackError } from "./common";
import { resolveEquals } from "./utils/resolveEquals";
import { pipeSignals } from "./utils/pipeSignals";
import { createSignalContext } from "./createSignalContext";
import { attacher } from "./attacher";
import { getHooks, emit } from "./hooks";
import { nextName, nextUid } from "./utils/nameGenerator";
import { resolveSelectorsRequired } from "./operators/resolveSelectors";
import {
  trackAsyncError,
  addErrorTrace,
  type SignalErrorWhen,
} from "./utils/errorTracking";

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
    onStale?: () => void,
    nth?: number
  ) => any,
  _signal: any // Pass signal function to avoid circular dependency (unused here)
): Computed<any> {
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

  // Generate unique ID (immutable, auto-generated)
  const uid = nextUid();

  // Generate display name: use provided name or auto-generate for devtools
  const displayName = name ?? nextName("computed");

  const onChange = emitter<void>();

  const mapValue = () => {
    if (current && !current.error) {
      return { value: current.value };
    }
    return undefined;
  };
  const onChangeValue = (listener: SingleOrMultipleListeners<any>) => {
    return onChange.on(mapValue, listener);
  };

  if (onChangeCallbacks) {
    onChangeValue(onChangeCallbacks);
  }
  // Notify devtools on value change (only subscribe if devtools is enabled)
  if (getHooks().hasDevTools()) {
    onChangeValue((value) => {
      emit.signalChange(instanceRef!, value);
    });
  }

  /**
   * Handle error - add trace info, trigger callbacks and devtools notification
   */
  const throwError = (
    error: unknown,
    when: SignalErrorWhen,
    async: boolean
  ) => {
    // Add trace info to error for debugging
    addErrorTrace(error, { signal: displayName, when, async });

    // Trigger user-provided onError callbacks
    if (onErrorCallbacks) {
      if (Array.isArray(onErrorCallbacks)) {
        onErrorCallbacks.forEach((cb) => cb(error));
      } else {
        onErrorCallbacks(error);
      }
    }
    // Notify devtools about error
    emit.signalError(instanceRef!, error);
  };

  const onCleanup = emitter<void>();

  let current: { value: any; error?: unknown } | undefined = undefined;
  let disposed = false;
  let context: ReturnType<typeof createContext> | undefined;
  let instanceRef: Computed<any> | undefined;
  let isPaused = false;
  let hasComputed = false; // Track if signal has been computed (for hydrate)
  let refreshScheduled = false; // Track if refresh is scheduled (for batching)
  let recomputationCount = 0; // Track number of recomputations (0 = first computation)
  const onDispose = emitter<void>();

  /**
   * Track async errors for Promise values.
   * When signal value is a Promise, this attaches a rejection handler.
   * The error is only captured if the Promise is still current (not stale from refresh).
   */
  const handleAsyncError = (when: SignalErrorWhen) => {
    trackAsyncError(
      () => current,
      (error) => {
        // Update current with error (no need to keep Promise value since signal() throws anyway)
        current = { value: undefined, error };

        // Trigger error callbacks and devtools (async = true)
        throwError(error, when, true);

        // Notify subscribers that error state changed
        scheduleNotification(() => {
          onChange.emit();
        });
      }
    );
  };

  const isDisposed = () => disposed;

  const dispose = () => {
    if (disposed) return;
    context?.dispose();
    onChange.clear();
    onCleanup.emitAndClear();
    onDispose.emitAndClear();
    disposed = true;
    context = undefined;
    deps = undefined as any;

    // Notify devtools
    emit.signalDispose(instanceRef!);
  };

  const recompute = (when: SignalErrorWhen) => {
    if (disposed) {
      throw new Error("Cannot recompute disposed signal");
    }

    // Increment recomputation count (unless it's the initial computation)
    if (hasComputed) {
      recomputationCount++;
    }

    onCleanup.emitAndClear();
    context?.dispose();

    context = createContext(
      deps,
      onCleanup,
      () => {
        // Called when deps change
        if (!isPaused) {
          recompute("compute:dependency");
        }
      },
      () => {
        // onRefresh callback
        recompute("compute:refresh");
      },
      () => {
        current = undefined;
      }, // onStale
      recomputationCount // Pass nth recomputation to context
    );

    try {
      const result = fn(context);
      hasComputed = true;

      const hadError = current?.error;
      // check if current is undefined or null or error is different from result
      const changed = hadError || !current || !equals(current?.value, result);

      if (changed) {
        current = { value: result };

        // Track async errors for Promise values
        handleAsyncError(when);
      }

      if (changed) {
        scheduleNotification(() => {
          onChange.emit();
        });
      }
    } catch (error) {
      // Trigger error callbacks and devtools (sync error)
      throwError(error, when, false);

      const hadValue = current && !current.error;

      if (fallback) {
        try {
          const fallbackValue = fallback(error);
          const changed =
            current?.error || !equals(current?.value, fallbackValue);

          if (changed) {
            current = { value: fallbackValue };
            scheduleNotification(() => {
              onChange.emit();
            });
          }
        } catch (fallbackError) {
          current = {
            error: new FallbackError(error, fallbackError, displayName),
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
    getHooks().onSignalAccess(instance);
    // Allow reading last value/error even after disposal
    // Only recompute if not disposed and no current value
    if (!current && !disposed) {
      recompute("compute:initial");
    }

    if (current?.error) {
      throw current.error;
    }

    return current!.value;
  };

  /**
   * Peek at current signal value WITHOUT triggering reactive tracking
   *
   * Same as get() but does NOT call getHooks().onSignalAccess().
   * Use this when you need to read a value without creating a dependency.
   */
  const peek = () => {
    // NOTE: No getHooks().onSignalAccess() call - this is the key difference from get()

    // Allow reading last value/error even after disposal
    // Only recompute if not disposed and no current value
    if (!current && !disposed) {
      recompute("compute:initial");
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
      recomputationCount = 0; // Reset recomputation count
      recompute("compute:initial");

      // Always notify on reset (value changed, error state changed, or recomputed)
      scheduleNotification(() => onChange.emit());
    }
  );

  const on = (listener: VoidFunction) => {
    if (!current && Object.keys(deps).length > 0) {
      // Use peek() instead of get() to avoid triggering render tracking
      // when subscribing. We just need to ensure the signal is computed,
      // not to track it for render purposes.
      peek();
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
    recompute("compute:refresh");
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

    // Track async errors for Promise values (hydrate is like initial compute)
    handleAsyncError("compute:initial");

    return "success" as const;
  };

  const pipe = function (...operators: Array<(source: any) => any>): any {
    return pipeSignals(instance, operators);
  };

  const to = function (
    first: (value: any, ctx: any) => any,
    ...rest: any[]
  ): any {
    const [selector, options] = resolveSelectorsRequired([first, ...rest]);

    return createComputedSignal(
      { source: instance } as any,
      (ctx: any) => selector(ctx.deps.source, ctx),
      options,
      createSignalContext,
      undefined
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
        recompute("compute:refresh");
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

  /**
   * React to changes in notifier signal(s) by executing an action.
   *
   * For computed signals, only action-based overload is supported.
   * Actions: "refresh" (immediate recompute) or "stale" (lazy recompute).
   * "reset" is NOT supported for computed signals.
   *
   * @param notifier - Single signal or array of signals to watch
   * @param action - "refresh" or "stale"
   * @param filter - Optional filter function
   * @param options - Optional configuration
   * @returns this - for chaining
   */
  const when = (
    notifier: any | readonly any[],
    action: "refresh" | "stale",
    filter?: (self: Computed<any>, notifier: any) => boolean
  ) => {
    // Ensure instance is created
    const self = instanceRef!;

    // Validate action - "reset" is not allowed for computed signals
    if ((action as string) === "reset") {
      throw new Error(
        'Computed signals do not support "reset" action. Use "refresh" or "stale" instead.'
      );
    }

    // Normalize notifiers to array
    const notifiers = Array.isArray(notifier) ? notifier : [notifier];

    for (const n of notifiers) {
      const unsubscribe = n.on(() => {
        try {
          // Run filter if provided - receives (self, notifier) signals
          if (filter) {
            const shouldProceed = filter(self, n);
            if (!shouldProceed) return;
          }

          // Execute action
          if (action === "refresh") {
            self.refresh();
          } else if (action === "stale") {
            self.stale();
          }
        } catch (error) {
          // Filter threw - route through signal's error handling, skip action
          throwError(error, "when:filter", false);
        }
      });

      onDispose.on(unsubscribe);
    }

    return self;
  };

  const instance: Computed<any> = Object.assign(get, {
    [SIGNAL_TYPE]: true,
    uid,
    displayName,
    get,
    peek,
    on,
    dispose,
    disposed: isDisposed,
    error: () => {
      getHooks().onSignalAccess(instance);
      // Ensure computation runs if lazy
      if (!current && !disposed) {
        recompute("compute:initial");
      }
      return current?.error;
    },
    tryGet: () => {
      getHooks().onSignalAccess(instance);
      // Ensure computation runs if lazy
      if (!current && !disposed) {
        recompute("compute:initial");
      }
      // Return undefined if error, otherwise return value
      return current?.error ? undefined : current?.value;
    },
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

  instanceRef = instance as unknown as Computed<any>;

  attacher(instanceRef, onDispose).attach(use);

  // Notify devtools of signal creation
  emit.signalCreate(instanceRef);

  if (!lazy) {
    try {
      instance.get();
    } catch {
      // Ignore errors during eager computation
    }
  }

  return instance as unknown as Computed<any>;
}
