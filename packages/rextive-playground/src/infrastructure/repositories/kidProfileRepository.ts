// Infrastructure layer - Dexie implementation of KidProfileRepository

import { db } from "../database";
import type {
  KidProfileRepository,
} from "@/domain/repositories";
import type {
  KidProfile,
  CreateKidProfile,
  UpdateKidProfile,
  AvatarEmoji,
} from "@/domain/types";

export const kidProfileRepository: KidProfileRepository = {
  async getAll(): Promise<KidProfile[]> {
    const profiles = await db.kidProfiles.orderBy("createdAt").toArray();
    return profiles.map((p) => ({
      ...p,
      id: p.id!,
      avatar: p.avatar as AvatarEmoji,
    }));
  },

  async getById(id: number): Promise<KidProfile | undefined> {
    const profile = await db.kidProfiles.get(id);
    if (!profile) return undefined;
    return {
      ...profile,
      id: profile.id!,
      avatar: profile.avatar as AvatarEmoji,
    };
  },

  async create(profile: CreateKidProfile): Promise<number> {
    const now = new Date();
    const id = await db.kidProfiles.add({
      ...profile,
      createdAt: now,
      updatedAt: now,
    });
    return id as number;
  },

  async update(id: number, profile: UpdateKidProfile): Promise<void> {
    await db.kidProfiles.update(id, {
      ...profile,
      updatedAt: new Date(),
    });
  },

  async delete(id: number): Promise<void> {
    await db.kidProfiles.delete(id);
    // Also delete associated game progress
    await db.gameProgress.where("kidId").equals(id).delete();
  },
};

