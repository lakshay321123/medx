import { detectExperientialIntent } from "@/lib/aidoc/triage";

export type ChatIntent = 
  | "symptom_triage"    // User describing symptoms → structured intake
  | "pull_data"         // "Show my labs" → query observations
  | "drug_question"     // "Can I take X with Y?" → drug interactions
  | "calculator"        // "What's my BMI?" → compute
  | "general"           // Everything else → standard LLM
  ;

const PULL_DATA_PATTERNS = [
  /\b(show|display|get|pull|list|what are|what is)\b.*(lab|result|report|vital|medication|med|obs|blood|test)/i,
  /\b(my|mine)\b.*(lab|result|report|vital|med|health score)/i,
  /\b(latest|recent|last)\b.*(lab|test|report|result|vitals)/i,
];

const DRUG_PATTERNS = [
  /\b(interact|interaction|together|combine|mix)\b.*(drug|med|medication|pill|tablet)/i,
  /\b(can i take|safe to take|okay to take)\b.*\b(with|and)\b/i,
  /\b(drug|medication)\b.*\b(interaction|clash|conflict)/i,
];

const CALCULATOR_PATTERNS = [
  /\b(calculate|compute|what('?s| is) my)\b.*(bmi|egfr|creatinine|risk|score|heart|wells|curb)/i,
  /\b(bmi|body mass|egfr|gfr|creatinine clearance)\b.*\b(for|with|given)\b/i,
];

export function detectIntent(text: string): ChatIntent {
  const t = text.toLowerCase().trim();
  
  if (detectExperientialIntent(text)) return "symptom_triage";
  if (PULL_DATA_PATTERNS.some(p => p.test(t))) return "pull_data";
  if (DRUG_PATTERNS.some(p => p.test(t))) return "drug_question";
  if (CALCULATOR_PATTERNS.some(p => p.test(t))) return "calculator";
  
  return "general";
}

/** Build extra context for pull_data intent */
export function buildDataPullContext(observations: any[]): string {
  if (!observations?.length) return "[No health data found for this user.]";
  
  const byKind: Record<string, any[]> = {};
  for (const o of observations) {
    const k = o.kind || "other";
    if (!byKind[k]) byKind[k] = [];
    byKind[k].push(o);
  }
  
  const lines: string[] = ["[USER HEALTH DATA]"];
  for (const [kind, items] of Object.entries(byKind)) {
    const latest = items[0]; // already sorted desc
    if (latest.value_num != null) {
      lines.push(`${kind}: ${latest.value_num}${latest.unit ? ` ${latest.unit}` : ""} (${latest.observed_at?.split("T")[0] || "recent"})`);
    } else if (latest.value_text) {
      lines.push(`${kind}: ${latest.value_text}`);
    }
  }
  return lines.join("\n");
}
