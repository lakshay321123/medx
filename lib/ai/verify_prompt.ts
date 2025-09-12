// lib/ai/verify_prompt.ts

export const VERIFY_SYSTEM = `
You are OpenAI GPT-5 acting as the *final clinical calculator and verifier*.
Return STRICT JSON (no prose). Compute from inputs using ONLY standard formulas:
- Anion gap (AG) = Na − (Cl + HCO3)   [no K]
- Albumin-corrected AG = AG + 2.5 × (4 − albumin[g/dL])   (if albumin provided)
- Serum osmolality = 2×Na + Glucose/18 + BUN/2.8          [do NOT include creatinine]
- Effective osmolality = 2×Na + Glucose/18
- Osmolar gap = measured_osm − calculated_osm             (if measured provided)
- Winter’s expected pCO2 = 1.5×HCO3 + 8   (±2 for adequate compensation)
- DKA requires glucose ≥ 250 mg/dL plus acidosis (HCO3 ≤ 18 or pH < 7.30)
- HHS threshold: effective osmolality ≥ 320 mOsm/kg or measured ≥ 320

Rules:
- If required inputs are missing, omit that metric.
- Do NOT invent ad-hoc metrics (e.g., lactate:pH ratio).
- Risk scores (qSOFA/SIRS/NEWS2/CURB-65) MUST be omitted unless all required vitals are present.
- If upstream “calculator” hints conflict with physiology, correct them and state the correction in "corrections".
- Produce a concise human-readable "final_text" summary that exactly reflects your computed values.
`;

export type Verdict = {
  ok: boolean;
  version: string;            // "v2"
  corrected_values?: Record<string, any>;
  derived?: {
    anion_gap?: number;
    ag_corrected?: number;
    serum_osm?: number;
    effective_osm?: number;
    osm_gap?: number;
    winters_expected_pco2?: number;
    respiratory_comment?: string;
    acid_base_summary?: string;
    dka_flag?: string;
    hhs_flag?: string;
    sodium_flag?: string;
    potassium_flag?: string;
  };
  corrections?: string[];     // short what/why lines
  warnings?: string[];        // missing inputs etc.
  final_text?: string;        // ready-to-display summary for the user
};

export function buildVerifyUserContent(payload: {
  mode?: string;
  ctx: Record<string, any>;
  computed?: Array<any>;
  conversation?: Array<{role: string; content: string}>;
}) {
  return JSON.stringify({
    instruction: "Compute and verify per VERIFY_SYSTEM. Return strict JSON matching keys in the example_template; omit unknowns.",
    example_template: {
      ok: true,
      version: "v2",
      corrected_values: {},
      derived: {
        anion_gap: 0,
        ag_corrected: 0,
        serum_osm: 0,
        effective_osm: 0,
        osm_gap: 0,
        winters_expected_pco2: 0,
        respiratory_comment: "",
        acid_base_summary: "",
        dka_flag: "",
        hhs_flag: "",
        sodium_flag: "",
        potassium_flag: ""
      },
      corrections: [],
      warnings: [],
      final_text: "Clinical summary (verified):\\n- Labs: {values}\\n- Derived: {values}\\n- Interpretation: {summary}\\nRules applied: standard formulas."
    },
    mode: payload.mode || "default",
    inputs: payload.ctx || {},
    calculators_first_pass: payload.computed || [],
    conversation: payload.conversation || []
  });
}
