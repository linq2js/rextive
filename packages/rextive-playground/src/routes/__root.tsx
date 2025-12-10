import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppOverlays } from "@/features/AppOverlays";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-pattern-kid">
      <Outlet />
      <AppOverlays />
    </div>
  );
}

