/**
 * Persistor Example - Automatic signal persistence
 *
 * This example demonstrates how to use the persistor API
 * to automatically save and load signal state from storage.
 */

import { signal } from "../src";
import { persistor, type SaveArgs } from "../src/persist";

// =============================================================================
// Example 1: Basic localStorage persistence
// =============================================================================

function basicPersistence() {
  // Create a simple persistor for localStorage
  const persist = persistor({
    load: () => {
      const stored = localStorage.getItem("app-state");
      return stored ? JSON.parse(stored) : {};
    },
    save: (args) => {
      if (args.type === "merge") {
        // Individual mode - merge with existing
        const existing = JSON.parse(localStorage.getItem("app-state") || "{}");
        localStorage.setItem("app-state", JSON.stringify({ ...existing, ...args.values }));
      } else {
        // Group mode - safe to overwrite
        localStorage.setItem("app-state", JSON.stringify(args.values));
      }
    },
    onError: (error, type) => {
      console.error(`Persistence ${type} failed:`, error);
    },
  });

  // Individual plugin mode - each signal is persisted separately
  const theme = signal("dark", { use: [persist("theme")] });
  const volume = signal(50, { use: [persist("volume")] });

  // Changing signals automatically saves to storage
  theme.set("light"); // Saves { theme: "light" }
  volume.set(75); // Saves { volume: 75 }

  console.log("Theme:", theme()); // "light"
  console.log("Volume:", volume()); // 75

  return { theme, volume };
}

// =============================================================================
// Example 2: Type-safe persistence with explicit data shape
// =============================================================================

function typeSafePersistence() {
  // Define your data shape for type safety
  type AppSettings = {
    theme: "light" | "dark";
    fontSize: number;
    notifications: boolean;
    language: string;
  };

  // Create a type-safe persistor
  const persist = persistor<AppSettings>({
    load: () => {
      const stored = localStorage.getItem("settings");
      return stored ? JSON.parse(stored) : {};
    },
    save: (args) => {
      const existing = JSON.parse(localStorage.getItem("settings") || "{}");
      localStorage.setItem("settings", JSON.stringify({ ...existing, ...args.values }));
    },
  });

  // Type-safe keys - only valid keys from AppSettings allowed
  const theme = signal<"light" | "dark">("dark", { use: [persist("theme")] }); // ✅
  const fontSize = signal(16, { use: [persist("fontSize")] }); // ✅
  const notifications = signal(true, { use: [persist("notifications")] }); // ✅
  const language = signal("en", { use: [persist("language")] }); // ✅

  // persist("invalid"); // ❌ TypeScript error - not a key of AppSettings

  return { theme, fontSize, notifications, language };
}

// =============================================================================
// Example 3: Group mode persistence
// =============================================================================

function groupPersistence() {
  const persist = persistor({
    load: () => {
      const stored = localStorage.getItem("form-data");
      return stored ? JSON.parse(stored) : {};
    },
    save: (args) => {
      // Group mode always uses "overwrite" - full data shape
      if (args.type === "overwrite") {
        localStorage.setItem("form-data", JSON.stringify(args.values));
        console.log("Saved all form data:", args.values);
      }
    },
  });

  // Create signals without persistence initially
  const firstName = signal("");
  const lastName = signal("");
  const email = signal("");

  // Apply persistence to all signals as a group
  const cleanup = signal.use({ firstName, lastName, email }, [persist]);

  // Any change saves all signals together
  firstName.set("John"); // Saves { firstName: "John", lastName: "", email: "" }
  lastName.set("Doe"); // Saves { firstName: "John", lastName: "Doe", email: "" }

  // Call cleanup() to stop persistence
  // cleanup();

  return { firstName, lastName, email, cleanup };
}

// =============================================================================
// Example 4: Async persistence (IndexedDB, API, etc.)
// =============================================================================

function asyncPersistence() {
  // Simulated async storage
  const asyncStorage = {
    data: {} as Record<string, any>,
    async get() {
      await new Promise((r) => setTimeout(r, 100)); // Simulate delay
      return this.data;
    },
    async set(values: Record<string, any>) {
      await new Promise((r) => setTimeout(r, 100)); // Simulate delay
      this.data = { ...this.data, ...values };
      console.log("Async storage updated:", this.data);
    },
  };

  const persist = persistor({
    load: async () => {
      console.log("Loading from async storage...");
      return await asyncStorage.get();
    },
    save: async (args) => {
      console.log("Saving to async storage...");
      await asyncStorage.set(args.values);
    },
  });

  const userData = signal({ name: "", email: "" }, { use: [persist("userData")] });

  return { userData, asyncStorage };
}

// =============================================================================
// Example 5: Multiple persistors for different storage
// =============================================================================

function multiplePersistors() {
  // Persistor for localStorage (preferences)
  const localPersist = persistor({
    load: () => JSON.parse(localStorage.getItem("preferences") || "{}"),
    save: (args) => {
      const existing = JSON.parse(localStorage.getItem("preferences") || "{}");
      localStorage.setItem("preferences", JSON.stringify({ ...existing, ...args.values }));
    },
  });

  // Persistor for sessionStorage (temporary data)
  const sessionPersist = persistor({
    load: () => JSON.parse(sessionStorage.getItem("session") || "{}"),
    save: (args) => {
      const existing = JSON.parse(sessionStorage.getItem("session") || "{}");
      sessionStorage.setItem("session", JSON.stringify({ ...existing, ...args.values }));
    },
  });

  // Long-lived preferences go to localStorage
  const theme = signal("dark", { use: [localPersist("theme")] });
  const language = signal("en", { use: [localPersist("language")] });

  // Temporary session data goes to sessionStorage
  const lastSearch = signal("", { use: [sessionPersist("lastSearch")] });
  const scrollPosition = signal(0, { use: [sessionPersist("scrollPosition")] });

  return { theme, language, lastSearch, scrollPosition };
}

// =============================================================================
// Example 6: Understanding SaveArgs type
// =============================================================================

function saveArgsExample() {
  type MyData = { count: number; name: string };

  const persist = persistor<MyData>({
    load: () => ({}),
    save: (args: SaveArgs<MyData>) => {
      // args is a discriminated union
      if (args.type === "merge") {
        // Individual mode - partial values
        console.log("Merge mode - partial update");
        console.log("Values:", args.values); // Partial<MyData>

        // Only some keys may be present
        if (args.values.count !== undefined) {
          console.log("Count changed to:", args.values.count);
        }
        if (args.values.name !== undefined) {
          console.log("Name changed to:", args.values.name);
        }
      } else {
        // args.type === "overwrite"
        // Group mode - full values
        console.log("Overwrite mode - full update");
        console.log("Values:", args.values); // MyData

        // All keys are guaranteed to be present
        console.log("Count:", args.values.count);
        console.log("Name:", args.values.name);
      }
    },
  });

  const count = signal(0, { use: [persist("count")] });
  const name = signal("", { use: [persist("name")] });

  // Individual changes trigger "merge" mode
  count.set(5); // args = { type: "merge", values: { count: 5 } }
  name.set("Alice"); // args = { type: "merge", values: { name: "Alice" } }

  // Group persistence triggers "overwrite" mode
  const cleanup = signal.use({ count, name }, [persist]);
  count.set(10); // args = { type: "overwrite", values: { count: 10, name: "Alice" } }

  return { count, name, cleanup };
}

// =============================================================================
// Export examples for documentation
// =============================================================================

export {
  basicPersistence,
  typeSafePersistence,
  groupPersistence,
  asyncPersistence,
  multiplePersistors,
  saveArgsExample,
};

