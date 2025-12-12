import { rx } from "rextive/react";
import { languageLogic } from "@/logic";
import { useTranslation } from "@/i18n";
import { Icon } from "./Icons";

/**
 * Language switcher component - shows both languages with selected one highlighted
 */
export function LanguageSwitcher() {
  const $lang = languageLogic();
  const { t } = useTranslation();

  return rx(() => {
    const currentLang = $lang.currentLanguage();

    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 shadow-sm">
        <Icon name="globe" size={16} className="text-gray-600" />
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
          <button
            onClick={() => $lang.setLanguage("en")}
            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
              currentLang === "en"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title={t("language.english")}
          >
            <span className="hidden sm:inline">{t("language.english")}</span>
            <span className="sm:hidden">EN</span>
          </button>
          <button
            onClick={() => $lang.setLanguage("vi")}
            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
              currentLang === "vi"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title={t("language.vietnamese")}
          >
            <span className="hidden sm:inline">{t("language.vietnamese")}</span>
            <span className="sm:hidden">VI</span>
          </button>
        </div>
      </div>
    );
  });
}

