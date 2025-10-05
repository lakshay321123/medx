import { localizeDigits } from '@/lib/i18n/numeral';
import { HEADING_MAP } from '@/lib/i18n/headingMap';

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
