/**
 * Utility to resolve selectors and options from function arguments
 */

import type { SignalOptions, SignalContext, PredefinedEquals } from "../types";
import type { OperatorNameOptions } from "./types";

/**
 * Selector function type - receives value and context, returns transformed value
 */
export type SelectorFn<T = any, R = any> = (
  value: T,
  context: SignalContext
) => R;

/**
 * Options that can be passed as the last argument.
 * Supports both predefined equals strings and full SignalOptions.
 */
export type SelectorOptions<T = any> =
  | PredefinedEquals
  | (SignalOptions<T> & OperatorNameOptions);

/**
 * Result of resolving selectors and options from arguments
 */
export type ResolvedSelectors<T = any, R = any> = [
  selector: SelectorFn<T, R> | undefined,
  options: SignalOptions<R>
];

/**
 * Checks if a value is options (not a function)
 */
function isOptions(value: unknown): value is SelectorOptions<any> {
  return value !== undefined && typeof value !== "function";
}

/**
 * Converts SelectorOptions to SignalOptions
 */
function normalizeOptions<T>(options: SelectorOptions<T>): SignalOptions<T> {
  if (typeof options === "string") {
    return { equals: options };
  }
  return options || {};
}

/**
 * Composes multiple selectors into a single selector function
 *
 * @param selectors - Array of selector functions to compose
 * @returns A single composed selector, or undefined if no selectors provided
 */
function composeSelectors<T, R>(
  selectors: SelectorFn[]
): SelectorFn<T, R> | undefined {
  if (selectors.length === 0) {
    return undefined;
  }

  if (selectors.length === 1) {
    return selectors[0];
  }

  // Compose multiple selectors: chain left-to-right, all receive context
  return (value: T, ctx: SignalContext): R => {
    let result: any = value;
    for (const selector of selectors) {
      result = selector(result, ctx);
    }
    return result;
  };
}

/**
 * Resolves selectors and options from function arguments
 *
 * This utility separates selector functions from options and composes
 * multiple selectors into a single function.
 *
 * @param args - Arguments array containing selectors and optional options at the end
 * @returns Tuple of [composedSelector, options]
 *
 * @example Single selector
 * ```ts
 * const [selector, options] = resolveSelectors([x => x * 2]);
 * // selector: (x) => x * 2
 * // options: {}
 * ```
 *
 * @example Multiple selectors
 * ```ts
 * const [selector, options] = resolveSelectors([
 *   x => x * 2,
 *   x => x + 1
 * ]);
 * // selector: composed function that does (x * 2) + 1
 * // options: {}
 * ```
 *
 * @example With options
 * ```ts
 * const [selector, options] = resolveSelectors([
 *   x => x * 2,
 *   "shallow"
 * ]);
 * // selector: (x) => x * 2
 * // options: { equals: "shallow" }
 * ```
 *
 * @example No selectors (only options)
 * ```ts
 * const [selector, options] = resolveSelectors(["shallow"]);
 * // selector: undefined
 * // options: { equals: "shallow" }
 * ```
 *
 * @example Empty args
 * ```ts
 * const [selector, options] = resolveSelectors([]);
 * // selector: undefined
 * // options: {}
 * ```
 */
export function resolveSelectors<T = any, R = any>(
  args: any[]
): ResolvedSelectors<T, R> {
  if (args.length === 0) {
    return [undefined, {}];
  }

  // Check if last argument is options
  const lastArg = args[args.length - 1];
  const hasOptions = isOptions(lastArg);

  // Extract options
  const options = hasOptions ? normalizeOptions(lastArg) : {};

  // Extract selectors (all args except options if present)
  const selectorArgs = hasOptions ? args.slice(0, -1) : args;

  // Filter to ensure all are functions
  const selectors = selectorArgs.filter(
    (arg): arg is SelectorFn => typeof arg === "function"
  );

  // Compose selectors
  const selector = composeSelectors<T, R>(selectors);

  return [selector, options];
}

/**
 * Resolves selectors and options, ensuring at least one selector exists
 *
 * Similar to resolveSelectors but throws if no selectors are provided.
 * Useful when at least one selector is required.
 *
 * @param args - Arguments array containing at least one selector
 * @returns Tuple of [composedSelector, options]
 * @throws Error if no selector functions are provided
 */
export function resolveSelectorsRequired<T = any, R = any>(
  args: any[]
): [selector: SelectorFn<T, R>, options: SignalOptions<R>] {
  const [selector, options] = resolveSelectors<T, R>(args);

  if (!selector) {
    throw new Error("At least one selector function is required");
  }

  return [selector, options];
}
