import { isPromiseLike } from "./utils/isPromiseLike";
import { wait } from "./wait";

/**
 * Helper to create a selector that works with both promise and non-promise values
 *
 * Accepts multiple selectors that will be chained together, where each selector
 * receives the awaited result of the previous one. If the source value is a promise,
 * the entire chain is executed asynchronously.
 *
 * @param selectors - One or more transformation functions
 * @returns A selector function that handles both promise and non-promise values
 *
 * @example Single selector
 * ```ts
 * import { signal, awaited } from "rextive";
 *
 * const todoList = signal(fetchTodos()); // Signal<Promise<Todo[]>>
 * const titles = todoList.to(awaited(todos => todos.map(t => t.title)));
 * // titles() returns Promise<string[]>
 * ```
 *
 * @example Multiple selectors (chained)
 * ```ts
 * const result = todoList.to(
 *   awaited(
 *     todos => todos.filter(t => !t.done),
 *     todos => todos.map(t => t.title),
 *     titles => titles.join(", ")
 *   )
 * );
 * // result() returns Promise<string>
 * ```
 *
 * @example With non-promise values
 * ```ts
 * const todoList = signal([{ title: "Buy milk" }]); // Signal<Todo[]>
 * const titles = todoList.to(awaited(todos => todos.map(t => t.title)));
 * // titles() returns string[] (sync)
 * ```
 *
 * @example With .pipe() and select operator
 * ```ts
 * import { signal, awaited } from "rextive";
 * import { select } from "rextive/op";
 *
 * const todoList = signal(fetchTodos());
 * const titles = todoList.pipe(
 *   select(awaited(todos => todos.map(t => t.title)))
 * );
 * ```
 *
 * @example Mixed promise/non-promise values
 * ```ts
 * const data = signal<number | Promise<number>>(5);
 * const doubled = data.to(awaited(x => x * 2));
 *
 * doubled(); // 10 (sync)
 * data.set(Promise.resolve(10));
 * await doubled(); // 20 (async)
 * ```
 */

// Overload: 1 selector
export function awaited<TSource, T1>(
  s1: (value: Awaited<TSource>) => T1
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T1> : T1;

// Overload: 2 selectors
export function awaited<TSource, T1, T2>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T2> : T2;

// Overload: 3 selectors
export function awaited<TSource, T1, T2, T3>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2,
  s3: (value: T2) => T3
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T3> : T3;

// Overload: 4 selectors
export function awaited<TSource, T1, T2, T3, T4>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2,
  s3: (value: T2) => T3,
  s4: (value: T3) => T4
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T4> : T4;

// Overload: 5 selectors
export function awaited<TSource, T1, T2, T3, T4, T5>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2,
  s3: (value: T2) => T3,
  s4: (value: T3) => T4,
  s5: (value: T4) => T5
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T5> : T5;

// Overload: 6 selectors
export function awaited<TSource, T1, T2, T3, T4, T5, T6>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2,
  s3: (value: T2) => T3,
  s4: (value: T3) => T4,
  s5: (value: T4) => T5,
  s6: (value: T5) => T6
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T6> : T6;

// Overload: 7 selectors
export function awaited<TSource, T1, T2, T3, T4, T5, T6, T7>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2,
  s3: (value: T2) => T3,
  s4: (value: T3) => T4,
  s5: (value: T4) => T5,
  s6: (value: T5) => T6,
  s7: (value: T6) => T7
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T7> : T7;

// Overload: 8 selectors
export function awaited<TSource, T1, T2, T3, T4, T5, T6, T7, T8>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2,
  s3: (value: T2) => T3,
  s4: (value: T3) => T4,
  s5: (value: T4) => T5,
  s6: (value: T5) => T6,
  s7: (value: T6) => T7,
  s8: (value: T7) => T8
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T8> : T8;

// Overload: 9 selectors
export function awaited<TSource, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2,
  s3: (value: T2) => T3,
  s4: (value: T3) => T4,
  s5: (value: T4) => T5,
  s6: (value: T5) => T6,
  s7: (value: T6) => T7,
  s8: (value: T7) => T8,
  s9: (value: T8) => T9
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T9> : T9;

// Overload: 10 selectors
export function awaited<TSource, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
  s1: (value: Awaited<TSource>) => T1,
  s2: (value: T1) => T2,
  s3: (value: T2) => T3,
  s4: (value: T3) => T4,
  s5: (value: T4) => T5,
  s6: (value: T5) => T6,
  s7: (value: T6) => T7,
  s8: (value: T7) => T8,
  s9: (value: T8) => T9,
  s10: (value: T9) => T10
): (value: TSource) => TSource extends PromiseLike<any> ? Promise<T10> : T10;

// Implementation
export function awaited<TSource>(
  ...selectors: Array<(value: any) => any>
): (value: TSource) => any {
  return ((value: TSource): any => {
    if (isPromiseLike(value)) {
      return wait(value, (awaited) =>
        selectors.reduce((acc, selector) => selector(acc), awaited as any)
      );
    }
    return selectors.reduce((acc, selector) => selector(acc), value as any);
  }) as any;
}
