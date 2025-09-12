// lib/ai/verify_prompt.ts

export const VERIFY_SYSTEM = `
You are OpenAI GPT-5 verifying (and correcting if needed) all medically relevant calculations/interpretations for the conversation.
Return STRICT JSON ONLY (no prose) that conforms to the provided JSON Schema. Do not include any extra keys.
If calculators or intermediate logic are inconsistent with physiology or guidelines, correct them.
If inputs are insufficient, omit fields rather than guessing.
You have final authority on corrected values; these will override calculators system-wide.
Hard rules:
- Anion gap (AG) = Na − (Cl + HCO3). Do not include K.
- Albumin-corrected AG = AG + 2.5 × (4 − albumin[g/dL]).
- Serum osmolality (calculated) = 2 × Na + Glucose/18 + BUN/2.8. Do not include creatinine.
- Osmolar gap = measured_osm − calculated_osm. Elevated if ≥ 10.
- Effective osmolality (tonicity) = 2 × Na + Glucose/18 (exclude BUN).
- Corrected sodium for hyperglycemia ≈ Na + 1.6 × ((glucose − 100) / 100).
- Winter’s expected pCO2 for metabolic acidosis = 1.5 × HCO3 + 8, tolerance ±2; higher → concomitant respiratory acidosis, lower → concomitant respiratory alkalosis.
- DKA requires glucose ≥ 250 mg/dL plus metabolic acidosis (pH < 7.30 or HCO3 ≤ 18) and elevated AG; HHS hyperosmolar criterion uses effective osmolality ≥ 320 mOsm/kg.
- Do not create non-standard metrics (e.g., lactate:pH ratio). Reject them.
- Only compute qSOFA/SIRS/NEWS2/CURB-65 if all required inputs (vitals/mentation) are present; otherwise omit them entirely.
`;

// Valid JSON (string) — safe for JSON.parse
export const VERIFY_SCHEMA = "{\"type\":\"object\",\"required\":[\"ok\",\"version\"],\"additionalProperties\":false,\"properties\":{\"ok\":{\"type\":\"boolean\"},\"version\":{\"type\":\"string\",\"enum\":[\"v1\"]},\"corrected_values\":{\"type\":\"object\",\"additionalProperties\":{\"oneOf\":[{\"type\":[\"string\",\"number\",\"boolean\",\"null\"]},{\"type\":\"object\",\"additionalProperties\":false,\"required\":[\"value\"],\"properties\":{\"value\":{},\"unit\":{\"type\":[\"string\",\"null\"]},\"notes\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}}}}]}},\"corrections\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"final_assertions\":{\"type\":\"object\",\"additionalProperties\":{\"type\":[\"string\",\"number\",\"boolean\",\"null\"]}}}}";

export function buildVerifyUserContent(payload: {
  mode: string;
  ctx: Record<string, any>;
  computed: Array<any>;
  conversation?: Array<{ role: string; content: string }>;
}) {
  return JSON.stringify({
    instruction:
      "Validate and correct using the rules above. Only output JSON matching the schema. Do not invent metrics or scores without required inputs.",
    mode: payload.mode,
    schema: JSON.parse(VERIFY_SCHEMA),
    inputs: payload.ctx,
    calculators: payload.computed,
    conversation: payload.conversation ?? []
  });
}
