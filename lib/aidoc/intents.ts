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

const PULL_RE = /\b(pull|show|list|fetch)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const COMPARE_RE = /\b(compare|contrast)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const OVERALL_RE = /\b(how('?s|\s+is)\s+my\s+health(\s+overall)?|overall\s+health|health\s+overall)\b/i;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

export function detectAidocIntent(text: string): AidocIntent {
  const s = (text || "").trim();
  if (!s) {
    return { kind: "none" };
  }

  if (PULL_RE.test(s)) {
    return { kind: "pull_reports" };
  }

  if (COMPARE_RE.test(s)) {
    return { kind: "compare_reports" };
  }

  if (OVERALL_RE.test(s)) {
    return { kind: "overall_health" };
  }

  if (/\bcompare (?:my )?/i.test(s)) {
    for (const [metric, aliases] of Object.entries(METRIC_ALIASES)) {
      for (const alias of aliases) {
        const re = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
        if (re.test(s)) {
          return { kind: "compare_metric", metric };
        }
      }
    }
  }

  return { kind: "none" };
}
