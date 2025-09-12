export const VERIFY_SYSTEM = `
You are OpenAI GPT-5 verifying and, if needed, correcting all medically-relevant calculations and interpretations.
Return STRICT JSON ONLY (no prose), exactly matching the provided schema.
If calculators or intermediate logic are inconsistent with physiology or guidelines, correct them.
If inputs are insufficient, omit fields rather than guessing.
You have final authority on corrected values; these will override calculators system-wide.
`;

export const VERIFY_SCHEMA = `
{
  "ok": boolean,
  "version": "v1",
  "corrected_values": {
    // key: calculator id or canonical field
    // value: corrected scalar/string OR { "value": any, "unit": string | null, "notes": string[] }
  },
  "corrections": [ "short what/why lines" ],
  "final_assertions": {
    // decisive labels e.g. "primary_dx", "acid_base", "dka_severity", "hyperosmolar", etc.
  }
}
`;

export function buildVerifyUserContent(payload: {
  mode: string;
  ctx: Record<string, any>;
  computed: Array<any>;
  conversation?: Array<{role: string; content: string}>;
}) {
  return JSON.stringify({
    instruction:
      "Validate & correct. Apply physiology cross-checks: Winter’s expected pCO2 (1.5*HCO3 + 8 ±2), serum osmolality (2*Na + Glucose/18 + BUN/2.8; normal 275–295), osmol gap (measured - calculated; >=10 elevated), albumin-corrected anion gap (AG + 2.5*(4 - Alb[g/dL])), potassium bands, renal flags. Reject ad-hoc metrics (e.g., 'lactate:pH ratio'). qSOFA/SIRS only if required vitals/mentation present. No prose.",
    mode: payload.mode,
    schema: JSON.parse(VERIFY_SCHEMA),
    inputs: payload.ctx,
    calculators: payload.computed,
    conversation: payload.conversation ?? []
  });
}
