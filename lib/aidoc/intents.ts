export type AidocIntent =
  | { kind: "pull_reports" }
  | { kind: "compare_reports" }
  | { kind: "compare_metric"; metric: string }
  | { kind: "overall_health" }
  | { kind: "none" };

const METRIC_ALIASES: Record<string, string[]> = {
  LDL: ["ldl", "ldl-c", "low density lipoprotein", "bad cholesterol"],
  HbA1c: ["hba1c", "a1c", "glycated hemoglobin", "glycosylated hemoglobin"],
  "ALT (SGPT)": ["alt", "sgpt", "alanine transaminase"],
  "AST (SGOT)": ["ast", "sgot", "aspartate transaminase"],
  HDL: ["hdl", "hdl-c", "good cholesterol"],
  "Total Cholesterol": ["total cholesterol", "cholesterol total", "tc"],
  Triglycerides: ["triglyceride", "triglycerides", "tg"],
  "Fasting Glucose": ["fasting glucose", "fasting blood sugar", "fbg", "fasting sugar"],
};

const OVERALL_HEALTH_PATTERNS = [
  /\boverall health\b/,
  /\bhealth overall\b/,
  /\bhow(?:'s| is) my health\b/,
  /\bhow(?:'s| is) my health doing\b/,
  /\bhow am i doing overall\b/,
];

function normalize(text: string | null | undefined): string {
  return (text || "").trim().toLowerCase();
}

export function detectAidocIntent(text: string): AidocIntent {
  const normalized = normalize(text);
  if (!normalized) {
    return { kind: "none" };
  }

  if (/\bpull (?:my )?report(?:s)?\b/.test(normalized)) {
    return { kind: "pull_reports" };
  }

  if (/\bcompare (?:my )?report(?:s)?\b/.test(normalized)) {
    return { kind: "compare_reports" };
  }

  if (OVERALL_HEALTH_PATTERNS.some((re) => re.test(normalized))) {
    return { kind: "overall_health" };
  }

  if (/\bcompare (?:my )?/i.test(normalized)) {
    for (const [metric, aliases] of Object.entries(METRIC_ALIASES)) {
      for (const alias of aliases) {
        const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i");
        if (re.test(normalized)) {
          return { kind: "compare_metric", metric };
        }
      }
    }
  }

  return { kind: "none" };
}
