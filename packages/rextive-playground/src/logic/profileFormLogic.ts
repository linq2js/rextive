// Local logic for profile form (add/edit kid profile)
import { signal } from "rextive";
import { kidProfilesLogic } from "./kidProfilesLogic";
import type { KidProfile, AvatarEmoji } from "@/domain/types";

interface ProfileFormState {
  name: string;
  avatar: AvatarEmoji;
  age: number;
  loading: boolean;
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
      showDeleteConfirm: false,
    },
    { name: "profileForm.state" }
  );

  async function submit() {
    const { name, avatar, age } = state();
    if (!name.trim()) return;

    state.set((s) => ({ ...s, loading: true }));

    try {
      if (editProfile) {
        await $profiles.update(editProfile.id, { name: name.trim(), avatar, age });
      } else {
        await $profiles.create({ name: name.trim(), avatar, age });
      }
      onClose();
    } finally {
      state.set((s) => ({ ...s, loading: false }));
    }
  }

  async function remove() {
    if (!editProfile) return;

    state.set((s) => ({ ...s, loading: true }));

    try {
      await $profiles.remove(editProfile.id);
      onClose();
    } finally {
      state.set((s) => ({ ...s, loading: false }));
    }
  }

  return {
    state,
    submit,
    remove,
    isEditing: !!editProfile,
  };
}
