// Global logic for kid profiles
import { logic, signal, task } from "rextive";
import { kidProfileRepository } from "@/infrastructure/repositories";
import type { KidProfile, CreateKidProfile, UpdateKidProfile } from "@/domain/types";

export const kidProfilesLogic = logic("kidProfilesLogic", () => {
  // Trigger for refresh
  const [onRefresh, refresh] = signal<void>().tuple;

  // Profiles - loads initially and on refresh
  const profiles = signal({ onRefresh }, async ({ deps }) => {
    void deps.onRefresh; // Access to establish dependency
    return kidProfileRepository.getAll();
  }, { name: "kidProfiles.list" });

  // Task-wrapped for stale-while-revalidate in computed signals
  const profilesTask = profiles.pipe(task<KidProfile[]>([]));

  // Action state for create
  const createState = signal<Promise<number>>();
  async function create(profile: CreateKidProfile): Promise<number> {
    const promise = (async () => {
      const id = await kidProfileRepository.create(profile);
      refresh();
      return id;
    })();
    createState.set(promise);
    return promise;
  }

  // Action state for update
  const updateState = signal<Promise<void>>();
  async function update(id: number, profile: UpdateKidProfile): Promise<void> {
    const promise = (async () => {
      await kidProfileRepository.update(id, profile);
      refresh();
    })();
    updateState.set(promise);
    return promise;
  }

  // Action state for remove
  const removeState = signal<Promise<void>>();
  async function remove(id: number): Promise<void> {
    const promise = (async () => {
      await kidProfileRepository.delete(id);
      refresh();
    })();
    removeState.set(promise);
    return promise;
  }

  return {
    profiles,
    profilesTask,
    refresh,
    create: Object.assign(create, { state: createState }),
    update: Object.assign(update, { state: updateState }),
    remove: Object.assign(remove, { state: removeState }),
  };
});
