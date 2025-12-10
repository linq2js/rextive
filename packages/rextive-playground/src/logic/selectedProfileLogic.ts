// Global logic for selected kid profile
import { logic, signal } from "rextive";
import { kidProfilesLogic } from "./kidProfilesLogic";
import type { KidProfile } from "@/domain/types";

const STORAGE_KEY = "selected_profile_id";

export const selectedProfileLogic = logic("selectedProfileLogic", () => {
  const $profiles = kidProfilesLogic();

  // Restore from localStorage (persists across browser sessions)
  const storedId = localStorage.getItem(STORAGE_KEY);
  const selectedId = signal<number | null>(storedId ? Number(storedId) : null, {
    name: "selectedProfile.id",
  });

  // Derived: current profile - uses profilesTask for stale-while-revalidate
  const profile = signal(
    { selectedId, profiles: $profiles.profilesTask },
    ({ deps }): KidProfile | null => {
      if (deps.selectedId === null) return null;
      return deps.profiles.value.find((p) => p.id === deps.selectedId) ?? null;
    },
    { name: "selectedProfile.profile" }
  );

  function select(id: number) {
    selectedId.set(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }

  function clear() {
    selectedId.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    selectedId,
    profile,
    select,
    clear,
  };
});
