/**
 * Composes multiple functions into a single function.
 * Functions are applied from right to left.
 *
 * @example
 * ```ts
 * const add1 = (x: number) => x + 1;
 * const multiply2 = (x: number) => x * 2;
 * const composed = compose(add1, multiply2);
 * composed(5); // 11 (equivalent to add1(multiply2(5)))
 * ```
 *
 * @param fns - Functions to compose
 * @returns A new function that applies the input functions from right to left
 */

// Overload signatures for better type inference
export function compose<A, B>(f1: (a: A) => B): (a: A) => B;

export function compose<A, B, C>(f1: (b: B) => C, f2: (a: A) => B): (a: A) => C;

export function compose<A, B, C, D>(
  f1: (c: C) => D,
  f2: (b: B) => C,
  f3: (a: A) => B
): (a: A) => D;

export function compose<A, B, C, D, E>(
  f1: (d: D) => E,
  f2: (c: C) => D,
  f3: (b: B) => C,
  f4: (a: A) => B
): (a: A) => E;

export function compose<A, B, C, D, E, F>(
  f1: (e: E) => F,
  f2: (d: D) => E,
  f3: (c: C) => D,
  f4: (b: B) => C,
  f5: (a: A) => B
): (a: A) => F;

export function compose<A, B, C, D, E, F, G>(
  f1: (f: F) => G,
  f2: (e: E) => F,
  f3: (d: D) => E,
  f4: (c: C) => D,
  f5: (b: B) => C,
  f6: (a: A) => B
): (a: A) => G;

export function compose<A, B, C, D, E, F, G, H>(
  f1: (g: G) => H,
  f2: (f: F) => G,
  f3: (e: E) => F,
  f4: (d: D) => E,
  f5: (c: C) => D,
  f6: (b: B) => C,
  f7: (a: A) => B
): (a: A) => H;

export function compose<A, B, C, D, E, F, G, H, I>(
  f1: (h: H) => I,
  f2: (g: G) => H,
  f3: (f: F) => G,
  f4: (e: E) => F,
  f5: (d: D) => E,
  f6: (c: C) => D,
  f7: (b: B) => C,
  f8: (a: A) => B
): (a: A) => I;

export function compose<A, B, C, D, E, F, G, H, I, J>(
  f1: (i: I) => J,
  f2: (h: H) => I,
  f3: (g: G) => H,
  f4: (f: F) => G,
  f5: (e: E) => F,
  f6: (d: D) => E,
  f7: (c: C) => D,
  f8: (b: B) => C,
  f9: (a: A) => B
): (a: A) => J;

export function compose<A, B, C, D, E, F, G, H, I, J, K>(
  f1: (j: J) => K,
  f2: (i: I) => J,
  f3: (h: H) => I,
  f4: (g: G) => H,
  f5: (f: F) => G,
  f6: (e: E) => F,
  f7: (d: D) => E,
  f8: (c: C) => D,
  f9: (b: B) => C,
  f10: (a: A) => B
): (a: A) => K;

// General case for more than 10 functions
export function compose<R>(
  ...fns: Array<(a: any) => any>
): (...args: any[]) => R;

// Implementation
export function compose(
  ...fns: Array<(a: any) => any>
): (...args: any[]) => any {
  if (fns.length === 0) {
    return (arg: any) => arg;
  }

  if (fns.length === 1) {
    return fns[0];
  }

  return function composedFunction(...args: any[]) {
    // Start with the rightmost function and pass all arguments
    const lastFn = fns[fns.length - 1];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let result = (lastFn as any)(...args);

    // Apply remaining functions from right to left
    for (let i = fns.length - 2; i >= 0; i--) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result = fns[i](result);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  };
}
