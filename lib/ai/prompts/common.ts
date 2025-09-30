export function languageInstruction(lang?: string | null): string {
  const normalized = (typeof lang === 'string' ? lang : 'en').trim() || 'en';

  let human = normalized;
  try {
    const display = new Intl.DisplayNames([normalized], { type: 'language' });
    const base = normalized.split('-')[0];
    const label = display.of(base || normalized);
    if (label) human = label;
  } catch {
    // fall back to the normalized tag if Intl.DisplayNames is unavailable
  }

  return [
    `IMPORTANT: Answer ONLY in ${human} (${normalized}).`,
    'Do not switch languages even if the user writes in another language.',
    'Do not translate user quotes or code; keep quoted/code content verbatim.',
  ].join(' ');
}
