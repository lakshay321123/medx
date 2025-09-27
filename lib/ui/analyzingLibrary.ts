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
];

const BASE_ACTIONS = [
  'key factors for',
  'clinical signals around',
  'core insights on',
  'priority follow-ups for',
  'risk clusters within',
  'progress markers for',
  'time-line cues in',
  'underlying themes for',
  'edge conditions in',
  'urgent watch-points for',
];

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
];

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
];

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
];

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
];

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
];

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
];

type BuildOptions = {
  leads: string[];
  focus: string[];
  actions?: string[];
  closers?: string[];
  limit?: number;
};

function buildLibrary({ leads, focus, actions = BASE_ACTIONS, closers = BASE_CLOSERS, limit = 620 }: BuildOptions): string[] {
  const phrases: string[] = [];
  for (const lead of leads) {
    for (const action of actions) {
      for (const focusItem of focus) {
        for (const closer of closers) {
          const phrase = `${lead} ${action} ${focusItem} ${closer}`.replace(/\s+/g, ' ').trim();
          phrases.push(phrase);
          if (phrases.length >= limit) return phrases;
        }
      }
    }
  }
  return phrases;
}

export const aiDocAnalyzing = buildLibrary({ leads: ['Sequencing', 'Reconstructing', 'Mapping', 'Layering'], focus: AIDOC_FOCUS, limit: 720 });
export const clinicalAnalyzing = buildLibrary({ leads: BASE_LEADS, focus: CLINICAL_FOCUS, limit: 640 });
export const wellnessAnalyzing = buildLibrary({ leads: BASE_LEADS, focus: WELLNESS_FOCUS, limit: 640 });
export const clinicalResearchAnalyzing = buildLibrary({ leads: ['Synthesizing', 'Correlating', 'Tracing', 'Evaluating'], focus: [...CLINICAL_FOCUS, ...RESEARCH_FOCUS], limit: 720 });
export const wellnessResearchAnalyzing = buildLibrary({ leads: ['Connecting', 'Tracing', 'Balancing', 'Highlighting'], focus: [...WELLNESS_FOCUS, ...RESEARCH_FOCUS], limit: 720 });
export const genericAnalyzing = buildLibrary({ leads: BASE_LEADS, focus: GENERIC_FOCUS, limit: 620 });

export type AnalyzingLibraryKey =
  | 'aidoc'
  | 'clinical'
  | 'wellness'
  | 'clinicalResearch'
  | 'wellnessResearch'
  | 'generic';

export function pickAnalyzingPhrases(list: string[], countRange: [number, number] = [2, 4]): string[] {
  if (!list.length) return [];
  const [min, max] = countRange;
  const count = Math.max(min, Math.min(max, Math.floor(Math.random() * (max - min + 1)) + min));
  const phrases: string[] = [];
  const seen = new Set<number>();
  const maxAttempts = count * 3;
  let attempts = 0;
  while (phrases.length < count && attempts < maxAttempts) {
    attempts += 1;
    const idx = Math.floor(Math.random() * list.length);
    if (seen.has(idx)) continue;
    seen.add(idx);
    phrases.push(list[idx]);
  }
  while (phrases.length < count && phrases.length < list.length) {
    const idx = phrases.length;
    phrases.push(list[idx]);
  }
  return phrases;
}
