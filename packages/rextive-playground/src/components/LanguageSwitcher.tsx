import { rx } from "rextive/react";
import { languageLogic } from "@/logic";
import { useTranslation } from "@/i18n";
import { Icon } from "./Icons";

/**
 * Language switcher component - allows users to toggle between English and Vietnamese
 */
export function LanguageSwitcher() {
  const $lang = languageLogic();
  const { t } = useTranslation();

  return rx(() => {
    const currentLang = $lang.currentLanguage();

    return (
      <button
        onClick={() => $lang.toggleLanguage()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 hover:bg-white transition-colors text-sm font-medium text-gray-700 shadow-sm"
        title={t("language.switchLanguage")}
      >
        <Icon name="globe" size={16} />
        <span className="hidden sm:inline">
          {currentLang === "en" ? "EN" : "VI"}
        </span>
        <span className="sm:hidden">
          {currentLang === "en" ? "🇺🇸" : "🇻🇳"}
        </span>
      </button>
    );
  });
}

