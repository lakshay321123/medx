// lib/ai/verify_prompt.ts

export const VERIFY_SYSTEM = `
You are OpenAI GPT-5 verifying and, if needed, correcting all medically-relevant calculations and interpretations.
Return STRICT JSON ONLY (no prose), exactly matching the provided schema.
If calculators or intermediate logic are inconsistent with physiology or guidelines, correct them.
If inputs are insufficient, omit fields rather than guessing.
You have final authority on corrected values; these will override calculators system-wide.
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
      "Validate and correct. Apply physiology cross-checks: Winters expected pCO2 (1.5*HCO3 + 8, tolerance plus or minus 2), serum osmolality (2*Na + Glucose/18 + BUN/2.8; normal 275 to 295), osmolar gap (measured minus calculated; at least 10 is elevated), albumin-corrected anion gap (AG + 2.5*(4 minus Alb in g/dL)), potassium severity bands, renal flags. Reject ad-hoc metrics such as lactate to pH ratio. Only produce the JSON response.",
    mode: payload.mode,
    schema: JSON.parse(VERIFY_SCHEMA),  // now valid
    inputs: payload.ctx,
    calculators: payload.computed,
    conversation: payload.conversation ?? []
  });
}
