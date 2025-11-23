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

export const DISPOSED_MESSAGE = "Signal is disposed";

export type SignalExports = {
  /**
   * Create mutable signal with no initial value
   * get() returns T | undefined, but set() requires T
   * @returns MutableSignal<T, undefined>
   */
  <TValue = unknown>(): MutableSignal<TValue, undefined>;

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
  // overload: signal(deps, fn, options?) - creates ComputedSignal
  if (typeof args[1] === "function") {
    return createComputedSignal(
      args[0],
      args[1],
      args[2],
      createSignalContext,
      signal
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
