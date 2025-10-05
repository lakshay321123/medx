import { HEADING_MAP } from '@/lib/i18n/headingMap';
import { localizeDigits } from '@/lib/i18n/numeral';

const SAFE_SENTINEL = '__SAFESEG__';
const MEDX_PLACEHOLDER_RE = /MEDX_MASK_(\d+)/g;

function numberToAlpha(n: number): string {
  let index = n + 1;
  let out = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    out = String.fromCharCode(65 + remainder) + out;
    index = Math.floor((index - 1) / 26);
  }
  return out;
}

export function protectSafeSegments(input: string): { out: string; slots: string[] } {
  const safeRe = /(`[^`]*`|\[[^\]]*\]\([^\)]+\))/g;
  const slots: string[] = [];
  const out = input.replace(safeRe, (segment) => {
    const token = `${SAFE_SENTINEL}${numberToAlpha(slots.length)}__`;
    slots.push(segment);
    return token;
  });
  return { out, slots };
}

export function restoreSafeSegments(input: string, slots: string[]): string {
  let out = input;
  slots.forEach((segment, index) => {
    const token = `${SAFE_SENTINEL}${numberToAlpha(index)}__`;
    out = out.split(token).join(segment);
  });
  return out;
}

export function unmaskMedxTokens(text: string, lookup?: Record<string, string>): string {
  if (!text) return text;
  if (!lookup) return text.replace(MEDX_PLACEHOLDER_RE, '');
  return text.replace(MEDX_PLACEHOLDER_RE, (_, id) => lookup[`MEDX_MASK_${id}`] ?? '');
}

function normalizeHeadings(text: string, lang: string) {
  let out = text;
  const hmap = HEADING_MAP[lang];

  if (hmap) {
    out = out.replace(
      /^(#{1,4}\s*)([^\n]+)$/gm,
      (_, hashes: string, title: string) => {
        const normalized = title.trim().toLowerCase();
        const replacement = hmap[normalized];
        return `${hashes}${replacement ?? title.trim()}`;
      }
    );

    out = out.replace(
      /^(\*\*)([^*]+)(\*\*)\s*$/gm,
      (_, open: string, title: string, close: string) => {
        const normalized = title.trim().toLowerCase();
        const replacement = hmap[normalized];
        const finalTitle = replacement ?? title.trim();
        return `${open}${finalTitle}${close}`;
      }
    );
  }

  const markdownHeadingWithParen = /^(#{1,4}\s*[^\n(]+)\s*\(([A-Za-z ]{3,30})\)\s*$/gm;
  out = out.replace(markdownHeadingWithParen, (_, head: string) => head.trim());

  const boldHeadingWithParen = /^(\*\*[^\n*(]+\*\*)\s*\(([A-Za-z ]{3,30})\)\s*$/gm;
  out = out.replace(boldHeadingWithParen, (_, head: string) => head.trim());

  if (lang === 'hi') {
    out = out.replace(/^(#{1,4}\s*)Types\s*$/gim, (_, hashes: string) => `${hashes}प्रकार`);
    out = out.replace(/^(#{1,4}\s*)Overview\s*$/gim, (_, hashes: string) => `${hashes}सार`);
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
