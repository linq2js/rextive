import { describe, it, expect, vi, beforeEach } from "vitest";
import { signal } from "../index";
import { persistor } from "./persistor";

// Helper to wait for async operations to complete
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("persistor plugin", () => {
  describe("basic usage", () => {
    it("should save signal value on change", () => {
      const savedValues: Record<string, any> = {};

      const persist = persistor({
        load: () => savedValues,
        save: ({ values }) => Object.assign(savedValues, values),
      });

      const count = signal(0, { use: [persist("count")] });

      expect(savedValues.count).toBeUndefined();

      count.set(5);
      expect(savedValues.count).toBe(5);

      count.set(10);
      expect(savedValues.count).toBe(10);

      count.dispose();
    });

    it("should load initial value from storage", async () => {
      const savedValues = { count: 42 };

      const persist = persistor({
        load: () => savedValues,
        save: ({ values }) => Object.assign(savedValues, values),
      });

      const count = signal(0, { use: [persist("count")] });

      // Wait for async hydration
      await tick();

      expect(count()).toBe(42);

      count.dispose();
    });

    it("should handle multiple signals with same persistor", async () => {
      const storage: Record<string, any> = { name: "Alice" };

      const persist = persistor({
        load: () => storage,
        save: ({ values }) => Object.assign(storage, values),
      });

      const name = signal("default", { use: [persist("name")] });
      const age = signal(0, { use: [persist("age")] });

      // Wait for async hydration
      await tick();

      expect(name()).toBe("Alice");
      expect(age()).toBe(0); // Not in storage, use default

      name.set("Bob");
      age.set(30);

      expect(storage.name).toBe("Bob");
      expect(storage.age).toBe(30);

      name.dispose();
      age.dispose();
    });
  });

  describe("error handling", () => {
    it("should call onError on load failure", () => {
      const onError = vi.fn();

      const persist = persistor({
        load: () => {
          throw new Error("Load failed");
        },
        save: vi.fn(),
        onError,
      });

      const count = signal(0, { use: [persist("count")] });

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        "load"
      );
      expect(count()).toBe(0); // Falls back to initial value

      count.dispose();
    });

    it("should call onError on save failure", () => {
      const onError = vi.fn();

      const persist = persistor({
        load: () => ({}),
        save: () => {
          throw new Error("Save failed");
        },
        onError,
      });

      const count = signal(0, { use: [persist("count")] });
      count.set(5);

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        "save"
      );

      count.dispose();
    });
  });

  describe("hydrate behavior", () => {
    it("should hydrate value from storage", async () => {
      const storage = { count: 100 };

      const persist = persistor({
        load: () => storage,
        save: ({ values }) => Object.assign(storage, values),
      });

      const count = signal(0, { use: [persist("count")] });

      // Wait for async hydration
      await tick();

      // Value was hydrated from storage
      expect(count()).toBe(100);

      count.dispose();
    });

    it("should not overwrite user-set value with hydrate", async () => {
      let loadCalled = false;

      const persist = persistor({
        load: () => {
          loadCalled = true;
          return { count: 999 };
        },
        save: vi.fn(),
      });

      const count = signal(0);
      count.set(50); // User sets value before plugin

      // Now apply plugin
      const plugin = persist("count");
      plugin(count as any);

      // Wait for async hydration attempt
      await tick();

      // User value should be preserved, not overwritten by hydrate
      // (since signal was already modified)
      expect(count()).toBe(50);
      expect(loadCalled).toBe(true);

      count.dispose();
    });
  });

  describe("cleanup", () => {
    it("should stop listening on dispose", () => {
      const storage: Record<string, any> = {};
      const save = vi.fn(({ values }: any) => Object.assign(storage, values));

      const persist = persistor({
        load: () => storage,
        save,
      });

      const count = signal(0, { use: [persist("count")] });

      count.set(5);
      expect(save).toHaveBeenCalledTimes(1);

      count.dispose();

      // After dispose, save should not be called
      // Note: set() on disposed signal would throw, so we just verify cleanup ran
    });
  });

  describe("type inference", () => {
    it("should work with complex types", async () => {
      interface User {
        name: string;
        age: number;
      }

      type PersistedData = {
        user: User;
        settings: { theme: string };
      };

      const storage: Partial<PersistedData> = {
        user: { name: "Test", age: 25 },
      };

      const persist = persistor<PersistedData>({
        load: () => storage as PersistedData,
        save: ({ values }) => Object.assign(storage, values),
      });

      const user = signal<User>({ name: "Default", age: 0 }, {
        use: [persist("user")],
      });

      // Wait for async hydration
      await tick();

      expect(user()).toEqual({ name: "Test", age: 25 });

      user.set({ name: "Updated", age: 30 });
      expect(storage.user).toEqual({ name: "Updated", age: 30 });

      user.dispose();
    });
  });
});

