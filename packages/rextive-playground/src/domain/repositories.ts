// Repository interfaces - abstractions for data access
// These define WHAT we need, not HOW it's implemented

import type { KidProfile, CreateKidProfile, UpdateKidProfile } from "./types";

export interface KidProfileRepository {
  getAll(): Promise<KidProfile[]>;
  getById(id: number): Promise<KidProfile | undefined>;
  create(profile: CreateKidProfile): Promise<number>;
  update(id: number, profile: UpdateKidProfile): Promise<void>;
  delete(id: number): Promise<void>;
}

export interface ParentAuthRepository {
  isSetup(): Promise<boolean>;
  setup(password: string): Promise<void>;
  authenticate(password: string): Promise<boolean>;
  changePassword(currentPassword: string, newPassword: string): Promise<boolean>;
}

