import { Emitter, emitter } from "./utils/emitter";
import { guardDisposed } from "./utils/guardDisposed";
import {
  Computed,
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
import { nextName } from "./utils/nameGenerator";

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

  // Generate display name: use provided name or auto-generate for devtools
  const displayName = name ?? nextName("computed");

  const onChange = emitter<void>();
  const onChangeValue = emitter<any>();
  if (onChangeCallbacks) {
    onChangeValue.on(onChangeCallbacks);
  }
  // Notify devtools on value change (only subscribe if devtools is enabled)
  if (globalThis.__REXTIVE_DEVTOOLS__) {
    onChangeValue.on((value) => {
      globalThis.__REXTIVE_DEVTOOLS__?.onSignalChange?.(instanceRef!, value);
    });
  }

  const onErrorValue = emitter<unknown>();
  if (onErrorCallbacks) {
    onErrorValue.on(onErrorCallbacks);
  }
  // Notify devtools on error (only subscribe if devtools is enabled)
  if (globalThis.__REXTIVE_DEVTOOLS__) {
    onErrorValue.on((error) => {
      globalThis.__REXTIVE_DEVTOOLS__?.onSignalError?.(instanceRef!, error);
    });
  }

  const onCleanup = emitter<void>();

  let current: { value: any; error?: unknown } | undefined = undefined;
  let disposed = false;
  let context: ReturnType<typeof createContext> | undefined;
  let instanceRef: Computed<any> | undefined;
  let isPaused = false;
  let hasComputed = false; // Track if signal has been computed (for hydrate)
  let refreshScheduled = false; // Track if refresh is scheduled (for batching)
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

    // Notify devtools
    globalThis.__REXTIVE_DEVTOOLS__?.onSignalDispose?.(instanceRef!);
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

  const to = function (
    first: (value: any, ctx: any) => any,
    ...rest: any[]
  ): any {
    // Check if last argument is options (not a function)
    const lastArg = rest[rest.length - 1];
    const hasOptions =
      rest.length > 0 && lastArg !== undefined && typeof lastArg !== "function";
    const opts = hasOptions ? resolveToOptions(lastArg) : {};
    const selectors = hasOptions ? rest.slice(0, -1) : rest;

    if (selectors.length === 0) {
      // Single selector - pass context
      return createComputedSignal(
        { source: instance } as any,
        (ctx: any) => first(ctx.deps.source, ctx),
        opts,
        createSignalContext,
        undefined
      );
    }

    // Multiple selectors - chain them left-to-right, all receive context
    return createComputedSignal(
      { source: instance } as any,
      (ctx: any) => {
        let result = first(ctx.deps.source, ctx);
        for (const selector of selectors) {
          result = selector(result, ctx);
        }
        return result;
      },
      opts,
      createSignalContext,
      undefined
    );
  };

  /** Convert ToOptions to SignalOptions */
  function resolveToOptions(options: any): any {
    if (typeof options === "string") {
      return { equals: options };
    }
    return options || {};
  }

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

  const instance = Object.assign(get, {
    [SIGNAL_TYPE]: true,
    displayName,
    get,
    on,
    dispose,
    disposed: isDisposed,
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
  });

  instanceRef = instance as unknown as Computed<any>;

  attacher(instanceRef, onDispose).attach(use);

  // Notify devtools of signal creation
  globalThis.__REXTIVE_DEVTOOLS__?.onSignalCreate?.(instanceRef);

  if (!lazy) {
    try {
      instance.get();
    } catch {
      // Ignore errors during eager computation
    }
  }

  return instance as unknown as Computed<any>;
}
