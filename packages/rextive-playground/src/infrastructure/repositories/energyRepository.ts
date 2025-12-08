// Infrastructure layer - Energy repository implementation
import { db } from "../database";
import type { KidEnergy } from "@/domain/types";
import { ENERGY_CONFIG } from "@/domain/types";

export interface EnergyRepository {
  getEnergy(kidId: number): Promise<KidEnergy | null>;
  setEnergy(kidId: number, current: number, refillDate: string): Promise<void>;
  spendEnergy(kidId: number, amount: number): Promise<boolean>;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function shouldRefill(lastRefillDate: string): boolean {
  const today = getTodayDate();
  if (lastRefillDate < today) {
    // Check if current time is past refill hour
    const now = new Date();
    return now.getHours() >= ENERGY_CONFIG.refillHour;
  }
  return false;
}

export const energyRepository: EnergyRepository = {
  async getEnergy(kidId: number): Promise<KidEnergy | null> {
    const record = await db.kidEnergy.where("kidId").equals(kidId).first();

    if (!record || !record.id) {
      // Initialize energy for new kid
      const today = getTodayDate();
      const id = await db.kidEnergy.add({
        kidId,
        current: ENERGY_CONFIG.maxEnergy,
        lastRefillDate: today,
      });
      return {
        id: id as number,
        kidId,
        current: ENERGY_CONFIG.maxEnergy,
        lastRefillDate: today,
      };
    }

    // Check if refill is needed
    if (shouldRefill(record.lastRefillDate)) {
      const today = getTodayDate();
      await db.kidEnergy.update(record.id, {
        current: ENERGY_CONFIG.maxEnergy,
        lastRefillDate: today,
      });
      return {
        ...record,
        id: record.id,
        current: ENERGY_CONFIG.maxEnergy,
        lastRefillDate: today,
      };
    }

    return record as KidEnergy;
  },

  async setEnergy(
    kidId: number,
    current: number,
    refillDate: string
  ): Promise<void> {
    const record = await db.kidEnergy.where("kidId").equals(kidId).first();
    if (record?.id) {
      await db.kidEnergy.update(record.id, { current, lastRefillDate: refillDate });
    } else {
      await db.kidEnergy.add({ kidId, current, lastRefillDate: refillDate });
    }
  },

  async spendEnergy(kidId: number, amount: number): Promise<boolean> {
    const energy = await this.getEnergy(kidId);
    if (!energy || energy.current < amount) {
      return false;
    }

    await db.kidEnergy.update(energy.id, {
      current: energy.current - amount,
    });
    return true;
  },
};

