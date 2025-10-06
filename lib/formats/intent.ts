const CONTRAST_LEXICON = [
  // English
  'compare', 'versus', 'vs', 'difference', 'pros', 'cons', 'advantages', 'disadvantages',
  'features', 'parameters', 'metrics', 'trade-offs', 'side-by-side', 'matrix', 'benchmark',
  'rank', 'ranking', 'better than', 'worse than', 'against',
  // Hindi
  'तुलना', 'अंतर', 'बेहतर', 'खराब', 'फायदे', 'नुकसान', 'बनाम', 'तरफ-दर-तरफ', 'तुलनात्मक',
  // Spanish
  'compar', 'diferencia', 'ventajas', 'desventajas', 'frente a', 'contra', 'pros', 'contras',
  // Italian
  'confronto', 'differenza', 'vantaggi', 'svantaggi', 'contro', 'migliore', 'peggiore',
];

const PREFERENCE_PATTERNS = [
  /\bwhich\b[^?\n]*\bbetter\b/i,
  /\bकौन सा\b[^?\n]*\bबेहतर\b/i,
  /\bcu[aá]l\b[^?\n]*\bmejor\b/i,
  /\bquale\b[^?\n]*\bmigliore\b/i,
];

const ENTITY_CONNECTORS = /(?:,|;|\/|\bor\b|\band\b|\by\b|\bo\b|\be\b|\bu\b|\bऔर\b|\bया\b|\bबनाम\b|\bcontra\b|\bfrente a\b|\boppure\b|\bversus\b|\bvs\.?)/gi;

const STOPWORDS = new Set(
  [
    'compare', 'comparison', 'versus', 'vs', 'difference', 'differences', 'option', 'options',
    'pros', 'cons', 'advantages', 'disadvantages', 'features', 'metrics', 'parameters',
    'mejor', 'peor', 'ventajas', 'desventajas', 'contra', 'comparar',
    'migliore', 'peggiore', 'vantaggi', 'svantaggi', 'contro',
    'तुलना', 'अंतर', 'फायदे', 'नुकसान', 'बनाम', 'बेहतर',
  ].map(term => term.toLowerCase()),
);

function normalizeEntity(value: string): string | null {
  const cleaned = value
    .replace(/["'“”‘’\[\]\(\){}<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  if (cleaned.length < 2) return null;
  if (!/[\p{L}\d]/u.test(cleaned)) return null;

  const snippet = cleaned.split(/\s+/).slice(0, 6).join(' ').trim();
  if (!snippet) return null;

  const lower = snippet.toLowerCase();
  if (STOPWORDS.has(lower)) return null;
  if (/^\d+(?:\.\d+)?$/.test(lower)) return null;
  if (lower.length <= 2) return null;

  return snippet;
}

function extractBulletEntities(prompt: string): string[] {
  return Array.from(prompt.matchAll(/(^|\n)\s*[-*•]\s+(.+)/g))
    .map(match => normalizeEntity(match[2] || ''))
    .filter((entry): entry is string => Boolean(entry));
}

function extractDelimitedEntities(prompt: string): string[] {
  const segments = prompt.split(ENTITY_CONNECTORS)
    .map(part => normalizeEntity(part || ''))
    .filter((entry): entry is string => Boolean(entry));
  return segments;
}

function countEntities(prompt: string): number {
  const seen = new Set<string>();
  for (const entry of [...extractBulletEntities(prompt), ...extractDelimitedEntities(prompt)]) {
    if (!entry) continue;
    const key = entry.toLowerCase();
    if (!seen.has(key)) seen.add(key);
  }
  return seen.size;
}

export function wantsTable(prompt: string): boolean {
  const raw = String(prompt || '').trim();
  if (!raw) return false;

  const lc = raw.toLowerCase();
  const lexTriggered = CONTRAST_LEXICON.some(term => lc.includes(term));
  const patternTriggered = /\b([\p{L}\d][\p{L}\d\-\s]{2,})\s+v(?:s|\.?)\s+[\p{L}\d][\p{L}\d\-\s]{2,}\b/iu.test(raw);
  const bulletCount = (raw.match(/(^|\n)\s*[-*•]\s+/g) || []).length;
  const preferenceTriggered = PREFERENCE_PATTERNS.some(regex => regex.test(raw));
  const rankingCue = lexTriggered || patternTriggered || bulletCount >= 2 || preferenceTriggered;
  if (!rankingCue) return false;

  const entityCount = countEntities(raw);
  return entityCount >= 2;
}

export default wantsTable;
