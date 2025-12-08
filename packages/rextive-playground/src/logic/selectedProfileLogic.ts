// Global logic for selected kid profile
import { logic, signal } from "rextive";
import { kidProfilesLogic } from "./kidProfilesLogic";
import type { KidProfile } from "@/domain/types";

const STORAGE_KEY = "selected_profile_id";

export const selectedProfileLogic = logic("selectedProfileLogic", () => {
  const $profiles = kidProfilesLogic();

  // Restore from session
  const storedId = sessionStorage.getItem(STORAGE_KEY);
  const selectedId = signal<number | null>(storedId ? Number(storedId) : null, {
    name: "selectedProfile.id",
  });

  // Derived: current profile
  const profile = signal(
    { selectedId, profiles: $profiles.profiles },
    ({ deps }): KidProfile | null => {
      if (deps.selectedId === null) return null;
      return deps.profiles.find((p) => p.id === deps.selectedId) ?? null;
    },
    { name: "selectedProfile.profile" }
  );

  function select(id: number) {
    selectedId.set(id);
    sessionStorage.setItem(STORAGE_KEY, String(id));
  }

  function clear() {
    selectedId.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return {
    selectedId,
    profile,
    isLoading: $profiles.isLoading,
    select,
    clear,
  };
});

