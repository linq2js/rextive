import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppOverlays } from "@/features/AppOverlays";
import { GlobalModal } from "@/components/Modal";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="portrait-container">
      <div className="min-h-screen bg-pattern-kid overflow-auto">
        <Outlet />
        <AppOverlays />
        <GlobalModal />
      </div>
    </div>
  );
}

