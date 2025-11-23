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
 * @param equals - Optional custom equality function for output values
 * @returns New computed signal with transformed values
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const doubled = mapSignal(count, x => x * 2);
 * const formatted = mapSignal(count, x => `Count: ${x}`);
 *
 * // With custom equals for object comparison
 * const user = signal({ name: 'John', age: 30 });
 * const name = mapSignal(
 *   user,
 *   u => u.name,
 *   (a, b) => a === b
 * );
 * ```
 */
export function mapSignal<T, U>(
  source: Signal<T>,
  fn: (value: T) => U,
  equals?: (a: U, b: U) => boolean
): ComputedSignal<U> {
  const options: SignalOptions<U> | undefined = equals ? { equals } : undefined;

  return signal({ source }, (ctx) => fn(ctx.deps.source), options);
}
