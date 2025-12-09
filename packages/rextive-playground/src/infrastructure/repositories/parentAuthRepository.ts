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

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const settings = await db.parentSettings.toArray();
    if (settings.length === 0) return false;

    // Verify current password first
    const isValid = await verifyPassword(
      currentPassword,
      settings[0].passwordHash
    );
    if (!isValid) return false;

    // Hash new password and update
    const newHash = await hashPassword(newPassword);
    await db.parentSettings.update(settings[0].id!, {
      passwordHash: newHash,
    });

    return true;
  },
};

