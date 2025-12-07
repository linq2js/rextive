/**
 * React-specific exports for rextive
 *
 * This module provides React hooks and components for reactive state management.
 * It re-exports all core rextive exports so React users only need a single import.
 *
 * @example
 * ```tsx
 * // All-in-one import for React users
 * import { signal, rx, useScope, wait, task } from 'rextive/react';
 *
 * const count = signal(0);
 *
 * // Simple signal display
 * function Counter() {
 *   return <div>{rx(count)}</div>;
 * }
 *
 * // Reactive function with auto-tracking
 * function FullCounter() {
 *   return rx(() => (
 *     <div>Count: {count()}</div>
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

// Re-export useScope options
export type { UseScopeOptions } from "./useScope";

// Export React components and hooks
export { rx } from "./rx";
export { useScope } from "./useScope";
export * from "./provider";
export { useStable } from "./useStable";
export type { StableGet } from "./useStable";
