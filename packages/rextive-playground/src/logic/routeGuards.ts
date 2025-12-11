/**
 * @file routeGuards.ts
 * @description Reusable route guard utilities for TanStack Router's beforeLoad.
 *
 * These guards can be used in any route's beforeLoad hook to protect routes
 * based on various conditions (profile selected, parent authenticated, etc.)
 *
 * @example
 * ```ts
 * // In a route file:
 * import { guards } from "@/logic";
 *
 * export const Route = createFileRoute("/games")({
 *   beforeLoad: guards.requireProfile(),
 *   component: GamesLayout,
 * });
 *
 * // Or with custom redirect:
 * export const Route = createFileRoute("/premium")({
 *   beforeLoad: guards.requireProfile({ redirectTo: "/upgrade" }),
 * });
 * ```
 */
import { redirect } from "@tanstack/react-router";
import { selectedProfileLogic } from "./selectedProfile.logic";
import { parentAuthLogic } from "./parentAuth.logic";
import type { KidProfile } from "@/domain/types";

// =============================================================================
// TYPES
// =============================================================================

interface GuardOptions {
  /** Where to redirect if guard fails. Defaults to "/" */
  redirectTo?: string;
  /** Optional search params to add to redirect */
  search?: Record<string, string>;
}

interface ProfileGuardResult {
  profile: KidProfile;
}

interface ParentGuardResult {
  isAuthenticated: true;
}

// =============================================================================
// GUARD FACTORIES
// =============================================================================

/**
 * Creates route guards for protecting routes.
 *
 * Usage:
 * ```ts
 * import { guards } from "@/logic";
 *
 * // Require kid profile
 * beforeLoad: guards.requireProfile()
 *
 * // Require parent authentication
 * beforeLoad: guards.requireParent()
 *
 * // With custom redirect
 * beforeLoad: guards.requireProfile({ redirectTo: "/select-profile" })
 * ```
 */
export const guards = {
  /**
   * Guard that requires a kid profile to be selected.
   * Redirects to home if no profile is selected.
   *
   * @param options - Optional configuration
   * @returns beforeLoad function for TanStack Router
   */
  requireProfile: (options?: GuardOptions) => {
    return async (): Promise<ProfileGuardResult> => {
      const $selected = selectedProfileLogic();
      const profile = $selected.profile();

      if (!profile) {
        throw redirect({
          to: options?.redirectTo ?? "/",
          search: options?.search,
        });
      }

      return { profile };
    };
  },

  /**
   * Guard that requires parent authentication.
   * Redirects to parent login if not authenticated.
   *
   * @param options - Optional configuration
   * @returns beforeLoad function for TanStack Router
   */
  requireParent: (options?: GuardOptions) => {
    return async (): Promise<ParentGuardResult> => {
      const $auth = parentAuthLogic();
      const isAuthenticated = $auth.isAuthenticated();

      if (!isAuthenticated) {
        throw redirect({
          to: options?.redirectTo ?? "/mode/parent",
          search: options?.search,
        });
      }

      return { isAuthenticated: true };
    };
  },

  /**
   * Guard that requires BOTH profile AND parent authentication.
   * Useful for routes that need both conditions.
   *
   * @param options - Optional configuration
   * @returns beforeLoad function for TanStack Router
   */
  requireProfileAndParent: (options?: GuardOptions) => {
    return async (): Promise<ProfileGuardResult & ParentGuardResult> => {
      const $selected = selectedProfileLogic();
      const $auth = parentAuthLogic();

      const profile = $selected.profile();
      const isAuthenticated = $auth.isAuthenticated();

      if (!profile) {
        throw redirect({
          to: options?.redirectTo ?? "/",
          search: options?.search ?? { error: "no-profile" },
        });
      }

      if (!isAuthenticated) {
        throw redirect({
          to: options?.redirectTo ?? "/mode/parent",
          search: options?.search ?? { error: "not-authenticated" },
        });
      }

      return { profile, isAuthenticated: true };
    };
  },
};

// =============================================================================
// LEGACY EXPORTS (for backwards compatibility)
// =============================================================================

/** @deprecated Use guards.requireProfile() instead */
export const requireProfileGuard = guards.requireProfile;

/** @deprecated Use guards.requireParent() instead */
export const requireParentGuard = guards.requireParent;

