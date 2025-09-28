import type { ReactNode } from "react";
import dntList from "./dnt.json";

export type SupportedLocale = "en" | "hi" | "es" | "fr" | "ar" | "it";

type LocaleMeta = {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
};

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", dir: "ltr" },
  { code: "es", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", dir: "ltr" },
];

export const DEFAULT_LOCALE: SupportedLocale = "en";

const LOCALE_SET = new Set(SUPPORTED_LOCALES.map(locale => locale.code));

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return value != null && LOCALE_SET.has(value as SupportedLocale);
}

export function getLocaleMeta(code: SupportedLocale): LocaleMeta {
  const found = SUPPORTED_LOCALES.find(locale => locale.code === code);
  if (!found) {
    return SUPPORTED_LOCALES[0];
  }
  return found;
}

export function isRTL(code: SupportedLocale): boolean {
  return getLocaleMeta(code).dir === "rtl";
}

export async function loadMessages(locale: SupportedLocale): Promise<Record<string, string>> {
  switch (locale) {
    case "hi":
      return (await import("./messages/hi.json")).default;
    case "es":
      return (await import("./messages/es.json")).default;
    case "fr":
      return (await import("./messages/fr.json")).default;
    case "ar":
      return (await import("./messages/ar.json")).default;
    case "it":
      return (await import("./messages/it.json")).default;
    case "en":
    default:
      return (await import("./messages/en.json")).default;
  }
}

export const DNT_TOKENS: string[] = dntList;

export const LANGUAGE_STORAGE_KEY = "medx.app.language";

export type LocalizedString = ReactNode;

export function matchSupportedLocale(input: string | null | undefined): SupportedLocale | null {
  if (!input) return null;
  const normalized = input.toLowerCase().split("-")[0];
  if (isSupportedLocale(normalized)) return normalized;
  return null;
}

export function containsDntToken(text: string): string[] {
  const matches: string[] = [];
  for (const token of DNT_TOKENS) {
    if (!token) continue;
    if (text.includes(token)) {
      matches.push(token);
    }
  }
  return matches;
}
