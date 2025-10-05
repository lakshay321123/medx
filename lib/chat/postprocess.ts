import { HEADING_MAP } from '@/lib/i18n/headingMap';

function hasIdentifierNeighbor(original: string, start: number, direction: -1 | 1, asciiTest: RegExp) {
  let index = start + direction;
  while (index >= 0 && index < original.length) {
    const char = original[index];
    if (char === '-' || char === '_' || char === ':') {
      index += direction;
      continue;
    }
    return asciiTest.test(char);
  }
  return false;
}

function convertDigitsSegment(segment: string, lang: string): string {
  const asciiAdjacent = /[A-Za-z]/;
  if (lang === 'zh') {
    const zhDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return segment.replace(/\d/g, (digit, offset, original) => {
      const prev = original[offset - 1];
      const next = original[offset + 1];
      if (
        (prev && asciiAdjacent.test(prev)) ||
        (next && asciiAdjacent.test(next)) ||
        hasIdentifierNeighbor(original, offset, -1, asciiAdjacent) ||
        hasIdentifierNeighbor(original, offset, 1, asciiAdjacent)
      ) {
        return digit;
      }
      return zhDigits[Number(digit)] ?? digit;
    });
  }

  const ranges: Record<string, number> = { hi: 0x0966, ar: 0x0660 };
  const base = ranges[lang];
  if (!base) return segment;

  return segment.replace(/\d/g, (digit, offset, original) => {
    const prev = original[offset - 1];
    const next = original[offset + 1];
    if (
      (prev && asciiAdjacent.test(prev)) ||
      (next && asciiAdjacent.test(next)) ||
      hasIdentifierNeighbor(original, offset, -1, asciiAdjacent) ||
      hasIdentifierNeighbor(original, offset, 1, asciiAdjacent)
    ) {
      return digit;
    }
    return String.fromCharCode(base + Number(digit));
  });
}

export function localizeDigits(text: string, lang: string) {
  if (lang !== 'hi' && lang !== 'ar' && lang !== 'zh') return text;

  const maskPattern = /```[\s\S]*?```|`[^`]*`|\[[^\]]*\]\([^\)]+\)|https?:\/\/\S+|(?=\S*[A-Za-z])\S*[\\\/]\S*/g;
  let result = '';
  let lastIndex = 0;
  const matches = text.matchAll(maskPattern);

  for (const match of matches) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      const segment = text.slice(lastIndex, index);
      result += convertDigitsSegment(segment, lang);
    }
    result += match[0];
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    result += convertDigitsSegment(text.slice(lastIndex), lang);
  }

  return result;
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
