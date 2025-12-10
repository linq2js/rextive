// Local logic for profile form (add/edit kid profile)
import { signal } from "rextive";
import { patch } from "rextive/helpers";
import { kidProfilesLogic } from "./kidProfilesLogic";
import type { KidProfile, AvatarEmoji } from "@/domain/types";

export interface ProfileFormState {
  name: string;
  avatar: AvatarEmoji;
  age: number;
  loading: boolean;
  error: string;
  showDeleteConfirm: boolean;
}

export function profileFormLogic(onClose: () => void, editProfile?: KidProfile) {
  const $profiles = kidProfilesLogic();

  const state = signal<ProfileFormState>(
    {
      name: editProfile?.name || "",
      avatar: editProfile?.avatar || "🐉",
      age: editProfile?.age || 5,
      loading: false,
      error: "",
      showDeleteConfirm: false,
    },
    { name: "profileForm.state" }
  );

  async function submit() {
    const { name, avatar, age } = state();
    if (!name.trim()) {
      state.set(patch("error", "Name is required"));
      return;
    }

    state.set(patch({ loading: true, error: "" }));

    try {
      if (editProfile) {
        await $profiles.update(editProfile.id, { name: name.trim(), avatar, age });
      } else {
        await $profiles.create({ name: name.trim(), avatar, age });
      }
      onClose();
    } catch (e) {
      state.set(patch("error", e instanceof Error ? e.message : "An error occurred"));
    } finally {
      state.set(patch("loading", false));
    }
  }

  async function remove() {
    if (!editProfile) return;

    state.set(patch({ loading: true, error: "" }));

    try {
      await $profiles.remove(editProfile.id);
      onClose();
    } catch (e) {
      state.set(patch("error", e instanceof Error ? e.message : "Failed to delete profile"));
    } finally {
      state.set(patch("loading", false));
    }
  }

  function requestDelete() {
    state.set(patch("showDeleteConfirm", true));
  }

  function cancelDelete() {
    state.set(patch("showDeleteConfirm", false));
  }

  async function confirmDelete() {
    await remove();
  }

  return {
    state,
    submit,
    remove,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isEditing: !!editProfile,
  };
}
