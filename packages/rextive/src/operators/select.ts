/**
 * Select operator - Transform/select signal values
 */

import type { Signal, ComputedSignal, SignalOptions } from "../types";
import { signal } from "../signal";
import { wait } from "../wait";
import { isPromiseLike } from "../utils/isPromiseLike";
import { loadable } from "../utils/loadable";

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
 * const doubled = count.to(select(x => x * 2));
 * ```
 *
 * @example With arrays (no confusion with Array.map)
 * ```ts
 * const postIds = signal([1, 2, 3]);
 * const posts = postIds.to(
 *   select(ids => ids.map(id => ({ id, title: `Post ${id}` })))
 *   //     ^^^         ^^^
 *   //     Array       Array.map - Clear distinction!
 * );
 * ```
 *
 * @example With equality options
 * ```ts
 * const user = signal({ name: "Alice", age: 30 });
 * const name = user.to(select(u => u.name, "shallow"));
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

/**
 * Select/transform values from promises
 *
 * Creates a new computed signal that waits for the source value (if it's a promise)
 * and then applies the transformation function. Uses `loadable()` to cache promise
 * states and avoid re-awaiting already resolved promises.
 *
 * Named after `Promise.then()` for familiarity and clarity.
 *
 * @param fn - Transformation function (can be sync or async)
 * @param equalsOrOptions - Optional equality strategy or options
 * @returns Operator function that transforms an awaited signal
 *
 * @example Transform promise values
 * ```ts
 * import { select } from "rextive/op";
 *
 * const userPromise = signal(fetchUser());
 * const userName = userPromise.to(select.then(user => user.name));
 * ```
 *
 * @example Handle mixed promise/non-promise values
 * ```ts
 * const data = signal<number | Promise<number>>(5);
 * const doubled = data.to(select.then(x => x * 2));
 *
 * doubled(); // 10 (sync)
 * data.set(Promise.resolve(10));
 * await doubled(); // 20 (async)
 * ```
 */
select.then = function selectThen<T, U>(
  fn: (value: Awaited<T>) => U,
  equalsOrOptions?: "strict" | "shallow" | "deep" | SignalOptions<Awaited<U>>
): (
  source: Signal<T>
) => ComputedSignal<T extends PromiseLike<any> ? PromiseLike<U> : U> {
  return (source: Signal<T>): any => {
    const options: SignalOptions<Awaited<U>> | undefined =
      typeof equalsOrOptions === "string"
        ? { equals: equalsOrOptions }
        : equalsOrOptions;

    return signal(
      { source },
      (ctx: any) => {
        const sourceValue = ctx.deps.source;

        // If source value is a promise, use loadable to check if it's already resolved
        if (isPromiseLike(sourceValue)) {
          const l = loadable(sourceValue);

          // If already resolved, apply selector synchronously
          if (l.status === "success") {
            return fn(l.value as Awaited<T>);
          }

          // If error, throw it
          if (l.status === "error") {
            throw l.error;
          }

          // If still loading, wait for it and then apply selector
          return wait(sourceValue, fn as any);
        }

        // Otherwise, call selector directly (can return sync or async result)
        return fn(sourceValue as Awaited<T>);
      },
      options as any
    );
  };
};
