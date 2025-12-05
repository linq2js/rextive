import {
  type Signal,
  type Mutable,
  type Computed,
  type Accessor,
  type Observable,
  type Tag,
  type SignalKind,
  type Logic,
  SIGNAL_TYPE,
  TAG_TYPE,
  Task,
  TASK_TYPE,
  LOGIC_TYPE,
  AbstractLogic,
} from "./types";

/**
 * Type guard that checks whether a value is a Signal, Accessor, or Observable.
 *
 * @param value - The value to check
 * @param type - Optional type specifier:
 *   - `undefined`: checks if value is any Signal
 *   - `"mutable"`: checks if value is a MutableSignal (has `set` method)
 *   - `"computed"`: checks if value is a ComputedSignal (has `pause` method, no `set`)
 *   - `"observable"`: checks if value is an Observable (object with `on` method)
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
 * // Check if observable (has on method)
 * const emitter = { on: (fn: () => void) => fn };
 * if (is(emitter, "observable")) {
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
export function is<T = any>(value: unknown, type: "task"): value is Task<T>;
export function is<T = any>(
  value: unknown,
  type: "observable"
): value is Observable;
export function is<T = any, K extends SignalKind = SignalKind>(
  value: unknown,
  type: "tag"
): value is Tag<T, K>;
export function is<T = any>(
  value: unknown,
  type: "accessor"
): value is Accessor<T>;
export function is<T = any>(
  value: unknown,
  type: "mutable"
): value is Mutable<T>;
export function is<T extends object>(
  value: unknown,
  type: "logic"
): value is Logic<T> | AbstractLogic<T>;
export function is<T = any>(
  value: unknown,
  type: "computed"
): value is Computed<T>;
export function is<T = any>(
  value: unknown,
  type?:
    | "mutable"
    | "computed"
    | "observable"
    | "accessor"
    | "tag"
    | "task"
    | "logic"
): value is Signal<T> | Mutable<T> | Computed<T> {
  if (type === "observable") {
    return typeof value === "object" && value !== null && "on" in value;
  }

  if (type === "accessor") {
    return typeof value === "function" && "on" in value;
  }

  if (type === "task") {
    return typeof value === "object" && value !== null && TASK_TYPE in value;
  }

  if (type === "tag") {
    return (
      typeof value === "object" &&
      value !== null &&
      TAG_TYPE in value &&
      value[TAG_TYPE] === true
    );
  }

  if (type === "logic") {
    return typeof value === "function" && value !== null && LOGIC_TYPE in value;
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
export { SIGNAL_TYPE };
