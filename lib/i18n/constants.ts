export const SUPPORTED_LANGS = ['en', 'hi', 'es', 'fr', 'it', 'ar', 'de', 'zh'] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];
