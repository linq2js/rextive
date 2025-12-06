/**
 * A function that does nothing and returns undefined.
 *
 * Useful as a default callback or placeholder function.
 *
 * @example
 * ```ts
 * const callback = options.onChange ?? noop;
 * callback(value); // Safe to call even if onChange wasn't provided
 * ```
 */
export const noop = () => {};

