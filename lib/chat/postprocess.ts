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

  const maskPattern = /```[\s\S]*?```|`[^`]*`|\[[^\]]*\]\([^\)]+\)|https?:\/\/\S+|(?=\S*[A-Za-z])\S*[\\\/]\S*/g;
  const placeholders: string[] = [];
  const masked = text.replace(maskPattern, match => {
    const token = `__MEDX_MASK_${placeholders.length}__`;
    placeholders.push(match);
    return token;
  });

  const converted = masked.replace(/\d/g, d => convertDigit(lang, d));

  return converted.replace(/__MEDX_MASK_(\d+)__/g, (_, index) => {
    const idx = Number(index);
    return Number.isFinite(idx) && placeholders[idx] !== undefined
      ? placeholders[idx]
      : `__MEDX_MASK_${index}__`;
  });
}

export function applyLocalePostprocessing(raw: string, lang: string): string {
  let out = raw;

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

  out = localizeDigits(out, lang);

  return out;
}
