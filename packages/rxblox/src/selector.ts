import { getDispatcher } from "./dispatcher";
import { disposableToken } from "./disposableDispatcher";
import { emitter } from "./emitter";
import { isPromiseLike } from "./isPromiseLike";
import { trackingToken } from "./trackingDispatcher";
import { Selector, Subscribable } from "./types";
import { devAssert } from "./utils/dev";
import { shallowEquals } from "./utils/shallowEquals";

/**
 * Creates a selector that derives a value from a subscribable source.
 *
 * @param getParentValue - Function to get the parent value (non-reactive)
 * @param onParentChange - Subscribable to listen for parent changes
 * @param onParentDispose - Subscribable to listen for parent disposal
 * @param selectorFn - Function or property key to select a part of the value
 * @param equalsFn - Custom equality function (defaults to shallowEquals)
 *
 * @example
 * ```ts
 * const user = signal({ name: 'John', age: 30 });
 * const nameSelector = selector(
 *   () => user.peek(),
 *   user,
 *   onDisposeEmitter,
 *   'name'
 * );
 * console.log(nameSelector()); // 'John'
 * ```
 */
export function selector<TSource, TResult>(
  getParentValue: () => TSource,
  onParentChange: Subscribable,
  onParentDispose: Subscribable,
  selectorFn: ((value: TSource) => TResult) | keyof TSource,
  equalsFn: (a: TResult, b: TResult) => boolean = shallowEquals
): Selector<TResult> {
  const onChange = emitter<void>();
  const onCleanup = emitter<void>();
  let unsubscribeFromParentChange: VoidFunction | undefined;
  let unsubscribeFromParentDispose: VoidFunction | undefined;
  let unsubscribeFromDisposable: VoidFunction | undefined;

  let current: { value: TResult } | { error: unknown } | undefined;
  const selectValue =
    typeof selectorFn === "function"
      ? selectorFn
      : (value: TSource) => value[selectorFn];

  const cleanup = () => {
    unsubscribeFromParentChange?.();
    unsubscribeFromParentDispose?.();
    unsubscribeFromDisposable?.();
    unsubscribeFromDisposable = undefined;
    unsubscribeFromParentChange = undefined;
    unsubscribeFromParentDispose = undefined;
    onChange.clear();
    onCleanup.emitAndClear();
  };

  unsubscribeFromDisposable = getDispatcher(disposableToken)?.on(cleanup);
  unsubscribeFromParentDispose = onParentDispose.on(cleanup);

  const compute = () => {
    if (!unsubscribeFromParentChange) {
      unsubscribeFromParentChange = onParentChange.on(recompute);
    }

    // Run without tracking to avoid double-subscription to parent
    return trackingToken.without(() => {
      try {
        const parentValue = getParentValue();
        const value = selectValue(parentValue) as TResult;

        devAssert(
          !isPromiseLike(value),
          "Selector not allowed to return a promise-like value"
        );

        return { value };
      } catch (error) {
        return { error };
      }
    });
  };

  const recompute = () => {
    const next = compute();

    if (!current) {
      // Not yet initialized - set without emitting
      current = next;
      return;
    }

    // Emit change if: error occurred, recovered from error, or value changed
    if (
      "error" in next ||
      "error" in current ||
      !equalsFn(current.value, next.value)
    ) {
      current = next;
      onChange.emit();
    }
  };

  const get = () => {
    getDispatcher(trackingToken)?.add(onChange);
    return peek();
  };

  const peek = () => {
    if (!current) {
      current = compute();
    }

    if ("error" in current && current.error) {
      throw current.error;
    }

    return (current as { value: TResult }).value;
  };

  const on = (listener: VoidFunction) => {
    // Ensure we're subscribed to parent when first listener is added
    if (!unsubscribeFromParentChange) {
      // Initialize current value before subscribing
      if (!current) {
        current = compute();
      }
      // Check again - compute() might have subscribed
      if (!unsubscribeFromParentChange) {
        unsubscribeFromParentChange = onParentChange.on(recompute);
      }
    }
    return onChange.on(listener);
  };

  const select = <R>(
    childSelectorFn: ((value: TResult) => R) | keyof TResult,
    childEqualsFn?: (a: R, b: R) => boolean
  ): Selector<R> => {
    return selector<TResult, R>(
      peek, // getParentValue
      onChange, // onParentChange
      onCleanup, // onParentDispose
      childSelectorFn as any,
      childEqualsFn
    );
  };

  const s: Selector<TResult> = Object.assign(get, { peek, on, select });

  return s;
}
