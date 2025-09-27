import { analyzingKeyForMode, type AnalyzingKey, type IntentBucket } from "@/lib/ui/analyzingPhrases";
import type { AppMode } from "@/lib/welcomeMessages";

export type PendingIntent = {
  modeKey: AnalyzingKey;
  intentBucket: IntentBucket;
  needsResearch: boolean;
  needsCalculators: boolean;
  topicKeywords: string[];
  primaryKeyword: string | null;
  isSimple: boolean;
  isTherapy: boolean;
};

type ParseInput = {
  text: string;
  mode: AppMode;
  research: boolean;
};

const STOP_WORDS = new Set([
  "a",
  "about",
  "and",
  "are",
  "as",
  "at",
  "be",
  "can",
  "do",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "this",
  "to",
  "what",
  "when",
  "which",
  "with",
  "would",
  "you",
]);

const BUCKET_KEYWORDS: Record<IntentBucket, string[]> = {
  symptomsDiagnosis: [
    "symptom",
    "symptoms",
    "diagnosis",
    "diagnose",
    "pain",
    "aches",
    "ache",
    "injury",
    "injuries",
    "rash",
    "fever",
    "cough",
    "nausea",
    "vomit",
    "vomiting",
    "dizzy",
    "dizziness",
    "infection",
    "infections",
    "swelling",
    "shortness of breath",
    "breathless",
    "breathlessness",
    "flare",
    "flare-up",
  ],
  labsReports: [
    "lab",
    "labs",
    "report",
    "reports",
    "test",
    "tests",
    "blood work",
    "bloodwork",
    "cbc",
    "scan",
    "scans",
    "imaging",
    "mri",
    "ct",
    "x-ray",
    "xray",
    "ecg",
    "hba1c",
    "cholesterol",
    "results",
    "values",
    "markers",
  ],
  dietNutrition: [
    "diet",
    "dieting",
    "calorie",
    "calories",
    "protein",
    "carb",
    "carbs",
    "fat",
    "fats",
    "nutrition",
    "nutrients",
    "meal",
    "meals",
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "snacks",
    "fasting",
    "hydration",
    "water",
    "supplement",
    "supplements",
  ],
  fitnessSleepStress: [
    "sleep",
    "sleeping",
    "insomnia",
    "rest",
    "resting",
    "stress",
    "stressed",
    "anxiety",
    "burnout",
    "exercise",
    "exercising",
    "workout",
    "workouts",
    "training",
    "run",
    "running",
    "yoga",
    "meditation",
    "mindfulness",
    "movement",
    "routine",
    "energy",
    "fatigue",
  ],
  research: [
    "study",
    "studies",
    "research",
    "evidence",
    "guideline",
    "guidelines",
    "source",
    "sources",
    "citation",
    "citations",
    "trial",
    "trials",
    "meta-analysis",
    "systematic review",
    "paper",
    "journal",
    "reference",
  ],
  general: [],
};

const BUCKET_SYNONYMS: Record<IntentBucket, string[]> = {
  symptomsDiagnosis: ["symptom", "assessment", "history", "safety", "triage"],
  labsReports: ["lab", "reports", "markers", "values", "results"],
  dietNutrition: ["nutrition", "diet", "meal", "intake", "macros"],
  fitnessSleepStress: ["sleep", "stress", "movement", "routine", "energy"],
  research: ["evidence", "guidelines", "research", "studies", "sources"],
  general: [],
};

const PRIORITY: IntentBucket[] = [
  "research",
  "labsReports",
  "symptomsDiagnosis",
  "dietNutrition",
  "fitnessSleepStress",
  "general",
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter(token => token && !STOP_WORDS.has(token));
}

function expandKeywords(keywords: string[]): string[] {
  const expanded: string[] = [];
  keywords.forEach(keyword => {
    const parts = keyword.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      parts.forEach(part => expanded.push(part));
    }
    expanded.push(keyword);
  });
  return expanded;
}

export function parsePendingIntent({ text, mode, research }: ParseInput): PendingIntent {
  const normalizedText = text.trim();
  const lowered = normalizedText.toLowerCase();
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const tokens = tokenize(normalizedText);

  const matches: { bucket: IntentBucket; keywords: string[] }[] = [];

  (Object.entries(BUCKET_KEYWORDS) as [IntentBucket, string[]][]).forEach(([bucket, keywordList]) => {
    if (bucket === "general") return;
    const hits = keywordList.filter(keyword => lowered.includes(keyword));
    if (hits.length) {
      matches.push({ bucket, keywords: hits });
    }
  });

  let intentBucket: IntentBucket = "general";
  for (const bucket of PRIORITY) {
    const match = matches.find(item => item.bucket === bucket);
    if (match) {
      intentBucket = bucket;
      break;
    }
  }

  const primaryKeyword = (() => {
    for (const bucket of PRIORITY) {
      const match = matches.find(item => item.bucket === bucket);
      if (match && match.keywords.length) {
        return match.keywords[0];
      }
    }
    return tokens[0] ?? null;
  })();

  const keywordSet = new Set<string>();
  matches.forEach(match => {
    expandKeywords(match.keywords).forEach(keyword => keywordSet.add(keyword));
  });
  tokens.slice(0, 6).forEach(keyword => keywordSet.add(keyword));
  BUCKET_SYNONYMS[intentBucket].forEach(keyword => keywordSet.add(keyword));

  const topicKeywords = Array.from(keywordSet).slice(0, 8);

  const needsResearch = research || matches.some(match => match.bucket === "research");
  const needsCalculators =
    (mode === "aidoc" || mode === "clinical") &&
    (intentBucket === "symptomsDiagnosis" || intentBucket === "labsReports");

  const isSimple = words.length <= 12 && topicKeywords.length === 0;
  const modeKey = analyzingKeyForMode(mode, research || needsResearch);
  const isTherapy = mode === "therapy";

  return {
    modeKey,
    intentBucket,
    needsResearch,
    needsCalculators,
    topicKeywords,
    primaryKeyword,
    isSimple,
    isTherapy,
  };
}
