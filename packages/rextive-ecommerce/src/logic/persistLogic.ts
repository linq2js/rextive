import { logic } from "rextive";
import { persistor } from "rextive/plugins";

const STORAGE_KEY = "appKey";

export const persistLogic = logic("persistLogic", () => {
  const persist = persistor<Record<"token" | "theme", any>>({
    load: () => {
      try {
        const appState = localStorage.getItem(STORAGE_KEY);
        return JSON.parse(appState || "{}");
      } catch {
        return {};
      }
    },
    save: ({ values }) => {
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...existing, ...values })
        );
      } catch {
        // Ignore storage errors
      }
    },
  });

  return {
    persist,
  };
});
