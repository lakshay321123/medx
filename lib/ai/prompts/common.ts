export function normalizeLanguageTag(input: unknown, fallback = 'en'): string {
  const raw = String(input ?? '').trim();
  if (!raw) return fallback;
  const safe = raw.replace(/[^A-Za-z0-9-]/g, '');
  if (!safe) return fallback;
  try {
    const [canonical] = Intl.getCanonicalLocales(safe);
    return canonical || fallback;
  } catch {
    return fallback;
  }
}

export function languageInstruction(lang?: string | null): string {
  const normalized = normalizeLanguageTag(lang, 'en');

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
