/**
 * Signal operators for transforming signals
 * 
 * Re-exports all operators from the operators module.
 * This is a convenience export for shorter import paths.
 * 
 * @module op
 * 
 * @example
 * ```ts
 * import { map, filter, scan } from "rextive/op";
 * 
 * const count = signal(5);
 * const result = count.to(
 *   filter(x => x > 0),
 *   map(x => x * 2),
 *   scan((acc, x) => acc + x, 0)
 * );
 * ```
 */

export * from "./operators";

