import type { FormatId } from './types';

function normalize(text?: string | null) {
  return String(text || '').toLowerCase();
}

function negatedTableRequest(text: string) {
  return /\b(no|without|avoid|not)\s+(a\s+)?(table|tabular|tabla|tabella|तालिका)\b/.test(text)
    || /\b(no|without|avoid|not)\s+(comparison|compare|vs|versus)\b/.test(text);
}

function looksLikeTableIntent(text: string) {
  if (!text) return false;
  const q = normalize(text);
  if (negatedTableRequest(q)) return false;

  const direct = [
    /(?:^|[^a-z])(?:table|tabular|tabulate|as a table|in a table)(?:s)?(?:$|[^a-z])/,
    /(?:^|[^a-z])(?:tabla|tabular)(?:$|[^a-z])/,
    /(?:^|[^a-z])(?:tabella|tabellare)(?:$|[^a-z])/,
    /तालिका/,
  ];
  const soft = [/\b(column|row|grid|matrix)\b/];
  return [...direct, ...soft].some(re => re.test(q));
}

function looksLikeComparisonIntent(text: string) {
  if (!text) return false;
  const q = normalize(text);
  if (negatedTableRequest(q)) return false;

  const en = [
    /\bcompare\b/, /\bcomparison\b/, /\bvs\b/, /\bversus\b/,
    /\bdifference\b/, /\bdifferences\b/, /\bpros and cons\b/,
    /\badvantages? and disadvantages?\b/, /\btrade[-\s]?offs?\b/,
    /\bside[-\s]?by[-\s]?side\b/, /\bwhich is (better|best)\b/,
    /\bmatrix\b/, /\bgrid\b/, /\bshortlist\b/,
  ];
  const hi = [/तुलना/, /फायदे\s*नुकसान/, /अंतर/];
  const es = [
    /\bcomparar\b/, /\bcomparación\b/, /\bventajas y desventajas\b/,
    /\bdiferencia(s)?\b/, /\bcuál es (mejor|la mejor)\b/,
  ];
  const it = [
    /\bconfronto\b/, /\bconfrontare\b/, /\bdifferenza(e)?\b/,
    /\bpro e contro\b/, /\bqual[e] è (migliore|il migliore)\b/,
  ];
  return [...en, ...hi, ...es, ...it].some(re => re.test(q));
}

export function needsTableCoercion(formatId?: FormatId, latestUserMessage?: string) {
  if (formatId === 'table_compare') return true;
  if (formatId && formatId !== 'table_compare') return false;
  return looksLikeTableIntent(latestUserMessage) || looksLikeComparisonIntent(latestUserMessage);
}

export function inferTableFormat(formatId: FormatId | undefined, latestUserMessage?: string): FormatId | undefined {
  return needsTableCoercion(formatId, latestUserMessage) ? 'table_compare' : formatId;
}
