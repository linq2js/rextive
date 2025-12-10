// App-level logic for managing overlays (modals, popups)
// Overlays persist across route changes to prevent disposal bugs
import { logic, signal } from "rextive";
import type { KidProfile } from "@/domain/types";

export type OverlayType =
  | { type: "none" }
  | { type: "profileForm"; editProfile?: KidProfile }
  | { type: "confirmDelete"; profileId: number; profileName: string };

export const appOverlaysLogic = logic("appOverlaysLogic", () => {
  const activeOverlay = signal<OverlayType>(
    { type: "none" },
    { name: "appOverlays.active" }
  );

  function openProfileForm(editProfile?: KidProfile) {
    activeOverlay.set({ type: "profileForm", editProfile });
  }

  function openConfirmDelete(profileId: number, profileName: string) {
    activeOverlay.set({ type: "confirmDelete", profileId, profileName });
  }

  function closeOverlay() {
    activeOverlay.set({ type: "none" });
  }

  return {
    activeOverlay,
    openProfileForm,
    openConfirmDelete,
    closeOverlay,
  };
});

