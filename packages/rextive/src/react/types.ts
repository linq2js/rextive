/**
 * React-specific types for rextive
 */

/**
 * Options for rx component
 */
export type RxOptions = {
  /**
   * Control when to re-render / re-create render function
   *
   * For `rx(render, options)`:
   * - Default (no watch): Never re-renders (static content)
   * - `watch: [deps]`: Re-renders when deps change
   *
   * For `rx(signals, render, options)`:
   * - Always re-renders when signals change
   * - `watch` memoizes the render function (like React useCallback deps)
   *
   * @example Overload 1: Manual control
   * ```tsx
   * // Static (never re-renders)
   * rx(() => <div>Static content</div>)
   *
   * // Re-render when deps change
   * rx(() => <div>{externalValue}</div>, { watch: [externalValue] })
   * ```
   *
   * @example Overload 2: Explicit signals
   * ```tsx
   * // Re-renders when user/posts change
   * // Render function memoized by watch
   * rx({ user, posts }, (value) => <div>{value.user.name}</div>, {
   *   watch: [formatFn] // Re-create render only when formatFn changes
   * })
   * ```
   */
  watch?: unknown[];
};

/**
 * Options for useRerender hook
 */
export type RerenderOptions = {
  debounce?: number | "microtask";
};

/**
 * Rerender function returned by useRerender hook
 */
export type RerenderFunction<TData = void> = {
  (data?: TData): void;
  data?: TData;
  rendering: () => boolean;
  cancel: () => void;
  flush: () => void;
  immediate: (data?: TData) => void;
};
