/**
 * React-specific types for rextive
 */

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
  /** Trigger a debounced re-render (respects debounce options) */
  (data?: TData): void;
  /** Data passed with the last re-render */
  data?: TData;
  /** Check if component is currently rendering */
  rendering: () => boolean;
  /** Cancel any pending debounced re-render */
  cancel: () => void;
  /** Flush pending debounced re-render immediately (lodash debounce only) */
  flush: () => void;
  /** Bypass debouncing and trigger immediate re-render */
  immediate: (data?: TData) => void;
  /**
   * Factory that creates render-once functions for coalescing multiple updates.
   *
   * Each created function captures the current render generation at creation time.
   * When called, it only triggers a rerender if no render has happened since creation.
   * Multiple call sites can create functions, but only the first call triggers a render.
   *
   * @returns A function that triggers rerender only if no render occurred since creation
   *
   * @example
   * ```tsx
   * const renderFn1 = rerender.requestRerender();
   * const renderFn2 = rerender.requestRerender();
   * renderFn2();  // triggers rerender
   * renderFn1();  // skipped (render already happened)
   * ```
   */
  requestRerender: () => (data?: TData) => void;
};
