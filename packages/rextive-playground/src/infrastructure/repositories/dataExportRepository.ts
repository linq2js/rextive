// Infrastructure layer - Data export/import repository
import { db } from "../database";
import type {
  KidProfile,
  ParentSettings,
  GameProgress,
  KidEnergy,
  KidGameSettings,
} from "@/domain/types";

// Export data structure
export interface ExportData {
  version: number;
  exportedAt: string;
  data: {
    kidProfiles: Omit<KidProfile, "id">[];
    parentSettings: Omit<ParentSettings, "id">[];
    gameProgress: Omit<GameProgress, "id">[];
    kidEnergy: Omit<KidEnergy, "id">[];
    kidGameSettings: Omit<KidGameSettings, "id">[];
  };
  // Map old kid IDs to preserve relationships
  kidIdMap: Record<number, number>;
}

const EXPORT_VERSION = 1;

export interface DataExportRepository {
  exportAll(): Promise<string>;
  importAll(jsonData: string): Promise<{ success: boolean; message: string }>;
  validateImportData(jsonData: string): { valid: boolean; error?: string };
  resetAll(): Promise<void>;
}

export const dataExportRepository: DataExportRepository = {
  async exportAll(): Promise<string> {
    // Fetch all data
    const [kidProfiles, parentSettings, gameProgress, kidEnergy, kidGameSettings] =
      await Promise.all([
        db.kidProfiles.toArray(),
        db.parentSettings.toArray(),
        db.gameProgress.toArray(),
        db.kidEnergy.toArray(),
        db.kidGameSettings.toArray(),
      ]);

    // Build kid ID map (for reference during import)
    const kidIdMap: Record<number, number> = {};
    kidProfiles.forEach((profile, index) => {
      if (profile.id) {
        kidIdMap[profile.id] = index;
      }
    });

    const exportData: ExportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        kidProfiles: kidProfiles.map(({ id, ...rest }) => rest),
        parentSettings: parentSettings.map(({ id, ...rest }) => rest),
        gameProgress: gameProgress.map(({ id, ...rest }) => rest),
        kidEnergy: kidEnergy.map(({ id, ...rest }) => rest),
        kidGameSettings: kidGameSettings.map(({ id, ...rest }) => rest),
      },
      kidIdMap,
    };

    return JSON.stringify(exportData, null, 2);
  },

  validateImportData(jsonData: string): { valid: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonData) as ExportData;

      if (!data.version) {
        return { valid: false, error: "Missing version field" };
      }

      if (!data.data) {
        return { valid: false, error: "Missing data field" };
      }

      if (!Array.isArray(data.data.kidProfiles)) {
        return { valid: false, error: "Invalid kidProfiles format" };
      }

      return { valid: true };
    } catch (e) {
      return { valid: false, error: "Invalid JSON format" };
    }
  },

  async importAll(
    jsonData: string
  ): Promise<{ success: boolean; message: string }> {
    // Validate first
    const validation = this.validateImportData(jsonData);
    if (!validation.valid) {
      return { success: false, message: validation.error || "Invalid data" };
    }

    try {
      const importData = JSON.parse(jsonData) as ExportData;

      // Clear existing data
      await Promise.all([
        db.kidProfiles.clear(),
        db.parentSettings.clear(),
        db.gameProgress.clear(),
        db.kidEnergy.clear(),
        db.kidGameSettings.clear(),
      ]);

      // Import parent settings first
      if (importData.data.parentSettings.length > 0) {
        await db.parentSettings.bulkAdd(importData.data.parentSettings);
      }

      // Import kid profiles and build new ID map
      const newKidIdMap: Record<number, number> = {};
      for (let i = 0; i < importData.data.kidProfiles.length; i++) {
        const profile = importData.data.kidProfiles[i];
        const newId = await db.kidProfiles.add(profile);

        // Find the original ID from the kidIdMap
        const originalId = Object.entries(importData.kidIdMap).find(
          ([, idx]) => idx === i
        )?.[0];
        if (originalId) {
          newKidIdMap[Number(originalId)] = newId as number;
        }
      }

      // Import game progress with updated kid IDs
      if (importData.data.gameProgress.length > 0) {
        const updatedProgress = importData.data.gameProgress.map((progress) => ({
          ...progress,
          kidId: newKidIdMap[progress.kidId] || progress.kidId,
        }));
        await db.gameProgress.bulkAdd(updatedProgress);
      }

      // Import energy with updated kid IDs
      if (importData.data.kidEnergy.length > 0) {
        const updatedEnergy = importData.data.kidEnergy.map((energy) => ({
          ...energy,
          kidId: newKidIdMap[energy.kidId] || energy.kidId,
        }));
        await db.kidEnergy.bulkAdd(updatedEnergy);
      }

      // Import game settings with updated kid IDs
      if (importData.data.kidGameSettings.length > 0) {
        const updatedSettings = importData.data.kidGameSettings.map((setting) => ({
          ...setting,
          kidId: newKidIdMap[setting.kidId] || setting.kidId,
        }));
        await db.kidGameSettings.bulkAdd(updatedSettings);
      }

      const profileCount = importData.data.kidProfiles.length;
      return {
        success: true,
        message: `Imported ${profileCount} profile${profileCount !== 1 ? "s" : ""} successfully!`,
      };
    } catch (e) {
      console.error("Import error:", e);
      return {
        success: false,
        message: "Failed to import data. Please check the file format.",
      };
    }
  },

  async resetAll(): Promise<void> {
    // Clear all tables - resets stats, streaks, energy, everything
    await Promise.all([
      db.kidProfiles.clear(),
      db.parentSettings.clear(),
      db.gameProgress.clear(),
      db.kidEnergy.clear(),
      db.kidGameSettings.clear(),
    ]);
    // Also clear localStorage
    localStorage.removeItem("selected_profile_id");
  },
};

