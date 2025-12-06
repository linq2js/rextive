import { logic } from "rextive";
import { persistor } from "rextive/plugins";

export const persistLogic = logic("persistLogic", () => {
  const persist = persistor<Record<"token" | "theme", any>>({
    load: () => {
      try {
        const appState = localStorage.getItem("appState");
        return JSON.parse(appState || "{}");
      } catch {
        return {};
      }
    },
    save: ({ values }) => {
      try {
        localStorage.setItem("appState", JSON.stringify(values));
      } catch {
        // Ignore storage errors
      }
    },
  });

  return {
    persist,
  };
});
