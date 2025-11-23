import { Signal, ComputedSignal, SignalOptions } from "../types";
import { signal } from "../signal";

/**
 * Transform signal value (stateless, pure function)
 *
 * Creates a new computed signal that applies the transform function
 * to each value from the source signal.
 *
 * @param source - Source signal to transform
 * @param fn - Pure transformation function (value: T) => U
 * @param equalsOrOptions - Optional custom equality function or full options object
 * @returns New computed signal with transformed values
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const doubled = mapSignal(count, x => x * 2);
 * const formatted = mapSignal(count, x => `Count: ${x}`);
 *
 * // With custom equals function
 * const user = signal({ name: 'John', age: 30 });
 * const name = mapSignal(user, u => u.name, (a, b) => a === b);
 *
 * // With full options
 * const name = mapSignal(user, u => u.name, { equals: shallowEquals, name: 'userName' });
 * ```
 */
export function mapSignal<T, U>(
  source: Signal<T>,
  fn: (value: T) => U,
  equalsOrOptions?: "is" | "shallow" | "deep" | ((a: U, b: U) => boolean) | SignalOptions<U>
): ComputedSignal<U> {
  // If it's a function or string, treat it as equals; otherwise use as-is
  const options: SignalOptions<U> | undefined =
    typeof equalsOrOptions === "function" || typeof equalsOrOptions === "string"
      ? { equals: equalsOrOptions }
      : equalsOrOptions;

  return signal({ source }, (ctx) => fn(ctx.deps.source), options);
}
