import {
  Mutable,
  Computed,
  SignalContext,
  ComputedSignalContext,
  SignalMap,
  SignalOptions,
  SignalExtraOptions,
} from "./types";
import { createMutableSignal } from "./createMutableSignal";
import { createComputedSignal } from "./createComputedSignal";
import { createSignalContext } from "./createSignalContext";
import { EqualsStrategy } from "./utils/resolveEquals";
import { signalOn } from "./signal.on";

// Re-export signal.on types
export type { SignalOnControl } from "./signal.on";

/**
 * Check if value looks like a dependencies object (for computed signals)
 * vs a regular value (for mutable signals)
 */
function isDependenciesObject(obj: any): boolean {
  if (
    !obj ||
    Array.isArray(obj) ||
    typeof obj === "function" ||
    typeof obj !== "object"
  ) {
    return false;
  }
  return true;
}

/**
 * Implementation: signal() - creates MutableSignal<undefined>
 */
function createEmptySignal(): Mutable<unknown, undefined> {
  return createMutableSignal(
    {},
    () => undefined,
    undefined,
    { value: undefined },
    createSignalContext
  );
}

/**
 * Implementation: signal(value, equals) - creates MutableSignal with equality string shortcut
 */
function createSignalWithEquals<TValue>(
  value: TValue | ((context: SignalContext) => TValue),
  equals: EqualsStrategy
): Mutable<TValue> {
  const isLazy = typeof value === "function";
  return createMutableSignal(
    {},
    isLazy ? (value as (context: SignalContext) => TValue) : () => value,
    { equals },
    isLazy ? undefined : { value },
    createSignalContext
  );
}

/**
 * Implementation: signal(value, options?) - creates MutableSignal
 */
function createMutableSignalWithOptions<TValue>(
  value: TValue | ((context: SignalContext) => TValue),
  options?: SignalOptions<TValue> & SignalExtraOptions<TValue, "mutable">
): Mutable<TValue> {
  const isLazy = typeof value === "function";
  return createMutableSignal(
    {},
    isLazy ? (value as (context: SignalContext) => TValue) : () => value,
    options,
    isLazy ? undefined : { value },
    createSignalContext
  );
}

/**
 * Implementation: signal(deps, compute, equals) - creates ComputedSignal with equality string shortcut
 */
function createComputedSignalWithEquals<
  TValue,
  TDependencies extends SignalMap
>(
  dependencies: TDependencies,
  compute: (context: ComputedSignalContext<TDependencies>) => TValue,
  equals: "strict" | "shallow" | "deep"
): Computed<TValue> {
  return createComputedSignal(
    dependencies,
    compute as any,
    { equals },
    createSignalContext,
    signal as any
  );
}

/**
 * Implementation: signal(deps, compute, options?) - creates ComputedSignal
 */
function createComputedSignalWithOptions<
  TValue,
  TDependencies extends SignalMap
>(
  dependencies: TDependencies,
  compute: (context: ComputedSignalContext<TDependencies>) => TValue,
  options?: SignalOptions<TValue> &
    NoInfer<SignalExtraOptions<TValue, "computed">>
): Computed<TValue> {
  return createComputedSignal(
    dependencies,
    compute as any,
    options,
    createSignalContext,
    signal as any
  );
}

/**
 * Create mutable signal with no initial value
 * get() returns T | undefined, but set() requires T
 * @returns MutableSignal<T, undefined>
 */
export function signal<TValue = unknown>(): Mutable<TValue, undefined>;

/**
 * Create mutable signal with initial value and equality string shortcut
 * @param value - Initial value or compute function
 * @param equals - Equality strategy shortcut ('shallow', 'deep', 'strict')
 * @returns MutableSignal<T>
 * @example
 * ```ts
 * // String shortcuts only
 * const user = signal({ name: 'John' }, 'shallow');
 * const data = signal(complexObj, 'deep');
 * const count = signal(0, 'strict');
 *
 * // For custom equality function, use options form
 * const custom = signal(0, { equals: (a, b) => a === b });
 * ```
 */
export function signal<TValue>(
  value: TValue | ((context: SignalContext) => TValue),
  equals: "strict" | "shallow" | "deep"
): Mutable<TValue>;

/**
 * Create mutable signal with initial value and options (non-function value)
 * @param value - Initial value or compute function
 * @param options - Signal options
 * @returns MutableSignal<T>
 */
export function signal<TValue>(
  value: TValue | ((context: SignalContext) => TValue),
  options?: SignalOptions<TValue> &
    NoInfer<SignalExtraOptions<TValue, "mutable" | "any">>
): Mutable<TValue>;

/**
 * Create computed signal from dependencies with equality string shortcut
 * @param dependencies - Map of signals to depend on
 * @param compute - Compute function that receives dependency values
 * @param equals - Equality strategy shortcut ('shallow', 'deep', 'strict')
 * @returns ComputedSignal<T>
 * @example
 * ```ts
 * // String shortcuts only
 * const fullName = signal({ firstName, lastName }, ({ deps }) =>
 *   `${deps.firstName} ${deps.lastName}`, 'shallow');
 *
 * // For custom equality function, use options form
 * const result = signal({ a, b }, ({ deps }) =>
 *   ({ sum: deps.a + deps.b }), { equals: (x, y) => x.sum === y.sum });
 * ```
 */
export function signal<TValue, TDependencies extends SignalMap>(
  dependencies: TDependencies,
  compute: (context: ComputedSignalContext<NoInfer<TDependencies>>) => TValue,
  equals: EqualsStrategy
): Computed<TValue>;
/**
 * Create computed signal from dependencies with options
 * @param dependencies - Map of signals to depend on
 * @param compute - Compute function that receives dependency values
 * @param options - Signal options
 * @returns ComputedSignal<T>
 */
export function signal<TValue, TDependencies extends SignalMap>(
  dependencies: TDependencies,
  compute: (context: ComputedSignalContext<NoInfer<TDependencies>>) => TValue,
  options?: SignalOptions<TValue> &
    NoInfer<SignalExtraOptions<TValue, "computed" | "any">>
): Computed<TValue>;
export function signal(...args: any[]): any {
  // Overload 1: signal() - no arguments
  if (args.length === 0) {
    return createEmptySignal();
  }

  const [first, second, third] = args;

  // Overload 2 & 3: Computed signal with dependencies
  // signal(deps, compute, equals?) or signal(deps, compute, options?)
  if (typeof second === "function" && isDependenciesObject(first)) {
    // Check if third arg is equals (function or string)
    if (typeof third === "function" || typeof third === "string") {
      return createComputedSignalWithEquals(first, second, third);
    }
    // Otherwise, third arg is options (or undefined)
    return createComputedSignalWithOptions(first, second, third);
  }

  // Overload 4: Mutable signal with equals string shortcut
  // signal(value, 'shallow' | 'deep' | 'strict')
  if (typeof second === "string") {
    return createSignalWithEquals(first, second as EqualsStrategy);
  }

  // Overload 5: Mutable signal with options (or no second arg)
  // signal(value, options?) or signal(value)
  return createMutableSignalWithOptions(first, second);
}

// Attach namespace methods to signal function
signal.on = signalOn;
