export const AIDOC_JSON_INSTRUCTION = `
Return ONLY valid JSON with this shape:
{
  "reply": "assistant message",
  "kind": "chat" | "reports",
  "intent": "pull_reports" | "compare_metric" | "compare_reports" | "health_summary" | "interpret_report",
  "patient": {"name":"string","age":32,"predispositions":["string"],"medications":["string"],"symptoms":["string"]},
  "reports": [
    {
      "date": "YYYY-MM-DD",
      "summary": "key takeaways",
      "labs": [{"name":"LDL","value":160,"unit":"mg/dL","marker":"High","ideal":"<100"}]
    }
  ],
  "comparisons": {"LDL": "160 → 182 mg/dL; rising"},
  "summary": "Holistic summary",
  "nextSteps": ["Follow up"],
  "save": {
    "medications": [{"name": "Metformin", "dose": "500 mg", "route": "oral", "freq": "bid", "startedAt":"YYYY-MM-DD"}],
    "conditions": [{"label":"Type 2 Diabetes", "code":"E11", "status":"active","since":"YYYY-MM-DD"}],
    "labs": [{"panel":"LFT","name":"ALT","value":42,"unit":"U/L","refLow":0,"refHigh":40,"takenAt":"YYYY-MM-DD"}],
    "notes": [{"type":"symptom","key":"fever","value":"2 days"}],
    "prefs": [{"key":"pill_form","value":"prefers liquid syrups"}]
  },
  "observations": {
    "short": "2-3 lines; no family hx repetition; action-oriented",
    "long": "full nuance; list ACTIVE conditions; list stale panels to repeat"
  }
}
`;

export enum AiDocIntent {
  PullReports = "pull_reports",
  CompareMetric = "compare_metric",
  CompareReports = "compare_reports",
  HealthSummary = "health_summary",
  InterpretReport = "interpret_report",
}

const intentPatterns: Record<AiDocIntent, RegExp[]> = {
  [AiDocIntent.PullReports]: [
    /\b(pull|show|get|fetch)\s+(?:all\s+)?(?:my\s+)?reports\b/i,
    /\breport\s+(?:history|summary|overview)\b/i,
  ],
  [AiDocIntent.CompareMetric]: [
    /\bcompare\s+(ldl|hdl|hba1c|triglycerides?|glucose|vitamin\s*d|alt|ast|bun|creatinine|cholesterol)\b/i,
    /\btrend\s+(ldl|hba1c|glucose|weight)\b/i,
  ],
  [AiDocIntent.CompareReports]: [
    /\bcompare\s+(?:my\s+)?(reports?|labs?)\s+(?:from|between)\b/i,
    /\b(report|lab)\s+trend\s+(?:by|across)\s+dates?\b/i,
  ],
  [AiDocIntent.HealthSummary]: [
    /\bhow\s+is\s+(?:my\s+)?health\b/i,
    /\b(health|medical)\s+summary\b/i,
    /\boverall\s+(?:health|condition)\b/i,
  ],
  [AiDocIntent.InterpretReport]: [
    /\bfracture\b/i,
    /\b(imaging|mri|x-?ray|ct|scan|ultrasound|radiology)\b/i,
    /\binjury\s+report\b/i,
    /\bdoctor'?s?\s+note\b/i,
  ],
};

export function detectAidocIntent(message: string): AiDocIntent | null {
  if (!message) return null;
  for (const [intent, patterns] of Object.entries(intentPatterns) as [AiDocIntent, RegExp[]][]) {
    if (patterns.some((regex) => regex.test(message))) {
      return intent;
    }
  }
  return null;
}

export const AIDOC_INTENT_PATTERNS = intentPatterns;

