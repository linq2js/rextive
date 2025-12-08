// Infrastructure layer - Dexie implementation of ParentAuthRepository

import { db } from "../database";
import { hashPassword, verifyPassword } from "../crypto";
import type { ParentAuthRepository } from "@/domain/repositories";

export const parentAuthRepository: ParentAuthRepository = {
  async isSetup(): Promise<boolean> {
    const settings = await db.parentSettings.toArray();
    return settings.length > 0;
  },

  async setup(password: string): Promise<void> {
    const hash = await hashPassword(password);
    await db.parentSettings.add({
      passwordHash: hash,
      createdAt: new Date(),
    });
  },

  async authenticate(password: string): Promise<boolean> {
    const settings = await db.parentSettings.toArray();
    if (settings.length === 0) return false;
    return verifyPassword(password, settings[0].passwordHash);
  },
};

