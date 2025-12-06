import debounce from "lodash/debounce";
import { useEffect, useState } from "react";
import { RerenderOptions, RerenderFunction } from "./types";

/**
 * Hook for managing component re-renders with optional debouncing and data passing.
 * Returns a stable function reference that only changes when dependencies change.
 *
 * @template TData - Type of data to pass with re-render
 * @param options - Configuration options
 * @param options.debounce - Debounce delay in milliseconds (0 = microtask queue)
 * @returns Stable rerender function with cancel, flush, immediate, requestRerender, data, and rendering properties
 *
 * @example
 * ```tsx
 * const rerender = useRerender<number>({ debounce: 100 });
 * rerender(42); // Debounced re-render with data
 * rerender.immediate(42); // Immediate re-render
 * rerender.cancel(); // Cancel pending debounced re-render
 * console.log(rerender.data); // Access last re-render data
 * console.log(rerender.rendering()); // Check if currently rendering
 * ```
 */
export function useRerender<TData = void>(
  options: RerenderOptions = {}
): RerenderFunction<TData> {
  // useState instead of useReducer: triggers re-renders when originalRerender is called
  // The data is wrapped in an object to ensure a new reference on each render
  const [rerenderData, originalRerender] = useState<{ data?: TData }>({});

  // Controller created once and persists for component lifetime
  // Using useState with initializer ensures it's only created on mount
  const [controller] = useState(
    () => new RerenderController<TData>(originalRerender, options)
  );

  // Update controller state on each render (options may change, data always updates)
  // This must be called during render phase to track isRendering correctly
  controller.onRender(options, rerenderData.data);

  // Track rendering state: set to true during render, false after paint
  // Cleanup cancels any pending debounced calls on unmount
  useEffect(() => {
    return controller.onMount();
  }, [controller]); // Controller is stable but included for exhaustive-deps

  return controller.rerender;
}

/**
 * Unified debounced function interface
 * - Supports lodash debounce (with cancel/flush)
 * - Supports microtask debounce (with cancel only)
 * - Supports no debounce (renderWrapper directly)
 */
type Debounced<TData> = {
  (data?: TData): void;
  cancel?: VoidFunction; // Optional: not all implementations support cancel
  flush?: VoidFunction; // Optional: only lodash debounce supports flush
};

/**
 * Controller for managing rerender state and debouncing logic
 * Separated from the hook to avoid recreating functions on each render
 */
class RerenderController<TData = void> {
  private originalRerender: (value: { data?: TData }) => void;
  private renderWrapper: (data?: TData) => void;

  private isRendering: boolean = false;
  private renderGeneration: number = 0; // Increments on each render cycle
  private options: RerenderOptions = {};

  // Cache debounced function to avoid recreating on each rerender call
  // Recreated only when debounce config changes
  private debounced:
    | {
        func: Debounced<TData>;
        configs: number | "microtask" | undefined; // Track config to detect changes
      }
    | undefined;

  // Public stable function reference returned to component
  public rerender: RerenderFunction<TData>;

  constructor(
    originalRerender: (value: { data?: TData }) => void,
    options: RerenderOptions = {}
  ) {
    this.options = options;
    this.originalRerender = originalRerender;
    // Wrapper that transforms data into the format useState expects
    this.renderWrapper = (data?: TData) => originalRerender({ data });

    // Create stable function reference with attached utility methods
    // Main function always uses debounced version (respects options.debounce)
    this.rerender = Object.assign(
      (data?: TData) => {
        this.getDebounced()(data); // Get current debounced func (may change with options)
      },
      {
        // Cancel any pending debounced call
        cancel: () => this.getDebounced().cancel?.(),
        // Flush pending call immediately (lodash debounce only)
        flush: () => this.getDebounced().flush?.(),
        // Bypass debouncing and render immediately
        immediate: (data?: TData) => this.originalRerender({ data }),
        // Check if component is currently rendering
        rendering: () => this.isRendering,
        // Current render data (updated via onRender)
        data: undefined,
        // Factory that creates render-once functions for coalescing multiple updates.
        // Each created function captures the current render generation at creation time.
        // When called, it only triggers a rerender if no render has happened since creation.
        // Multiple call sites can create functions, but only the first call triggers a render.
        //
        // Example:
        //   const renderFn1 = rerender.requestRerender();
        //   const renderFn2 = rerender.requestRerender();
        //   renderFn2();  // triggers rerender (same generation as creation)
        //   renderFn1();  // skipped (generation changed after renderFn2's render)
        requestRerender: () => {
          // Capture current render generation at creation time
          const snapshotGeneration = this.renderGeneration;
          return (data?: TData) => {
            // Check if a render has occurred since this function was created
            // by comparing current generation to the snapshot
            const hasRenderedSinceCreation =
              snapshotGeneration !== this.renderGeneration;
            // Only trigger render if no render has happened since creation
            if (!hasRenderedSinceCreation) {
              this.rerender(data);
            }
          };
        },
      }
    );
  }

  /**
   * Creates appropriate debounced function based on config
   * Three modes:
   * 1. Number: Use lodash debounce with specified delay
   * 2. "microtask": Queue in microtask (Promise.resolve().then)
   * 3. undefined: No debouncing, render immediately
   */
  private createDebounced(): Debounced<TData> {
    const configs = this.options.debounce;

    // Mode 1: Standard debouncing with lodash
    if (typeof configs === "number") {
      return debounce(this.renderWrapper, configs);
    }

    // Mode 2: Microtask queue debouncing
    if (configs === "microtask") {
      // Token pattern: only the last queued call executes
      // Using identity comparison to detect cancellation
      let token: unknown = {};
      return Object.assign(
        (data?: TData) => {
          const currentToken: unknown = {};
          token = currentToken; // Latest token wins
          Promise.resolve().then(() => {
            // Execute only if not canceled and still the latest call
            if (currentToken === token) {
              this.renderWrapper(data);
            }
          });
        },
        {
          cancel: () => {
            token = null; // Clear token to prevent execution
          },
          flush: () => {}, // Microtasks can't be flushed synchronously
        }
      );
    }

    // Mode 3: No debouncing - return wrapper directly
    return this.renderWrapper;
  }

  /**
   * Gets cached debounced function, recreating only when config changes
   * Important: Cancels old debounced function to prevent stale timers
   */
  private getDebounced(): Debounced<TData> {
    const configs = this.options.debounce;

    // Recreate debounced function if config changed
    if (!this.debounced || this.debounced.configs !== configs) {
      // Critical: Cancel old function to prevent memory leaks
      // Old timers/microtasks must be canceled before replacement
      this.debounced?.func.cancel?.();

      this.debounced = {
        func: this.createDebounced(),
        configs, // Cache config to detect changes
      };
    }

    return this.debounced.func;
  }

  /**
   * Called during render phase to update controller state
   * Must be called before useEffect runs to track rendering correctly
   */
  onRender(newOptions: RerenderOptions, newData: TData | undefined) {
    this.isRendering = true; // Set true during render
    this.renderGeneration++; // Increment generation to invalidate requestRerender functions
    this.options = newOptions; // Update options (may change debounce config)
    // Mutate rerender.data to update the exposed API
    Object.assign(this.rerender, {
      data: newData,
    });
  }

  /**
   * Called after paint via useEffect
   * Returns cleanup function for component unmount
   */
  onMount() {
    this.isRendering = false; // Render complete, now painted
    return () => {
      // Cleanup on unmount
      this.isRendering = false;
      this.debounced?.func.cancel?.(); // Cancel any pending calls
      this.debounced = undefined; // Clear reference
    };
  }
}
