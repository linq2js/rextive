/**
 * React-specific exports for rextive
 *
 * This module provides React hooks and components for reactive state management.
 * It builds on top of the core rextive primitives (signal, wait, etc.)
 *
 * @example
 * ```tsx
 * import { signal } from 'rextive';
 * import { rx, useScope, useSignals } from 'rextive/react';
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

// Re-export React-specific types
export type {
  RxOptions,
  RerenderOptions,
  RerenderFunction,
} from "./types";

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
export { useSignals } from "./useSignals";
export { useRerender } from "./useRerender";
