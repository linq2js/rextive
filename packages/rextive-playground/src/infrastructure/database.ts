// Infrastructure layer - Dexie database implementation

import Dexie, { type EntityTable } from "dexie";
import type {
  KidProfile,
  ParentSettings,
  GameProgress,
  KidEnergy,
  KidGameSettings,
} from "@/domain/types";

// Database entity types (with optional id for new records)
interface KidProfileEntity extends Omit<KidProfile, "id"> {
  id?: number;
}

interface ParentSettingsEntity extends Omit<ParentSettings, "id"> {
  id?: number;
}

interface GameProgressEntity extends Omit<GameProgress, "id"> {
  id?: number;
}

interface KidEnergyEntity extends Omit<KidEnergy, "id"> {
  id?: number;
}

interface KidGameSettingsEntity extends Omit<KidGameSettings, "id"> {
  id?: number;
}

class PlaygroundDatabase extends Dexie {
  kidProfiles!: EntityTable<KidProfileEntity, "id">;
  parentSettings!: EntityTable<ParentSettingsEntity, "id">;
  gameProgress!: EntityTable<GameProgressEntity, "id">;
  kidEnergy!: EntityTable<KidEnergyEntity, "id">;
  kidGameSettings!: EntityTable<KidGameSettingsEntity, "id">;

  constructor() {
    super("RextivePlayground");

    this.version(1).stores({
      kidProfiles: "++id, name, createdAt",
      parentSettings: "++id",
      gameProgress: "++id, kidId, gameName, [kidId+gameName]",
    });

    // Version 2: Add energy table
    this.version(2).stores({
      kidProfiles: "++id, name, createdAt",
      parentSettings: "++id",
      gameProgress: "++id, kidId, gameName, [kidId+gameName]",
      kidEnergy: "++id, kidId",
    });

    // Version 3: Add game settings table
    this.version(3).stores({
      kidProfiles: "++id, name, createdAt",
      parentSettings: "++id",
      gameProgress: "++id, kidId, gameName, [kidId+gameName]",
      kidEnergy: "++id, kidId",
      kidGameSettings: "++id, kidId, gameId, [kidId+gameId]",
    });
  }
}

export const db = new PlaygroundDatabase();

