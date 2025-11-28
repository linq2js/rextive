/**
 * To operator - Transform signal values
 *
 * Supports chaining multiple selectors like .to() method,
 * with SignalContext available as second argument.
 */

import type { Signal, Computed, Selector } from "../types";
import { signal } from "../signal";
import {
  resolveSelectorsRequired,
  type SelectorOptions,
} from "./resolveSelectors";

/**
 * Options for to operator
 */
export type ToOperatorOptions<T> = SelectorOptions<T>;

// =============================================================================
// OVERLOADS: 1-10 selectors with optional options
// =============================================================================

// 1 selector
export function to<T, A>(
  s1: Selector<T, A>,
  options?: ToOperatorOptions<A>
): (source: Signal<T>) => Computed<A>;

// 2 selectors
export function to<T, A, B>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  options?: ToOperatorOptions<B>
): (source: Signal<T>) => Computed<B>;

// 3 selectors
export function to<T, A, B, C>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  s3: Selector<B, C>,
  options?: ToOperatorOptions<C>
): (source: Signal<T>) => Computed<C>;

// 4 selectors
export function to<T, A, B, C, D>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  s3: Selector<B, C>,
  s4: Selector<C, D>,
  options?: ToOperatorOptions<D>
): (source: Signal<T>) => Computed<D>;

// 5 selectors
export function to<T, A, B, C, D, E>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  s3: Selector<B, C>,
  s4: Selector<C, D>,
  s5: Selector<D, E>,
  options?: ToOperatorOptions<E>
): (source: Signal<T>) => Computed<E>;

// 6 selectors
export function to<T, A, B, C, D, E, F>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  s3: Selector<B, C>,
  s4: Selector<C, D>,
  s5: Selector<D, E>,
  s6: Selector<E, F>,
  options?: ToOperatorOptions<F>
): (source: Signal<T>) => Computed<F>;

// 7 selectors
export function to<T, A, B, C, D, E, F, G>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  s3: Selector<B, C>,
  s4: Selector<C, D>,
  s5: Selector<D, E>,
  s6: Selector<E, F>,
  s7: Selector<F, G>,
  options?: ToOperatorOptions<G>
): (source: Signal<T>) => Computed<G>;

// 8 selectors
export function to<T, A, B, C, D, E, F, G, H>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  s3: Selector<B, C>,
  s4: Selector<C, D>,
  s5: Selector<D, E>,
  s6: Selector<E, F>,
  s7: Selector<F, G>,
  s8: Selector<G, H>,
  options?: ToOperatorOptions<H>
): (source: Signal<T>) => Computed<H>;

// 9 selectors
export function to<T, A, B, C, D, E, F, G, H, I>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  s3: Selector<B, C>,
  s4: Selector<C, D>,
  s5: Selector<D, E>,
  s6: Selector<E, F>,
  s7: Selector<F, G>,
  s8: Selector<G, H>,
  s9: Selector<H, I>,
  options?: ToOperatorOptions<I>
): (source: Signal<T>) => Computed<I>;

// 10 selectors
export function to<T, A, B, C, D, E, F, G, H, I, J>(
  s1: Selector<T, A>,
  s2: Selector<A, B>,
  s3: Selector<B, C>,
  s4: Selector<C, D>,
  s5: Selector<D, E>,
  s6: Selector<E, F>,
  s7: Selector<F, G>,
  s8: Selector<G, H>,
  s9: Selector<H, I>,
  s10: Selector<I, J>,
  options?: ToOperatorOptions<J>
): (source: Signal<T>) => Computed<J>;

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * Transform signal values with chained selectors
 *
 * Creates a new computed signal that applies transformation functions
 * to each value from the source signal. Multiple selectors are chained
 * left-to-right, each receiving the result of the previous selector.
 *
 * Each selector receives the SignalContext as its second argument,
 * providing access to abortSignal and other context information.
 *
 * @param selectors - One or more transformation functions
 * @param options - Optional equality strategy or signal options (as last arg)
 * @returns Operator function that transforms a signal
 *
 * @example Basic transformation
 * ```ts
 * import { to } from "rextive/op";
 *
 * const count = signal(5);
 * const doubled = count.pipe(to(x => x * 2));
 * ```
 *
 * @example Chained selectors
 * ```ts
 * const user = signal({ name: "Alice", age: 30 });
 * const greeting = user.pipe(
 *   to(
 *     u => u.name,
 *     name => name.toUpperCase(),
 *     name => `Hello, ${name}!`
 *   )
 * );
 * // greeting() === "Hello, ALICE!"
 * ```
 *
 * @example With SignalContext
 * ```ts
 * const data = signal(initialData);
 * const processed = data.pipe(
 *   to((value, ctx) => {
 *     // Access context for async operations
 *     if (ctx.abortSignal?.aborted) return fallback;
 *     return transform(value);
 *   })
 * );
 * ```
 *
 * @example With equality options
 * ```ts
 * const user = signal({ name: "Alice", age: 30 });
 * const profile = user.pipe(
 *   to(
 *     u => ({ name: u.name, age: u.age }),
 *     "shallow" // Use shallow equality
 *   )
 * );
 * ```
 */
export function to(
  first: Selector<any, any>,
  ...rest: any[]
): (source: Signal<any>) => Computed<any> {
  // Resolve selectors and options from arguments
  const [selector, options] = resolveSelectorsRequired([first, ...rest]);

  return (source: Signal<any>) => {
    return signal(
      { source: source as any },
      (ctx: any) => selector(ctx.deps.source, ctx),
      options
    );
  };
}

