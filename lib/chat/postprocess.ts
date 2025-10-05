import { HEADING_MAP } from '@/lib/i18n/headingMap';

function convertDigit(lang: string, digit: string): string {
  if (lang === 'zh') {
    const zhDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return zhDigits[Number(digit)] ?? digit;
  }

  const ranges: Record<string, number> = { hi: 0x0966, ar: 0x0660 };
  const base = ranges[lang];
  if (!base) return digit;
  return String.fromCharCode(base + Number(digit));
}

export function localizeDigits(text: string, lang: string) {
  if (lang !== 'hi' && lang !== 'ar' && lang !== 'zh') return text;
  return text.replace(/\d/g, d => convertDigit(lang, d));
}

// Match MEDX placeholders that were injected upstream (Western digits only)
const MEDX_PLACEHOLDER_RE = /MEDX_MASK_(\d+)/g;

/**
 * Data-driven unmask:
 * - If a lookup map is provided (e.g., from server annotations), restore the original fragment.
 * - If not, remove the placeholder (never substitute a default string).
 */
export function unmaskMedxTokens(text: string, lookup?: Record<string, string>): string {
  if (!text) return text;
  if (!lookup) {
    // No map available → strip placeholders
    return text.replace(MEDX_PLACEHOLDER_RE, '');
  }
  return text.replace(MEDX_PLACEHOLDER_RE, (_, id) => lookup[`MEDX_MASK_${id}`] ?? '');
}

// Protect markdown links and inline code so we don't localize digits inside them
function protectSafeSegments(input: string) {
  const safeRe = /(`[^`]*`|\[[^\]]*\]\([^\)]+\))/g;
  const slots: string[] = [];
  const out = input.replace(safeRe, (m) => {
    const token = `__SAFE_SLOT_${slots.length}__`;
    slots.push(m);
    return token;
  });
  return { out, slots };
}

function restoreSafeSegments(input: string, slots: string[]) {
  let out = input;
  slots.forEach((m, i) => {
    out = out.replace(new RegExp(`__SAFE_SLOT_${i}__`, 'g'), m);
  });
  return out;
}

export function applyLocalePostprocessing(raw: string, lang: string, maskLookup?: Record<string, string>): string {
  const { out: protectedIn, slots } = protectSafeSegments(raw);

  // Translate known headings before other replacements
  let out = protectedIn;

  const hmap = HEADING_MAP[lang];
  if (hmap) {
    out = out.replace(
      /^(#{1,4}\s*)([^\n]+)$/gm,
      (_, hashes: string, title: string) => {
        const normalized = title.trim().toLowerCase();
        const replacement = hmap[normalized];
        return `${hashes}${replacement ?? title}`;
      }
    );

    out = out.replace(
      /^(\*\*)([^*]+)(\*\*)\s*$/gm,
      (_, open: string, title: string, close: string) => {
        const normalized = title.trim().toLowerCase();
        const replacement = hmap[normalized];
        const finalTitle = replacement ?? title;
        return `${open}${finalTitle}${close}`;
      }
    );
  }

  // Unmask placeholders (Western-digit tokens)
  out = unmaskMedxTokens(out, maskLookup);

  // Localize digits in the remaining plain text
  out = localizeDigits(out, lang);

  // Restore protected segments
  out = restoreSafeSegments(out, slots);

  return out;
}
