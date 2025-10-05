import { HEADING_MAP } from '@/lib/i18n/headingMap';
import { localizeDigits } from '@/lib/i18n/numeral';

// Prefer ASCII-only, digit-free sentinel so numeral localization never mutates it.
const SAFE_SENTINEL = '__SAFESEG__';
const MEDX_PLACEHOLDER_RE = /MEDX_MASK_(\d+)/g;

export function protectSafeSegments(input: string): { out: string; slots: string[] } {
  const safeRe = /(`[^`]+`|\[[^\]]+\]\([^\)]+\))/g;
  const slots: string[] = [];
  const out = input.replace(safeRe, (segment) => {
    const token = `${SAFE_SENTINEL}${numberToAlpha(slots.length)}__`;
    slots.push(segment);
    return token;
  });
  return { out, slots };
}

export function restoreSafeSegments(input: string, slots: string[]): string {
  const pattern = new RegExp(`${SAFE_SENTINEL}([A-Z]+)__`, 'g');
  return input.replace(pattern, (_, alpha: string) => {
    const index = alphaToNumber(alpha);
    return slots[index] ?? '';
  });
}

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

export function unmaskMedxTokens(text: string, lookup?: Record<string, string>): string {
  if (!text) return text;
  if (!lookup) return text.replace(MEDX_PLACEHOLDER_RE, '');
  return text.replace(MEDX_PLACEHOLDER_RE, (_, id) => lookup[`MEDX_MASK_${id}`] ?? '');
}

function normalizeHeadings(text: string, lang: string) {
  let out = text;

  const markdownHeadingWithParen = /^(#{1,4}\s*.+?)\s*\(([^)]+)\)\s*$/gm;
  out = out.replace(markdownHeadingWithParen, (_: string, head: string) => head.trim());

  const boldHeadingWithParen = /^(\*\*.+?\*\*)\s*\(([^)]+)\)\s*$/gm;
  out = out.replace(boldHeadingWithParen, (_: string, head: string) => head.trim());

  const hmap = HEADING_MAP[lang];
  if (hmap) {
    out = out.replace(
      /^(#{1,4}\s*)([^\n]+)$/gm,
      (_: string, hashes: string, title: string) => {
        const normalized = title.trim().toLowerCase();
        const replacement = hmap[normalized];
        return replacement ? `${hashes}${replacement}` : `${hashes}${title.trim()}`;
      }
    );

    out = out.replace(
      /^(\*\*)([^*]+)(\*\*)\s*$/gm,
      (_: string, open: string, title: string, close: string) => {
        const normalized = title.trim().toLowerCase();
        const replacement = hmap[normalized];
        const finalTitle = replacement ?? title.trim();
        return `${open}${finalTitle}${close}`;
      }
    );
  }

  return out;
}

export function applyLocalePostprocessing(raw: string, lang: string, maskLookup?: Record<string, string>) {
  const { out: protectedIn, slots } = protectSafeSegments(raw);

  let out = unmaskMedxTokens(protectedIn, maskLookup);
  out = localizeDigits(out, lang);
  out = restoreSafeSegments(out, slots);
  out = normalizeHeadings(out, lang);

  return out;
}
