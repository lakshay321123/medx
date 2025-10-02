const PROMPT_MAP = {
  pull_reports: [
    "pull my reports",
    "show all reports",
    "get my reports",
    "report history",
    "lab history",
    "list my labs",
  ],
  compare_metric: [
    "compare ldl",
    "compare hba1c",
    "trend ldl",
    "trend glucose",
    "compare cholesterol",
    "check vitamin d trend",
  ],
  compare_reports: [
    "compare my may and october reports",
    "compare reports",
    "compare lab reports",
    "report comparison",
    "difference between reports",
  ],
  health_summary: [
    "how is my health",
    "health summary",
    "overall health",
    "give me a health summary",
    "summarize my health",
  ],
  interpret_report: [
    "fracture report",
    "interpret my mri",
    "explain my x-ray",
    "interpret imaging",
    "doctor note",
    "injury report",
  ],
} as const;

export type AiDocIntentCategory = keyof typeof PROMPT_MAP;

export const AiDocPrompts: Record<AiDocIntentCategory, readonly string[]> = PROMPT_MAP;
