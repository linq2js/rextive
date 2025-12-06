import { signal, logic } from "rextive";
import { persistLogic } from "./persistLogic";

export type Theme = "light" | "dark" | "system";

/**
 * Theme logic - manages light/dark theme with system preference support.
 */
export const themeLogic = logic("themeLogic", () => {
  const { persist } = persistLogic();

  // Check if system prefers dark mode
  const getSystemPrefersDark = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const theme = signal<Theme>("dark", {
    name: "theme.mode",
    use: [persist("theme")],
  });

  // Computed: actual resolved theme (light or dark)
  const resolvedTheme = theme.to(
    (t) => {
      if (t === "system") {
        return getSystemPrefersDark() ? "dark" : "light";
      }
      return t;
    },
    { name: "theme.resolved" }
  );

  // Apply theme to document
  const applyTheme = () => {
    const resolved = resolvedTheme();
    const root = document.documentElement;

    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Set theme and persist
  const setTheme = (newTheme: Theme) => {
    theme.set(newTheme);
    applyTheme();
  };

  // Toggle between light and dark
  const toggle = () => {
    const current = resolvedTheme();
    setTheme(current === "dark" ? "light" : "dark");
  };

  // Listen to system theme changes
  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (theme() === "system") {
        applyTheme();
      }
    });

    // Apply initial theme
    applyTheme();
  }

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggle,
  };
});
