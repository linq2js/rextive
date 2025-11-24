import { Emitter, emitter } from "./utils/emitter";
import { guardDisposed } from "./utils/guardDisposed";
import {
  MutableSignal,
  ComputedSignal,
  SignalContext,
  SignalMap,
  SignalOptions,
  HydrateStatus,
} from "./types";
import { scheduleNotification } from "./batch";
import { mapSignal } from "./utils/mapSignal";
import { scanSignal } from "./utils/scanSignal";
import { SIGNAL_TYPE } from "./is";
import { FallbackError } from "./signal";
import { resolveEquals } from "./utils/resolveEquals";

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
    onDepChange: VoidFunction
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
  } = options;

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

  const isDisposed = () => disposed;

  const dispose = () => {
    if (disposed) return;
    context?.dispose();
    disposed = true;
    context = undefined;

    if (tags && tags.length > 0 && instanceRef) {
      tags.forEach((tag) => (tag as any)._remove(instanceRef));
    }

    onChange.clear();
    onCleanup.emitAndClear();
  };

  const recompute = () => {
    if (disposed) {
      throw new Error("Cannot recompute disposed signal");
    }

    onCleanup.emitAndClear();
    context?.dispose();

    context = createContext(deps, onCleanup, recompute);

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

  const map = function <U>(
    fn: (value: any) => U,
    equalsOrOptions?: "is" | "shallow" | "deep" | ((a: U, b: U) => boolean) | SignalOptions<U>
  ): ComputedSignal<U> {
    return mapSignal(instance, fn, equalsOrOptions);
  };

  const scan = function <U>(
    fn: (accumulator: U, current: any) => U,
    initialValue: U,
    equalsOrOptions?: "is" | "shallow" | "deep" | ((a: U, b: U) => boolean) | SignalOptions<U>
  ): ComputedSignal<U> {
    return scanSignal(instance, fn, initialValue, equalsOrOptions);
  };

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
    map,
    scan,
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

