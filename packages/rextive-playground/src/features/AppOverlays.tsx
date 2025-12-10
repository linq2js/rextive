/**
 * @file AppOverlays.tsx
 * @description App-level overlay container that renders the active overlay.
 *
 * This component subscribes to appOverlaysLogic and renders the appropriate
 * modal based on the current overlay state. Using a global logic ensures
 * overlays persist across route changes.
 */
import { rx } from "rextive/react";
import { appOverlaysLogic } from "@/logic/appOverlays.logic";
import { ProfileFormModal } from "./ProfileFormModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

export function AppOverlays() {
  const $overlays = appOverlaysLogic();

  return rx(() => {
    const overlay = $overlays.active();

    // No overlay active
    if (overlay.type === "none") return null;

    // Render overlay backdrop with appropriate modal
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        {overlay.type === "profileForm" && (
          <ProfileFormModal
            profile={overlay.editProfile}
            onClose={() => $overlays.close()}
          />
        )}

        {overlay.type === "confirmDelete" && (
          <ConfirmDeleteModal
            profileId={overlay.profileId}
            profileName={overlay.profileName}
            onClose={() => $overlays.close()}
          />
        )}
      </div>
    );
  });
}
