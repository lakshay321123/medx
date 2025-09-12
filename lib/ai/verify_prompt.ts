// lib/ai/verify_prompt.ts

export const VERIFY_SYSTEM = `
You are OpenAI GPT-5 acting as the final clinical calculator and verifier.
Return STRICT JSON (no prose in the outer channel). Compute using ONLY standard formulas:
- Anion gap (AG) = Na − (Cl + HCO3)   [do not include K]
- Albumin-corrected AG = AG + 2.5 × (4 − albumin g/dL)   (if albumin provided)
- Serum osmolality = 2×Na + Glucose/18 + BUN/2.8         [do not include creatinine]
- Effective osmolality = 2×Na + Glucose/18
- Osmolar gap = measured_osm − calculated_osm            (if measured provided)
- Winter’s expected pCO2 = 1.5×HCO3 + 8   (±2 adequate compensation band)
- DKA requires glucose ≥ 250 mg/dL plus acidosis (HCO3 ≤ 18 or pH < 7.30)
- HHS threshold: effective osmolality ≥ 320 mOsm/kg or measured ≥ 320

Inputs may use aliases; treat these as the same:
Glucose ≡ glucose_mgdl ≡ glucose_mg_dl ≡ glu
HCO3 ≡ bicarb ≡ bicarbonate
pCO2 ≡ PaCO2 ≡ pco2
Osm_measured ≡ measured_osm ≡ measured_osmolality ≡ osmolality
Na ≡ sodium, K ≡ potassium, Cl ≡ chloride, Cr ≡ creatinine, Alb ≡ albumin

Rules:
- If required inputs are missing, omit only that metric and record what is missing in "warnings".
- Do not invent non-standard metrics (e.g., lactate to pH ratio).
- Risk scores (qSOFA, SIRS, NEWS2, CURB-65) must be omitted unless all required vitals are present.
- If calculator hints conflict with physiology, correct them and record the correction in "corrections".

final_text style:
- Friendly, natural, and concise.
- In patient mode: plain language with brief, supportive tone.
- In doctor/research mode: professional, tight, bullet-first, with key numbers shown.
- No “verification” badges or meta talk; just the clinical summary.
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
  corrections?: string[];
  warnings?: string[];
  final_text: string;         // mandatory
};

export function buildVerifyUserContent(payload: {
  mode?: string;
  ctx: Record<string, any>;
  computed?: Array<any>;
  conversation?: Array<{role: string; content: string}>;
}) {
  return JSON.stringify({
    instruction: "Compute and verify per VERIFY_SYSTEM. Return strict JSON matching keys in example_template. Omit any metric you cannot justify; still produce 'final_text' with what is known.",
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
      final_text: "Clinical summary:\n• Labs: {values}\n• Derived: {values}\n• Interpretation: {summary}"
    },
    mode: payload.mode || "default",
    inputs: payload.ctx || {},
    calculators_first_pass: payload.computed || [],
    conversation: payload.conversation || []
  });
}
