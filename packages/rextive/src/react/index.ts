/**
 * React-specific exports for rextive
 *
 * This module provides React hooks and components for reactive state management.
 * It re-exports all core rextive exports so React users only need a single import.
 *
 * @example
 * ```tsx
 * // All-in-one import for React users
 * import { signal, rx, useScope, wait, loadable } from 'rextive/react';
 *
 * const count = signal(0);
 *
 * function Counter() {
 *   return rx({ count }, (awaited) => (
 *     <div>{awaited.count}</div>
 *   ));
 * }
 * ```
 */

// =============================================================================
// Re-export ALL core rextive exports for convenience
// =============================================================================

export * from "../index";

// =============================================================================
// React-specific exports
// =============================================================================

// Re-export React-specific types
export type { RxOptions, RerenderOptions, RerenderFunction } from "./types";

// Re-export lifecycle types for useScope
export type {
  LifecyclePhase,
  LifecycleCallbacks as ComponentLifecycleCallbacks,
  LifecycleCallbacks as ObjectLifecycleCallbacks,
} from "./useLifecycle";

// Re-export useScope options
export type { UseScopeOptions } from "./useScope";

// Export React components and hooks
export { rx } from "./rx";
export { useScope } from "./useScope";
export { useWatch } from "./useWatch";
export { useRerender } from "./useRerender";
