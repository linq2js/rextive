import i18n from "./config";

export { default as i18n } from "./config";
export { useTranslation } from "react-i18next";
export type { TFunction } from "i18next";

/**
 * Translate a key outside of React components.
 * Use this in logic functions, utilities, or any non-component code.
 *
 * @param key - Translation key (e.g., "parent.title")
 * @param options - Optional interpolation options
 * @returns Translated string
 *
 * @example
 * ```ts
 * import { t } from "@/i18n";
 *
 * function myLogic() {
 *   const title = t("parent.title");
 *   const message = t("parent.welcome", { name: "John" });
 *   return { title, message };
 * }
 * ```
 */
export const t = (key: string, options?: Record<string, unknown>): string => {
  return i18n.t(key, options);
};

