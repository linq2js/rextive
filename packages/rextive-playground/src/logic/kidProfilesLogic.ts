// Global logic for kid profiles
import { logic, signal } from "rextive";
import { kidProfileRepository } from "@/infrastructure/repositories";
import type { KidProfile, CreateKidProfile, UpdateKidProfile } from "@/domain/types";

export const kidProfilesLogic = logic("kidProfilesLogic", () => {
  const profiles = signal<KidProfile[]>([], { name: "kidProfiles.list" });
  const isLoading = signal(true, { name: "kidProfiles.isLoading" });

  // Load profiles on creation
  async function refresh() {
    isLoading.set(true);
    const data = await kidProfileRepository.getAll();
    profiles.set(data);
    isLoading.set(false);
  }

  refresh();

  async function create(profile: CreateKidProfile): Promise<number> {
    const id = await kidProfileRepository.create(profile);
    await refresh();
    return id;
  }

  async function update(id: number, profile: UpdateKidProfile): Promise<void> {
    await kidProfileRepository.update(id, profile);
    await refresh();
  }

  async function remove(id: number): Promise<void> {
    await kidProfileRepository.delete(id);
    await refresh();
  }

  return {
    profiles,
    isLoading,
    refresh,
    create,
    update,
    remove,
  };
});

