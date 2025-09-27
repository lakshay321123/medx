import type { AppMode } from "@/lib/welcomeMessages";

export type AnalyzingKey =
  | "generic"
  | "aiDoc"
  | "clinical"
  | "clinicalResearch"
  | "wellness"
  | "wellnessResearch";

export type IntentBucket =
  | "symptomsDiagnosis"
  | "labsReports"
  | "dietNutrition"
  | "fitnessSleepStress"
  | "research"
  | "general";

export type PhraseSelectionOptions = {
  keywords?: string[];
  primaryKeyword?: string | null;
  intentBucket?: IntentBucket;
  max?: number;
  requireTopicOverlap?: boolean;
  researchRequested?: boolean;
};

export type PhraseSelectionResult = {
  phrases: string[];
  finalizer: string | null;
};

const DEFAULT_MAX_PHRASES = 2;
const DEFAULT_FALLBACK = "Analyzing your request…";

const RESEARCH_TERMS = /(evidence|study|studies|trial|trials|guideline|guidelines|meta[- ]?analysis|literature|research|RCT|randomized)/i;

const MODE_RULES: Record<AnalyzingKey, { disallow?: RegExp[]; require?: RegExp[] }> = {
  generic: {},
  aiDoc: {},
  clinical: {},
  clinicalResearch: { require: [RESEARCH_TERMS] },
  wellness: {
    disallow: [/(triage|staging|escalation|medication|dose|dosing|labs?|markers?)/i],
  },
  wellnessResearch: {
    disallow: [/(triage|staging|escalation|medication|dose|dosing)/i],
    require: [RESEARCH_TERMS],
  },
};

const INTENT_HINTS: Record<IntentBucket, RegExp[]> = {
  symptomsDiagnosis: [/symptom/, /history/, /triage/, /assessment/, /safety/, /red-flag/, /differential/],
  labsReports: [/lab/, /marker/, /values?/, /reports?/, /results?/, /imaging/, /scan/, /test/],
  dietNutrition: [/nutrition/, /diet/, /calories?/, /protein/, /meal/, /intake/, /hydration/, /macros/],
  fitnessSleepStress: [/sleep/, /stress/, /routine/, /movement/, /energy/, /recovery/, /habit/, /lifestyle/],
  research: [RESEARCH_TERMS],
  general: [],
};

function selectLibrary(
  key: AnalyzingKey,
  lib: typeof import("./analyzingLibrary"),
): readonly string[] {
  switch (key) {
    case "aiDoc":
      return lib.aiDocAnalyzing;
    case "clinical":
      return lib.clinicalAnalyzing;
    case "clinicalResearch":
      return lib.clinicalResearchAnalyzing;
    case "wellness":
      return lib.wellnessAnalyzing;
    case "wellnessResearch":
      return lib.wellnessResearchAnalyzing;
    default:
      return lib.genericAnalyzing;
  }
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, "")
    .trim();
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function passesModeGuard(phrase: string, key: AnalyzingKey, researchRequested?: boolean): boolean {
  const rules = MODE_RULES[key];
  if (!rules) return true;
  const normalized = phrase.toLowerCase();
  if (rules.disallow?.some(rx => rx.test(normalized))) return false;
  if (rules.require?.length) {
    const hasRequired = rules.require.some(rx => rx.test(normalized));
    if (!hasRequired) return Boolean(researchRequested);
  }
  return true;
}

function buildFinalizer(primaryKeyword?: string | null): string | null {
  if (!primaryKeyword) return null;
  const normalized = primaryKeyword.replace(/[^a-z0-9+\s]/gi, " ").trim();
  if (!normalized) return null;
  return `Finalizing ${toTitleCase(normalized)}…`;
}

type PhraseCandidate = {
  phrase: string;
  index: number;
  overlap: number;
  score: number;
};

export async function loadAnalyzingPhrases(
  key: AnalyzingKey,
  options: PhraseSelectionOptions = {},
): Promise<PhraseSelectionResult> {
  const lib = await import("./analyzingLibrary");
  const fallbackPool = lib.genericAnalyzing;
  const fallbackPhrase = fallbackPool[0] ?? DEFAULT_FALLBACK;
  const pool = selectLibrary(key, lib);

  if (!pool.length) {
    return {
      phrases: [fallbackPhrase],
      finalizer: buildFinalizer(options.primaryKeyword),
    };
  }

  const keywordList = options.keywords?.map(normalizeToken).filter(Boolean) ?? [];
  const keywordSet = new Set(keywordList);
  const requireTopic = Boolean(options.requireTopicOverlap);

  if (requireTopic && keywordSet.size === 0) {
    return {
      phrases: [fallbackPhrase],
      finalizer: buildFinalizer(options.primaryKeyword),
    };
  }

  const candidates: PhraseCandidate[] = [];

  pool.forEach((phrase, index) => {
    if (!passesModeGuard(phrase, key, options.researchRequested)) {
      return;
    }
    const normalized = phrase.toLowerCase();
    const tokens = normalized.split(/[^a-z0-9+]+/).filter(Boolean);
    const overlap = keywordList.length
      ? tokens.reduce((acc, token) => (keywordSet.has(token) ? acc + 1 : acc), 0)
      : 0;
    if (requireTopic && overlap === 0) {
      return;
    }
    const intentHints = options.intentBucket ? INTENT_HINTS[options.intentBucket] ?? [] : [];
    const matchesIntent = intentHints.some(rx => rx.test(normalized));
    let score = overlap;
    if (matchesIntent) score += 1;
    if (
      (options.intentBucket === "research" || key === "clinicalResearch" || key === "wellnessResearch" || options.researchRequested) &&
      RESEARCH_TERMS.test(normalized)
    ) {
      score += 1;
    }
    if (score >= 1) {
      candidates.push({ phrase, index, overlap, score });
    }
  });

  if (!candidates.length) {
    return {
      phrases: [fallbackPhrase],
      finalizer: buildFinalizer(options.primaryKeyword),
    };
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    return a.index - b.index;
  });

  const max = Math.max(1, Math.min(options.max ?? DEFAULT_MAX_PHRASES, candidates.length));
  const phrases = candidates.slice(0, max).map(candidate => candidate.phrase);

  return {
    phrases,
    finalizer: buildFinalizer(options.primaryKeyword),
  };
}

export function analyzingKeyForMode(mode: AppMode, research: boolean): AnalyzingKey {
  if (mode === "aidoc") return "aiDoc";
  if (mode === "clinical") return research ? "clinicalResearch" : "clinical";
  if (mode === "therapy") return research ? "wellnessResearch" : "wellness";
  if (mode === "wellness") return research ? "wellnessResearch" : "wellness";
  return "generic";
}
