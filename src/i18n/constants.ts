export const SUPPORTED_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number] | string;

export const DEFAULT_LOCALE: SupportedLocale = "ko";
