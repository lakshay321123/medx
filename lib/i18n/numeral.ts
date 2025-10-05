const DIGIT_MAPS: Record<string, Record<string, string>> = {
  hi: { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' },
  ar: { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' },
  zh: { '0': '零', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九' },
};

export function localizeDigits(text: string, lang: string): string {
  const map = DIGIT_MAPS[lang];
  if (!map) return text;
  return text.replace(/\d/g, digit => map[digit] ?? digit);
}
