import { logic } from "rextive";
import { signal } from "rextive";
import { i18n } from "@/i18n";

export type Language = "en" | "vi";

export const languageLogic = logic("languageLogic", () => {
  // Current language signal - syncs with i18n
  const currentLanguage = signal<Language>(
    (i18n.language || "en") as Language,
    { name: "language.current" }
  );

  // Update i18n when language changes
  currentLanguage.on(() => {
    const lang = currentLanguage();
    i18n.changeLanguage(lang);
    localStorage.setItem("rextive-playground-language", lang);
  });

  // Initialize from localStorage or browser
  const savedLang = localStorage.getItem("rextive-playground-language");
  if (savedLang === "en" || savedLang === "vi") {
    currentLanguage.set(savedLang as Language);
  }

  function setLanguage(lang: Language) {
    currentLanguage.set(lang);
  }

  function toggleLanguage() {
    const nextLang = currentLanguage() === "en" ? "vi" : "en";
    setLanguage(nextLang);
  }

  return {
    currentLanguage,
    setLanguage,
    toggleLanguage,
  };
});

