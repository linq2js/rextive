/**
 * @file games.tsx
 * @description Layout route that protects all game routes.
 *
 * Uses the reusable guards.requireProfile() to ensure a kid profile
 * is selected before allowing access to any game.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { guards } from "@/logic";

export const Route = createFileRoute("/games")({
  // Require profile to access any game - redirects to "/" if no profile
  beforeLoad: guards.requireProfile(),
  component: GamesLayout,
});

/**
 * Layout component for game routes.
 * Simply renders the child route (specific game).
 */
function GamesLayout() {
  return <Outlet />;
}
