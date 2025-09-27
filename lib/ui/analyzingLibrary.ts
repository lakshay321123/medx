/**
 * analyzingLibrary.ts
 *
 * Phrase generator for “analyzing…” banners/tooltips across modes.
 * - Single source of truth (no hardcoded 3k lists elsewhere).
 * - Combinatorial builder w/ quality filter + sanitization.
 * - Seedable randomness + uniform sampling.
 * - Weights per mode for smarter mixes.
 * - Memoized libraries w/ size caps.
 * - “full” (sentence) and “short” (2–3 words) variants.
 * - Locale hook placeholder (future i18n).
 */

///////////////////////////
// Base building blocks  //
///////////////////////////

const BASE_LEADS = [
  'Mapping',
  'Reviewing',
  'Organizing',
  'Examining',
  'Synthesizing',
  'Tracing',
  'Balancing',
  'Projecting',
  'Layering',
  'Sequencing',
  'Modeling',
  'Scanning',
  'Surveying',
  'Highlighting',
  'Aligning',
] as const;

const BASE_ACTIONS = [
  'key factors for',
  'clinical signals around',
  'core insights on',
  'priority follow-ups for',
  'risk clusters within',
  'progress markers for',
  'timeline cues in', // normalize “time-line” → “timeline”
  'underlying themes for',
  'edge conditions in',
  'urgent watch-points for',
] as const;

const BASE_CLOSERS = [
  'before drafting guidance.',
  'to ground the response.',
  'to keep the answer precise.',
  'for a confident summary.',
  'prior to generating takeaways.',
  'to surface next questions.',
  'to focus recommendations.',
  'before shaping final notes.',
  'to confirm context.',
  'before sharing actions.',
] as const;

const CLINICAL_FOCUS = [
  'differential patterns',
  'vital sign trends',
  'laboratory markers',
  'medication interactions',
  'comorbidity overlaps',
  'red-flag symptoms',
  'staging criteria',
  'escalation thresholds',
  'care pathways',
  'triage indicators',
  'follow-up gaps',
  'documentation cues',
] as const;

const WELLNESS_FOCUS = [
  'habit loops',
  'lifestyle anchors',
  'motivation hurdles',
  'self-care signals',
  'sleep and energy notes',
  'nutrition pivots',
  'movement cues',
  'stress patterns',
  'daily routines',
  'support resources',
  'mindset shifts',
  'coaching angles',
] as const;

const RESEARCH_FOCUS = [
  'recent evidence summaries',
  'data-backed interventions',
  'regulatory updates',
  'evolving guidelines',
  'trial endpoints',
  'systematic review calls',
  'meta-analysis signals',
  'population outcomes',
  'quality-of-evidence notes',
  'literature gaps',
  'comparative effectiveness data',
  'emerging biomarkers',
] as const;

const AIDOC_FOCUS = [
  'structured history timeline',
  'symptom clusters',
  'objective findings',
  'differential checkpoints',
  'clinical course pivots',
  'red flag escalation points',
  'lab-to-symptom bridges',
  'workup priorities',
  'safety guardrails',
  'documentation shortcuts',
  'hand-off essentials',
  'next visit prep',
] as const;

const GENERIC_FOCUS = [
  'context clues',
  'keyphrases',
  'supporting details',
  'clarifying points',
  'edge cases',
  'recurring questions',
  'important qualifiers',
  'likely follow-ups',
  'reference points',
  'factual anchors',
  'tone and intent',
  'summary themes',
] as const;

/////////////////////////////
// Types & mode registry   //
/////////////////////////////

export type AnalyzingLibraryKey =
  | 'aidoc'
  | 'clinical'
  | 'wellness'
  | 'clinicalResearch'
  | 'wellnessResearch'
  | 'generic';

type BuildOptions = {
  leads: readonly string[];
  focus: readonly string[];
  actions?: readonly string[];
  closers?: readonly string[];
  limit?: number;
  locale?: string; // placeholder for future i18n
  weights?: Partial<Record<string, number>>; // focus-term weights
};

type Variant = 'full' | 'short';

/////////////////////////////
// Utilities               //
/////////////////////////////

