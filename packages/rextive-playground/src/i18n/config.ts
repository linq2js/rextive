import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./locales/en.json";
import viTranslations from "./locales/vi.json";

// Language detection - check localStorage first, then browser, default to 'en'
const getInitialLanguage = (): string => {
  const saved = localStorage.getItem("rextive-playground-language");
  if (saved === "en" || saved === "vi") return saved;

  const browserLang = navigator.language.split("-")[0];
  return browserLang === "vi" ? "vi" : "en";
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      vi: {
        translation: viTranslations,
      },
    },
    lng: getInitialLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Don't use Suspense for i18n
    },
  });

export default i18n;

