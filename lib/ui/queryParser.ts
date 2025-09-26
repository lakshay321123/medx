import {
  aiDocAnalyzing,
  clinicalAnalyzing,
  clinicalResearchAnalyzing,
  genericAnalyzing,
  wellnessAnalyzing,
  wellnessResearchAnalyzing,
} from "@/lib/ui/analyzingLibrary";

export type QueryMode = "aidoc" | "clinical" | "wellness";

export interface QueryParserContext {
  mode: QueryMode;
  research?: boolean;
}

type KeywordCategory =
  | "symptoms"
  | "tests"
  | "diet"
  | "medications"
  | "lifestyle"
  | "prevention";

interface QueryParserResult {
  keywords: KeywordCategory[];
  wordCount: number;
  complexity: "short" | "medium" | "long";
  mode: QueryMode;
  research: boolean;
}

const keywordDetectors: { name: KeywordCategory; regex: RegExp }[] = [
  { name: "symptoms", regex: /\b(symptom|pain|ache|fever|cough|rash|nausea|fatigue|dizz|breath|swelling)\w*/i },
  { name: "tests", regex: /\b(test|scan|mri|ct|x-?ray|lab|blood work|panel|report|imaging)\w*/i },
  { name: "diet", regex: /\b(diet|meal|food|nutrition|calorie|protein|carb|fiber|supplement|vitamin)\w*/i },
  { name: "medications", regex: /\b(medication|medicine|drug|tablet|dose|prescription|pill|therapy)\w*/i },
  { name: "lifestyle", regex: /\b(exercise|workout|sleep|stress|routine|habit|wellness|coach|fitness)\w*/i },
  { name: "prevention", regex: /\b(prevent|avoid|reduce risk|safety|precaution|screening)\w*/i },
];

const keywordLines: Record<KeywordCategory, { aidoc: string; clinical: string; wellness: string }> = {
  symptoms: {
    aidoc: "Mapping symptom patterns to possible causes…",
    clinical: "Evaluating symptom progression and severity…",
    wellness: "Tracking how symptoms tie into routines…",
  },
  tests: {
    aidoc: "Reviewing diagnostic tests and reports…",
    clinical: "Checking relevant investigations and labs…",
    wellness: "Noting which health checks are most useful…",
  },
  diet: {
    aidoc: "Checking nutrition factors that affect outcomes…",
    clinical: "Assessing diet interactions with treatment plans…",
    wellness: "Balancing nutrition and lifestyle inputs…",
  },
  medications: {
    aidoc: "Reconciling medications and safety flags…",
    clinical: "Reviewing drug interactions and dosing guidance…",
    wellness: "Considering supplements and medication routines…",
  },
  lifestyle: {
    aidoc: "Connecting habits with clinical changes…",
    clinical: "Evaluating lifestyle contributors to care goals…",
    wellness: "Aligning habits with wellbeing targets…",
  },
  prevention: {
    aidoc: "Scanning preventive care checklists…",
    clinical: "Identifying risk reduction opportunities…",
    wellness: "Outlining preventive wellness moves…",
  },
};

export function parseQuery(query: string, context: QueryParserContext): QueryParserResult {
  const normalized = query.trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const complexity = wordCount <= 6 ? "short" : wordCount >= 22 ? "long" : "medium";
  const keywords = keywordDetectors
    .filter(detector => detector.regex.test(normalized))
    .map(detector => detector.name);

  return {
    keywords: Array.from(new Set(keywords)),
    wordCount,
    complexity,
    mode: context.mode,
    research: Boolean(context.research),
  };
}

function basePhrasesFor(result: QueryParserResult): readonly string[] {
  if (result.mode === "aidoc") {
    return aiDocAnalyzing;
  }
  if (result.mode === "clinical") {
    return result.research ? clinicalResearchAnalyzing : clinicalAnalyzing;
  }
  return result.research ? wellnessResearchAnalyzing : wellnessAnalyzing;
}

function keywordLineFor(mode: QueryMode, keyword: KeywordCategory): string | null {
  const entry = keywordLines[keyword];
  if (!entry) return null;
  return entry[mode] ?? null;
}

export function buildAnalyzingSequence(
  query: string,
  context: QueryParserContext,
  opts: { min?: number; max?: number } = {},
): string[] {
  const result = parseQuery(query, context);
  const base = basePhrasesFor(result);
  const min = Math.max(1, opts.min ?? 2);
  const max = Math.max(min, opts.max ?? 4);

  const lines: string[] = [];
  const pushUnique = (line: string | null | undefined) => {
    if (!line) return;
    if (!lines.includes(line)) {
      lines.push(line);
    }
  };

  for (const keyword of result.keywords) {
    pushUnique(keywordLineFor(result.mode, keyword));
  }

  for (const line of base) {
    pushUnique(line);
    if (lines.length >= max) break;
  }

  if (lines.length < min) {
    for (const fallback of genericAnalyzing) {
      pushUnique(fallback);
      if (lines.length >= min) break;
    }
  }

  if (lines.length === 0) {
    lines.push(genericAnalyzing[0] ?? "Analyzing…");
  }

  const target = (() => {
    const available = Math.min(lines.length, max);
    if (available <= min) return available;
    if (result.complexity === "short") {
      return Math.max(min, Math.min(available, 2));
    }
    if (result.complexity === "long") {
      return Math.max(min, Math.min(available, 4));
    }
    return Math.max(min, Math.min(available, 3));
  })();

  return lines.slice(0, target);
}
