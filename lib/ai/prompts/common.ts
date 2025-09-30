export function languageInstruction(lang: string | null | undefined): string {
  const raw = typeof lang === 'string' ? lang : '';
  const normalized = raw.trim();
  if (!normalized) return '';
  if (normalized.toLowerCase().startsWith('en')) return '';

  let humanReadable = normalized;
  try {
    const display = new Intl.DisplayNames([normalized], { type: 'language' });
    const parts = normalized.split('-');
    const base = parts[0];
    const human = display.of(base || normalized);
    if (human) humanReadable = human;
  } catch {
    // no-op: fallback to raw tag
  }

  return `IMPORTANT: Answer in ${humanReadable} (${normalized}). Do not switch languages unless explicitly asked.`;
}
