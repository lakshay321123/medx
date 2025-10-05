import { HEADING_MAP } from '@/lib/i18n/headingMap';
import { localizeDigits } from '@/lib/i18n/numeral';

// ASCII-only sentinel without digits so numeral localization never mutates it.
const SAFE_SENTINEL = '__SAFESEG__';
const SAFE_TOKEN_RE = new RegExp(`${SAFE_SENTINEL}([A-Z]+)__`, 'g');
const MEDX_PLACEHOLDER_RE = /MEDX_MASK_(\d+)/g;

function numberToAlpha(n: number): string {
  let value = n + 1;
  let out = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    out = String.fromCharCode(65 + remainder) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
}

function alphaToNumber(alpha: string): number {
  let result = 0;
  for (let i = 0; i < alpha.length; i += 1) {
    result = result * 26 + (alpha.charCodeAt(i) - 64);
  }
  return result - 1;
}

// Protect inline code and markdown links; conservative to avoid heavy parsing.
function protectSafeSegments(input: string): { out: string; slots: string[] } {
  const safeRe = /(`[^`]+`|\[[^\]]+\]\([^\)]+\))/g;
  const slots: string[] = [];
  const out = input.replace(safeRe, (segment) => {
    const token = `${SAFE_SENTINEL}${numberToAlpha(slots.length)}__`;
    slots.push(segment);
    return token;
  });
  return { out, slots };
}

function restoreSafeSegments(input: string, slots: string[]): string {
  return input.replace(SAFE_TOKEN_RE, (_: string, alpha: string) => {
    const index = alphaToNumber(alpha);
    return slots[index] ?? '';
  });
}

// Data-driven unmask — restore from lookup if provided, otherwise strip.
function unmaskMedxTokens(text: string, lookup?: Record<string, string>) {
  if (!text) return text;
  if (!lookup) return text.replace(MEDX_PLACEHOLDER_RE, '');
  return text.replace(MEDX_PLACEHOLDER_RE, (_, id) => lookup[`MEDX_MASK_${id}`] ?? '');
}

// Remove trailing parentheticals like "(Types)" from headings.
function stripHeadingParens(text: string) {
  const markdownHeadingWithParen = /^(#{1,4}\s*.+?)\s*\(([^)]+)\)\s*$/gm;
  let out = text.replace(markdownHeadingWithParen, (_: string, heading: string) => heading.trim());

  const boldHeadingWithParen = /^(\*\*.+?\*\*)\s*\(([^)]+)\)\s*$/gm;
  out = out.replace(boldHeadingWithParen, (_: string, heading: string) => heading.trim());

  return out;
}

// Rewrite canonical headings into their localized equivalents when available.
function rewriteMappedHeadings(text: string, lang: string) {
  const map = HEADING_MAP[lang];
  if (!map) return text;

  let out = text.replace(/^(#{1,4}\s*)([^\n]+)$/gm, (_: string, hashes: string, title: string) => {
    const key = title.trim().toLowerCase();
    const translated = map[key];
    return translated ? `${hashes}${translated}` : `${hashes}${title}`;
  });

  out = out.replace(/^(\*\*)([^*]+)(\*\*)\s*$/gm, (_: string, open: string, title: string, close: string) => {
    const key = title.trim().toLowerCase();
    const translated = map[key];
    return translated ? `${open}${translated}${close}` : `${open}${title}${close}`;
  });

  return out;
}

/**
 * Enforce locale requirements on model output in a single deterministic pass.
 */
export function applyLanguageEnforcement(
  raw: string,
  lang: string,
  opts?: { maskLookup?: Record<string, string> },
) {
  const { out: protectedIn, slots } = protectSafeSegments(raw);

  let out = unmaskMedxTokens(protectedIn, opts?.maskLookup);
  out = localizeDigits(out, lang);
  out = restoreSafeSegments(out, slots);
  out = stripHeadingParens(out);
  out = rewriteMappedHeadings(out, lang);

  return out;
}

export type ApplyLanguageEnforcementOptions = Parameters<typeof applyLanguageEnforcement>[2];
