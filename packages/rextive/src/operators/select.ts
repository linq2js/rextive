/**
 * Select operator - Transform/select signal values
 */

import type { Signal, ComputedSignal, SignalOptions } from "../types";
import { signal } from "../signal";

/**
 * Select/transform signal values
 *
 * Creates a new computed signal that applies the transformation function
 * to each value from the source signal.
 *
 * **Note:** This operator transforms the entire signal value, not individual items.
 * For arrays, use `select(arr => arr.map(...))` to transform items.
 *
 * @param fn - Transformation function
 * @param equalsOrOptions - Optional equality strategy or options
 * @returns Operator function that transforms a signal
 *
 * @example Basic transformation
 * ```ts
 * import { select } from "rextive/op";
 *
 * const count = signal(5);
 * const doubled = count.pipe(select(x => x * 2));
 * ```
 *
 * @example With arrays (no confusion with Array.map)
 * ```ts
 * const postIds = signal([1, 2, 3]);
 * const posts = postIds.pipe(
 *   select(ids => ids.map(id => ({ id, title: `Post ${id}` })))
 *   //     ^^^         ^^^
 *   //     Array       Array.map - Clear distinction!
 * );
 * ```
 *
 * @example With equality options
 * ```ts
 * const user = signal({ name: "Alice", age: 30 });
 * const name = user.pipe(select(u => u.name, "shallow"));
 * ```
 */
export function select<T, U>(
  fn: (value: T) => U,
  equalsOrOptions?: "strict" | "shallow" | "deep" | SignalOptions<U>
): (source: Signal<T>) => ComputedSignal<U> {
  return (source: Signal<T>) => {
    const options: SignalOptions<U> | undefined =
      typeof equalsOrOptions === "string"
        ? { equals: equalsOrOptions }
        : equalsOrOptions;

    return signal({ source }, (ctx: any) => fn(ctx.deps.source), options);
  };
}
