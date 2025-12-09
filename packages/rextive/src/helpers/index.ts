/**
 * rextive/helpers - Utility functions for common signal patterns
 *
 * @example
 * import { patch } from "rextive/helpers";
 *
 * const person = signal({ name: "John", age: 30 });
 *
 * // Partial update
 * person.set(patch({ name: "Jane" }));
 *
 * // Key-value update
 * person.set(patch("age", 25));
 */

export { patch } from "./patch";

