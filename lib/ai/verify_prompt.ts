export const VERIFY_SYSTEM = `
You are OpenAI GPT-5 verifying and (if needed) correcting clinical calculator outputs.
Return STRICT JSON ONLY (no prose), matching the provided schema.
If calculators are inconsistent with physiology or guidelines, correct them.
If inputs are insufficient, leave fields absent rather than guessing.
You have final authority on corrected values; these will override calculators.
`;

export const VERIFY_SCHEMA = `
{
  "ok": boolean,
  "version": "v1",
  "corrected_values": {
    // key: calculator id or canonical field name
    // value: corrected scalar/string or structured object with {value, unit, notes[]}
  },
  "corrections": [ "short what/why lines" ],
  "final_assertions": {
    // decisive flags like: "primary_dx", "acid_base", "dka_severity", etc.
  }
}
`;

// Helper to compose the single user message we send to GPT-5
export function buildVerifyUserContent(payload: {
  mode: string;
  ctx: Record<string, any>;
  computed: Array<any>;
}) {
  return JSON.stringify({
    instruction: "Validate & correct. Apply physiology cross-checks (Winter’s, osmolality 275–295 normal, albumin-corrected anion gap, potassium bands, renal flags). Do not emit prose.",
    mode: payload.mode,
    schema: JSON.parse(VERIFY_SCHEMA),
    inputs: payload.ctx,
    calculators: payload.computed,
  });
}
