import {
  MutableSignal,
  ComputedSignal,
  SignalContext,
  ComputedSignalContext,
  SignalMap,
  SignalOptions,
} from "./types";
import { createMutableSignal } from "./createMutableSignal";
import { createComputedSignal } from "./createComputedSignal";
import { createSignalContext } from "./createSignalContext";
import { SIGNAL_TYPE } from "./is";

export const DISPOSED_MESSAGE = "Signal is disposed";

/**
 * Check if value looks like a dependencies object (for computed signals)
 * vs a regular value (for mutable signals)
 */
function isDependenciesObject(obj: any): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }

  // Empty object {} is treated as dependencies (even with no signals)
  // This allows signal({}, () => 42) to work
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return true;
  }

  // If any property is a signal, it's definitely a dependencies object
  for (const key in obj) {
    const value = obj[key];
    if (
      value &&
      typeof value === "function" &&
      (value as any)[SIGNAL_TYPE] === true
    ) {
      return true;
    }
  }

  // Plain objects with non-signal properties are ambiguous.
  // We treat them as values (not deps) to support signal(obj, equals)
  // Users can still use signal({ obj }, () => ...) for computed signals
  return false;
}

export type SignalExports = {
  /**
   * Create mutable signal with no initial value
   * get() returns T | undefined, but set() requires T
   * @returns MutableSignal<T, undefined>
   */
  <TValue = unknown>(): MutableSignal<TValue, undefined>;

  /**
   * Create mutable signal with initial value and custom equality function/strategy
   * @param valueOrCompute - Initial value or compute function
   * @param equals - Equality strategy ('shallow', 'deep', 'is') or custom function
   * @returns MutableSignal<T>
   * @example
   * ```ts
   * // String shortcuts
   * const user = signal({ name: 'John' }, 'shallow');
   * const data = signal(complexObj, 'deep');
   *
   * // Custom function
   * const count = signal(0, (a, b) => a === b);
   * ```
   */
  <TValue>(
    valueOrCompute: TValue | ((context: SignalContext) => TValue),
    equals: "is" | "shallow" | "deep" | ((a: TValue, b: TValue) => boolean)
  ): MutableSignal<TValue>;

  /**
   * Create mutable signal with initial value and options (non-function value)
   * @param valueOrCompute - Initial value or compute function
   * @param options - Signal options
   * @returns MutableSignal<T>
   */
  <TValue>(
    valueOrCompute: TValue | ((context: SignalContext) => TValue),
    options?: SignalOptions<TValue>
  ): MutableSignal<TValue>;

  /**
   * Create computed signal from dependencies with custom equality
   * @param dependencies - Map of signals to depend on
   * @param compute - Compute function that receives dependency values
   * @param equals - Equality strategy ('shallow', 'deep', 'is') or custom function
   * @returns ComputedSignal<T>
   * @example
   * ```ts
   * // String shortcuts
   * const fullName = signal({ firstName, lastName }, ({ deps }) =>
   *   `${deps.firstName} ${deps.lastName}`, 'shallow');
   *
   * // Custom function
   * const result = signal({ a, b }, ({ deps }) =>
   *   ({ sum: deps.a + deps.b }), (x, y) => x.sum === y.sum);
   * ```
   */
  <TValue, TDependencies extends SignalMap>(
    dependencies: TDependencies,
    compute: (context: ComputedSignalContext<NoInfer<TDependencies>>) => TValue,
    equals: "is" | "shallow" | "deep" | ((a: TValue, b: TValue) => boolean)
  ): ComputedSignal<TValue>;

  /**
   * Create computed signal from dependencies with options
   * @param dependencies - Map of signals to depend on
   * @param compute - Compute function that receives dependency values
   * @param options - Signal options
   * @returns ComputedSignal<T>
   */
  <TValue, TDependencies extends SignalMap>(
    dependencies: TDependencies,
    compute: (context: ComputedSignalContext<NoInfer<TDependencies>>) => TValue,
    options?: SignalOptions<TValue>
  ): ComputedSignal<TValue>;
};

export const signal = ((...args: any[]) => {
  // overload: signal() - no arguments, creates MutableSignal<undefined>
  if (args.length === 0) {
    return createMutableSignal(
      {},
      () => undefined,
      undefined,
      { value: undefined },
      createSignalContext
    );
  }

  // Check if this is a computed signal: signal(deps, compute, options?)
  // vs mutable signal with equals: signal(value, equals)
  if (typeof args[1] === "function") {
    // If first arg is a dependencies object, it's a computed signal
    if (isDependenciesObject(args[0])) {
      // Check if third arg is equals function/string shortcut
      // signal(deps, fn, equals) -> signal(deps, fn, { equals })
      let options = args[2];
      if (typeof args[2] === "function" || typeof args[2] === "string") {
        options = { equals: args[2] };
      }

      return createComputedSignal(
        args[0],
        args[1],
        options,
        createSignalContext,
        signal
      );
    }

    // Otherwise, treat second arg as equals function
    // signal(value, equals) -> signal(value, { equals })
    const isLazy = typeof args[0] === "function";
    return createMutableSignal(
      {},
      isLazy ? args[0] : () => args[0],
      { equals: args[1] }, // Wrap equals in options
      isLazy ? undefined : { value: args[0] },
      createSignalContext
    );
  }

  // Check if second arg is an equals string shortcut ('shallow', 'deep', 'is')
  // signal(value, 'shallow') -> signal(value, { equals: 'shallow' })
  if (typeof args[1] === "string") {
    const isLazy = typeof args[0] === "function";
    return createMutableSignal(
      {},
      isLazy ? args[0] : () => args[0],
      { equals: args[1] as "is" | "shallow" | "deep" }, // Wrap equals string in options
      isLazy ? undefined : { value: args[0] },
      createSignalContext
    );
  }

  // overload: signal(value, options?) - creates MutableSignal
  const isLazy = typeof args[0] === "function";
  return createMutableSignal(
    {},
    isLazy ? args[0] : () => args[0],
    args[1],
    isLazy ? undefined : { value: args[0] },
    createSignalContext
  );
}) as SignalExports;

export class FallbackError extends Error {
  readonly originalError: unknown;
  readonly fallbackError: unknown;
  readonly signalName?: string;

  constructor(error: unknown, fallbackError: unknown, signalName?: string) {
    super(
      `Signal computation failed with: ${error}\nFallback also failed with: ${fallbackError}`
    );
    this.name = "FallbackError";
    this.originalError = error;
    this.fallbackError = fallbackError;
    this.signalName = signalName;
  }
}
