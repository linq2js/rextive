import {
  Signal,
  MutableSignal,
  ComputedSignal,
  Accessor,
  Subscribable,
} from "./types";

export const SIGNAL_TYPE = Symbol("SIGNAL_TYPE");

/**
 * Type guard that checks whether a value is a Signal, Accessor, or Subscribable.
 *
 * @param value - The value to check
 * @param type - Optional type specifier:
 *   - `undefined`: checks if value is any Signal
 *   - `"mutable"`: checks if value is a MutableSignal (has `set` method)
 *   - `"computed"`: checks if value is a ComputedSignal (has `pause` method, no `set`)
 *   - `"subscribable"`: checks if value is a Subscribable (object with `on` method)
 *   - `"accessor"`: checks if value is an Accessor (function with `on` method)
 * @returns true if `value` matches the specified type
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const doubled = signal({ count }, ({ deps }) => deps.count * 2);
 *
 * // Check if any signal
 * if (is(count)) {
 *   console.log(count()); // Safe to call as signal
 * }
 *
 * // Check if mutable signal
 * if (is(count, "mutable")) {
 *   count.set(5); // Safe to call set
 * }
 *
 * // Check if computed signal
 * if (is(doubled, "computed")) {
 *   doubled.pause(); // Safe to call pause
 * }
 *
 * // Check if subscribable (has on method)
 * const emitter = { on: (fn: () => void) => fn };
 * if (is(emitter, "subscribable")) {
 *   emitter.on(() => console.log("event"));
 * }
 *
 * // Check if accessor (function with on method)
 * if (is(count, "accessor")) {
 *   count.on(() => console.log("changed"));
 * }
 * ```
 */
export function is<T = any>(value: unknown): value is Signal<T>;
export function is<T = any>(
  value: unknown,
  type: "subscribable"
): value is Subscribable;
export function is<T = any>(
  value: unknown,
  type: "accessor"
): value is Accessor<T>;
export function is<T = any>(
  value: unknown,
  type: "mutable"
): value is MutableSignal<T>;
export function is<T = any>(
  value: unknown,
  type: "computed"
): value is ComputedSignal<T>;
export function is<T = any>(
  value: unknown,
  type?: "mutable" | "computed" | "subscribable" | "accessor"
): value is Signal<T> | MutableSignal<T> | ComputedSignal<T> {
  if (type === "subscribable") {
    return typeof value === "object" && value !== null && "on" in value;
  }
  if (type === "accessor") {
    return typeof value === "function" && "on" in value;
  }

  const isAnySignal =
    typeof value === "function" &&
    value !== null &&
    (value as any)[SIGNAL_TYPE] === true;

  if (!isAnySignal) {
    return false;
  }

  if (!type) {
    return true;
  }

  // Check if it's a mutable signal (has set method)
  if (type === "mutable") {
    return "set" in (value as any);
  }

  // Check if it's a computed signal (has pause method, no set method)
  if (type === "computed") {
    return "pause" in (value as any) && !("set" in (value as any));
  }

  return false;
}
