export type QueryParseInput = {
  text: string;
  mode?: 'aidoc' | 'clinical' | 'wellness' | 'therapy' | 'research' | 'patient' | 'doctor';
  researchEnabled?: boolean;
};

export type QueryParseResult = {
  complexity: 'simple' | 'complex';
  needsResearch: boolean;
  needsCalculators: boolean;
  topicKeywords: string[];
};

const SIMPLE_LENGTH_THRESHOLD = 160;

const COMPLEX_KEYWORDS = [
  'differential',
  'interpret',
  'compare',
  'analysis',
  'trend',
  'timeline',
  'comprehensive',
  'detailed',
  'management plan',
  'guideline',
  'recommendation',
  'report',
  'triage',
  'assessment',
  'lab',
  'imaging',
  'scan',
  'mri',
  'ct',
  'x-ray',
  'xray',
  'cbc',
  'interpretation',
  'workup',
  'evaluation',
  'symptom cluster',
  'protocol',
];

const RESEARCH_KEYWORDS = [
  'cite',
  'citation',
  'references',
  'sources',
  'pubmed',
  'clinicaltrials.gov',
  'rct',
  'systematic review',
  'meta-analysis',
  'guideline 2024',
  'who',
  'cdc',
  'nice',
  'nih',
  'evidence',
  'latest study',
];

const CALCULATOR_KEYWORDS = [
  'dosage',
  'dose',
  'mg',
  'ml',
  'mcg',
  'iu',
  'units',
  'g/dl',
  'mmol',
  'mmhg',
  'bmi',
  'score',
  'risk',
  'calculate',
  'calculator',
  'calc',
  'lab',
  'labs',
  'report',
  'reports',
  'test',
  'tests',
  'symptom',
  'symptoms',
  'triage',
  'severity',
  'scale',
];

const STOP_WORDS = new Set([
  'the',
  'and',
  'a',
  'an',
  'for',
  'with',
  'about',
  'what',
  'how',
  'why',
  'is',
  'are',
  'of',
  'to',
  'in',
  'on',
  'it',
  'my',
  'me',
  'you',
  'that',
  'this',
  'we',
  'our',
  'their',
  'they',
  'be',
  'can',
  'do',
  'does',
  'should',
  'could',
  'would',
]);

const KEYWORD_REGEX = /[a-zA-Z][a-zA-Z0-9-]+/g;

function includesKeyword(text: string, list: string[]): boolean {
  const lower = text.toLowerCase();
  return list.some(keyword => lower.includes(keyword));
}

export function parseQuery(input: QueryParseInput): QueryParseResult {
  const text = (input.text || '').trim();
  const mode = input.mode ?? 'wellness';
  const lower = text.toLowerCase();

  const longEnough = text.length > SIMPLE_LENGTH_THRESHOLD;
  const complexByKeyword = includesKeyword(lower, COMPLEX_KEYWORDS);
  const calcByKeyword = includesKeyword(lower, CALCULATOR_KEYWORDS);
  const researchByKeyword = includesKeyword(lower, RESEARCH_KEYWORDS);

  let needsResearch = researchByKeyword || input.researchEnabled === true;
  let needsCalculators = calcByKeyword;

  if (mode === 'aidoc' || mode === 'clinical' || mode === 'doctor') {
    if (/(report|lab|labs|test|panel|cbc|cmp|lft|rft|symptom|symptoms|triage)/i.test(text)) {
      needsCalculators = true;
    }
  }

  if (mode === 'wellness') {
    if (!calcByKeyword) {
      needsCalculators = false;
    }
  }

  if (mode === 'aidoc') {
    needsCalculators = true;
  }

  if (mode === 'research' || /research/i.test(mode)) {
    needsResearch = true;
  }

  const complexity: 'simple' | 'complex' =
    longEnough || complexByKeyword || needsCalculators || needsResearch ? 'complex' : 'simple';

  const words = lower.match(KEYWORD_REGEX) || [];
  const freq = new Map<string, number>();
  for (const word of words) {
    if (word.length < 3) continue;
    if (STOP_WORDS.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  const topicKeywords = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  return { complexity, needsResearch, needsCalculators, topicKeywords };
}
