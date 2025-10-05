const maps: Record<string, Record<string, string>> = {
  hi: { '0':'०','1':'१','2':'२','3':'३','4':'४','5':'५','6':'६','7':'७','8':'८','9':'९' },
};

export function localizeDigits(text: string, lang: string): string {
  const map = maps[lang];
  if (!map) return text;
  return text.replace(/[0-9]/g, digit => map[digit] ?? digit);
}