// Seeded RNG (mulberry32)
function seededRng(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple hash for seedable strings
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Normalize hyphens, spacing; sentence case; single period ending.
function sentenceCase(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  const cased = t.charAt(0).toUpperCase() + t.slice(1);
  const ended = cased.replace(/[.?!]*\s*$/, '.');
  return ended;
}

function normalizeHyphens(s: string): string {
  return s
    .replace(/\btime-?line\b/gi, 'timeline')
    .replace(/\bfollow ?- ?up(s)?\b/gi, 'follow-up$1')
    .replace(/\bred ?- ?flag(s)?\b/gi, 'red-flag$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}

// Ban awkward combos (quick heuristics; add as needed)
function shouldBanCombo(lead: string, action: string, focus: string, closer: string): boolean {
  const joined = `${lead} ${action} ${focus} ${closer}`.toLowerCase();

  // Duplicate prepositions like “around on”, “within in”
  if (/(around on|around in|within in|for for)/.test(joined)) return true;

  // Repeated words back-to-back
  if (/\b(\w+)\s+\1\b/.test(joined)) return true;

  // Too similar lead+focus (“Surveying survey …”)
  const leadRoot = lead.split(' ')[0].toLowerCase().replace(/ing$/, '');
  if (focus.includes(leadRoot)) return true;

  return false;
}

function sanitizePhrase(s: string): string {
  let out = normalizeHyphens(s);
  out = out.replace(/\s+/g, ' ').trim();
  out = sentenceCase(out);
  // force single trailing period
  out = out.replace(/[.?!]+$/, '.') as string;
  return out;
}

// Weighted item picker
function weightedPick<T extends string>(items: readonly T[], weights?: Partial<Record<string, number>>, rand = Math.random): T {
  if (!weights) return items[Math.floor(rand() * items.length)];
  let total = 0;
  const acc: Array<{ item: T; w: number }> = [];
  for (const it of items) {
    const w = Math.max(0, weights[it] ?? 1);
    if (w > 0) {
      total += w;
      acc.push({ item: it, w });
    }
  }
  if (!acc.length) return items[Math.floor(rand() * items.length)];
  let r = rand() * total;
  for (const { item, w } of acc) {
    if ((r -= w) <= 0) return item;
  }
  return acc[acc.length - 1].item;
}

// Fisher–Yates shuffle (seedable)
function shuffleInPlace<T>(arr: T[], rand = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/////////////////////////////
// Weights per mode        //
/////////////////////////////

const CLINICAL_WEIGHTS: Partial<Record<string, number>> = {
  'red-flag symptoms': 2.3,
  'medication interactions': 2.0,
  'laboratory markers': 1.8,
  'triage indicators': 1.6,
  'escalation thresholds': 1.6,
};

const WELLNESS_WEIGHTS: Partial<Record<string, number>> = {
  'habit loops': 2.0,
  'sleep and energy notes': 1.7,
  'nutrition pivots': 1.6,
  'stress patterns': 1.6,
  'daily routines': 1.5,
};

const RESEARCH_WEIGHTS: Partial<Record<string, number>> = {
  'recent evidence summaries': 2.0,
  'evolving guidelines': 1.8,
  'meta-analysis signals': 1.6,
  'comparative effectiveness data': 1.6,
};

const AIDOC_WEIGHTS: Partial<Record<string, number>> = {
  'symptom clusters': 2.0,
  'workup priorities': 1.8,
  'safety guardrails': 1.8,
  'documentation shortcuts': 1.5,
};

/////////////////////////////
// Build + memoize libs    //
/////////////////////////////

const _memo = new Map<string, string[]>();

export function buildLibrary({
  leads,
  focus,
  actions = BASE_ACTIONS,
  closers = BASE_CLOSERS,
  limit = 620,
  locale,
  weights,
}: BuildOptions): string[] {
  // memo key
  const key = JSON.stringify({ leads, focus, actions, closers, limit, locale, weights });
  if (_memo.has(key)) return _memo.get(key)!;

  const phrases: string[] = [];
  const seen = new Set<string>();

  outer: for (const lead of leads) {
    for (const action of actions) {
      for (const focusItem of focus) {
        for (const closer of closers) {
          if (shouldBanCombo(lead, action, focusItem, closer)) continue;

          const raw = `${lead} ${action} ${focusItem} ${closer}`.replace(/\s+/g, ' ').trim();
          const sanitized = sanitizePhrase(raw);

          if (seen.has(sanitized)) continue;
          seen.add(sanitized);
          phrases.push(sanitized);
          if (phrases.length >= limit) break outer;
        }
      }
    }
  }

  _memo.set(key, phrases);
  return phrases;
}

/////////////////////////////
// Mode -> library factory //
/////////////////////////////

export const ANALYZING_LIBRARIES: Record<AnalyzingLibraryKey, () => string[]> = {
  aidoc: () =>
    buildLibrary({
      leads: ['Sequencing', 'Reconstructing', 'Mapping', 'Layering'],
      focus: AIDOC_FOCUS,
      limit: 720,
      weights: AIDOC_WEIGHTS,
    }),
  clinical: () =>
    buildLibrary({
      leads: BASE_LEADS,
      focus: CLINICAL_FOCUS,
      limit: 640,
      weights: CLINICAL_WEIGHTS,
    }),
  wellness: () =>
    buildLibrary({
      leads: BASE_LEADS,
      focus: WELLNESS_FOCUS,
      limit: 640,
      weights: WELLNESS_WEIGHTS,
    }),
  clinicalResearch: () =>
    buildLibrary({
      leads: ['Synthesizing', 'Correlating', 'Tracing', 'Evaluating'],
      focus: [...CLINICAL_FOCUS, ...RESEARCH_FOCUS],
      limit: 720,
      weights: { ...CLINICAL_WEIGHTS, ...RESEARCH_WEIGHTS },
    }),
  wellnessResearch: () =>
    buildLibrary({
      leads: ['Connecting', 'Tracing', 'Balancing', 'Highlighting'],
      focus: [...WELLNESS_FOCUS, ...RESEARCH_FOCUS],
      limit: 720,
      weights: { ...WELLNESS_WEIGHTS, ...RESEARCH_WEIGHTS },
    }),
  generic: () =>
    buildLibrary({
      leads: BASE_LEADS,
      focus: GENERIC_FOCUS,
      limit: 620,
    }),
};

// Convenience prebuilt exports (if you want arrays directly)
export const aiDocAnalyzing = ANALYZING_LIBRARIES.aidoc();
export const clinicalAnalyzing = ANALYZING_LIBRARIES.clinical();
export const wellnessAnalyzing = ANALYZING_LIBRARIES.wellness();
export const clinicalResearchAnalyzing = ANALYZING_LIBRARIES.clinicalResearch();
export const wellnessResearchAnalyzing = ANALYZING_LIBRARIES.wellnessResearch();
export const genericAnalyzing = ANALYZING_LIBRARIES.generic();

/////////////////////////////
// Picking helpers         //
/////////////////////////////

/**
 * Picks N phrases uniformly at random (Fisher–Yates), optional seed for determinism.
 */
export function pickAnalyzingPhrases(
  list: readonly string[],
  countRange: [number, number] = [2, 4],
  seed?: number | string
): string[] {
  if (!list.length) return [];
  const [min, max] = countRange;
  const n = Math.max(min, Math.min(max, Math.floor(Math.random() * (max - min + 1)) + min));
  const rng = seed === undefined ? Math.random : seededRng(typeof seed === 'number' ? seed : hashString(String(seed)));
  const arr = list.slice();
  shuffleInPlace(arr, rng);
  return arr.slice(0, Math.min(n, arr.length));
}

/**
 * Picks phrases by library key, with optional seed and variant control.
 * - variant "full": full sentence (default).
 * - variant "short": 2–3 word micro-phrases built from lead+focus headwords.
 */
export function pickAnalyzingByKey(
  key: AnalyzingLibraryKey,
  countRange: [number, number] = [2, 4],
  seed?: number | string,
  variant: Variant = 'full'
): string[] {
  const lib = ANALYZING_LIBRARIES[key]?.() ?? [];
  const picks = pickAnalyzingPhrases(lib, countRange, seed);
  if (variant === 'full') return picks;

  // short variant: compress each sentence to a compact 2–3 word label
  return picks.map(toShortLabel);
}

/////////////////////////////
// Short label builder     //
/////////////////////////////

function headword(s: string): string {
  return s
    .trim()
    .replace(/\.$/, '')
    .split(/[ —–-]/)[0] // take first token before dash
    .split(' ')[0] // first word
    .toLowerCase();
}

function toShortLabel(sentence: string): string {
  // Try to extract focus chunk between action and closer
  // Example: "Mapping core insights on red-flag symptoms to ground the response."
  const s = sentence.replace(/\.$/, '');
  const onIdx = s.indexOf(' on ');
  const forIdx = s.indexOf(' for ');
  const aroundIdx = s.indexOf(' around ');
  const withinIdx = s.indexOf(' within ');
  const preps = [onIdx, forIdx, aroundIdx, withinIdx].filter((i) => i >= 0);
  const splitIdx = preps.length ? Math.min(...preps) : -1;

  let focusChunk = '';
  if (splitIdx >= 0) {
    // strip closer tail after focus
    const tail = s.slice(splitIdx + 1);
    const closerHit = BASE_CLOSERS.map((c) => c.replace('.', '')).find((c) => tail.includes(c));
    const endIdx = closerHit ? s.indexOf(closerHit) : s.length;
    focusChunk = s.slice(splitIdx + 4, endIdx).trim(); // crude but effective
  }

  const hw = headword(s);
  const fw = focusChunk ? headword(focusChunk) : 'insights';
  // Title Case
  const title = (w: string) => w.replace(/\b\w/g, (m) => m.toUpperCase());
  return title(`${hw} ${fw}`);
}

/////////////////////////////
// Locale hook (placeholder)
/////////////////////////////

export type Localizer = (s: string, locale?: string) => string;
/**
 * Hook point to localize phrases in future:
 * const t: Localizer = (s, locale) => translate(s, locale)
 * Then run phrases.map(t)
 */
export const passthroughLocalizer: Localizer = (s) => s;

/////////////////////////////
// Unit Test Hints (JSDoc) //
/////////////////////////////

/**
 * Suggested tests:
 * - buildLibrary: respects limit; returns unique, sanitized phrases; bans awkward combos.
 * - pickAnalyzingPhrases: uniform size ∈ [min,max]; seed produces deterministic order.
 * - toShortLabel: returns 2–3 word Title Case labels; no trailing punctuation.
 * - ANALYZING_LIBRARIES: each key returns non-empty ≤ limit.
 * - Weights: bump a weighted term’s prevalence over many samples (integration).
 */

