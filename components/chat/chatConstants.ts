import type { FormatId, Mode as FormatMode } from '@/lib/formats/types';

export type HelperLabel = 'study' | 'thinking' | null;
export type FormatMap = Partial<Record<FormatMode, FormatId>>;
export type AdZone = 'chat' | 'reports' | 'aidoc' | 'directory' | 'therapy';

export const AIDOC_UI = process.env.NEXT_PUBLIC_AIDOC_UI === '1';
export const AIDOC_PREFLIGHT = process.env.NEXT_PUBLIC_AIDOC_PREFLIGHT === '1';
export const CHAT_UX_V2_ENABLED = process.env.NEXT_PUBLIC_CHAT_UX_V2 !== '0';
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === '1';

export const FORMAT_STORAGE_KEY = 'medx.format.map.v1';

export const DEFAULT_FORMAT_BY_MODE: Partial<Record<FormatMode, FormatId>> = {
  wellness: 'auto',
  therapy: 'auto',
  research: 'research_brief',
  aidoc: 'json_structured',
};

export const NO_LABS_MESSAGE = "I couldn't find structured lab values yet.";
export const REPORTS_LOCKED_MESSAGE = "Reports are available only in AI Doc mode.";

export const LABS_TREND_INTENT = /\b(pull my reports|show my reports|fetch my reports|what do my reports say|compare my reports|lab history|lab trend|report history|report trend|date\s*wise|datewise)\b/i;
export const RAW_TEXT_INTENT = /(raw text|full text|show .*report text)/i;

export function safeParseFormatMap(str: string | null): FormatMap {
  if (!str) return {};
  try {
    const o = JSON.parse(str);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch { return {}; }
}

export function readFormatMap(): FormatMap {
  if (typeof window === 'undefined') return {};
  return safeParseFormatMap(window.localStorage.getItem(FORMAT_STORAGE_KEY));
}

export function writeFormatMap(map: FormatMap) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FORMAT_STORAGE_KEY, JSON.stringify(map));
}
