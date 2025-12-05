import { logic } from "../logic";
import type { AbstractLogic, Logic, Signal } from "../types";

// ============================================================================
// Types
// ============================================================================

/**
 * Extracts the mockable shape of a logic's return type.
 * Signals remain as signals, other properties remain as-is.
 */
export type MockableShape<T> = {
  [K in keyof T]: T[K] extends Signal<infer V, infer I> ? Signal<V, I> : T[K];
};

/**
 * A mock builder for a logic instance.
 * Provides methods to set defaults, provide overrides, and clear state.
 */
export interface LogicMock<T extends object> {
  /**
   * Set default values that are applied to every `provide()` call.
   * Useful in `beforeEach` to avoid repeating common setup.
   *
   * @param partial - Partial mock values to use as defaults
   * @returns this (for chaining)
   *
   * @example
   * ```ts
   * beforeEach(() => {
   *   $auth.default({
   *     user: signal(null),
   *     isAuthenticated: signal(false),
   *   });
   * });
   * ```
   */
  default(partial: Partial<MockableShape<T>>): this;

  /**
   * Provide mock implementation for the logic.
   * Merges with defaults set via `default()`.
   *
   * @param partial - Partial mock values (merged with defaults)
   * @returns The provided partial (for test assertions)
   *
   * @example
   * ```ts
   * it("shows user when authenticated", () => {
   *   const mock = $auth.provide({
   *     isAuthenticated: signal(true),
   *     user: signal({ name: "Alice" }),
   *   });
   *   // Use mock.user, mock.isAuthenticated for assertions
   * });
   * ```
   */
  provide(partial?: Partial<MockableShape<T>>): Partial<MockableShape<T>>;

  /**
   * Clear all mocks and reset the logic registry.
   * Should be called in `afterEach` to ensure test isolation.
   *
   * @example
   * ```ts
   * afterEach(() => {
   *   $auth.clear();
   * });
   * ```
   */
  clear(): void;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a mock builder for a logic instance.
 *
 * The mock uses a Proxy that:
 * - Returns overridden values when available
 * - Provides a default `dispose` method
 * - Throws helpful errors for missing overrides
 *
 * @param targetLogic - The logic to mock
 * @returns A mock builder with `default()`, `provide()`, and `clear()` methods
 *
 * @example
 * ```ts
 * import "rextive/test";
 *
 * const $cart = logic.mock(cartLogic);
 *
 * beforeEach(() => {
 *   $cart.default({
 *     items: signal([]),
 *     itemCount: signal(0),
 *   });
 * });
 *
 * afterEach(() => $cart.clear());
 *
 * it("shows empty cart", () => {
 *   $cart.provide({ items: signal([]) });
 *   render(<Cart />);
 *   expect(screen.getByText("Empty")).toBeInTheDocument();
 * });
 * ```
 */
export function mockLogic<T extends object>(
  targetLogic: Logic<T> | AbstractLogic<T>
): LogicMock<T> {
  let defaults: Partial<MockableShape<T>> = {};
  let overrides: Partial<MockableShape<T>> = {};

  const proxy = new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      const key = prop as keyof T;

      // Return override if available
      if (key in overrides) {
        return overrides[key];
      }

      // Provide default dispose
      if (prop === "dispose") {
        return () => {};
      }

      // Throw helpful error for missing overrides
      throw new Error(
        `[logic.mock] No override for "${String(prop)}" in ${targetLogic.displayName}. ` +
          `Add it to default() or provide().`
      );
    },

    has(_target, prop) {
      return prop in overrides || prop === "dispose";
    },

    // Prevent modifications
    set() {
      throw new Error(
        `[logic.mock] Cannot set properties on mock. Use provide() instead.`
      );
    },
  });

  const resolver = () => proxy;

  return {
    default(partial: Partial<MockableShape<T>>) {
      defaults = { ...defaults, ...partial };
      return this;
    },

    provide(partial: Partial<MockableShape<T>> = {}) {
      overrides = { ...defaults, ...partial };
      logic.provide(targetLogic, resolver);
      return partial;
    },

    clear() {
      defaults = {};
      overrides = {};
      logic.clear();
    },
  };
}

