export type Audience = "clinician" | "patient";

/**
 * Map your app modes to output audience:
 * - "doctor" -> clinician
 * - "doc ai"/"aidoc"/"doc_ai"/"doc-mode" -> patient explainer
 * - "patient"/"patient mode" -> patient explainer
 * Default -> patient explainer
 */
export function detectAudience(mode?: string, hint?: string): Audience {
  const raw = (hint || mode || "").toLowerCase().trim();
  const norm = raw.replace(/[^a-z0-9]/g, ""); // e.g., "doc ai" -> "docai"

  // Explicit hints win
  if (raw === "clinician") return "clinician";
  if (raw === "patient") return "patient";

  // Doctor-only, clinician-facing
  if (["doctor", "doctormode", "clinician", "research", "md"].includes(norm)) return "clinician";

  // Doc AI / Patient modes -> patient-facing explainer
  if (["docai", "aidoc", "aidocmode", "docmode", "docreader", "patient", "patientmode"].includes(norm)) {
    return "patient";
  }

  return "patient";
}

// Heuristics: does the last user message look like a labs/vitals calc request?
export function needsClinicalInterpretation(messages: any[]): boolean {
  const last = messages.slice().reverse().find((m: any) => m.role === "user")?.content || "";
  const text = last.toLowerCase();
  if (/anion gap|delta gap|osmol|corrected (na|sodium)|winter\b/.test(text)) return true;
  if (/(na|k|cl|hco3|pco2|ph|lactate|bun|creatinine|glucose)[^\d]*\d/.test(text)) return true;
  return false;
}

/** Clinician interpretation style — detailed acid-base & management scaffold */
export const clinicianInterpretationStyle = `
MedX — Doctor Mode: Clinical Interpretation (Strict)
Audience: Clinician. Tone: terse, operational. No disclaimers or patient language.
HARD LIMITS: total ≤ ${process.env.CLINICIAN_MAX_TOKENS ?? 220} tokens; bullets/lines ≤ ${process.env.DOCTOR_MAX_WORDS_PER_LINE ?? 18} words; MDM ≤ ${process.env.DOCTOR_MDM_MAX_LINES ?? 3} lines.
Sections in order (labels must match exactly):
Calculations (checked)
Single-line bullets: formula → numbers → value. Include AG, ΔAG, ΔHCO₃, Δ/Δ, corrected HCO₃, corrected Na (Katz & Hillier), calculated/effective osmolality & gap, Winter’s pCO₂ vs actual (note compensation). No derivations outside this section.
Acid–base interpretation (concise)
2–3 bullets. Name all primary and concurrent disorders.
Unifying causes (precise)
3–5 bullets linking abnormalities to etiologies.
Initial management — exact order
Numbered list, 6–10 items: start with ABCs/monitor/IV; ECG/hyperK steps; fluids; K⁺ strategy; insulin plan; labs cadence; source control/abx; toxin workup if osmol gap; bicarbonate criteria; level of care.
MDM (concise)
Up to ${process.env.DOCTOR_MDM_MAX_LINES ?? 3} lines. One sentence each. Synthesize risk and next steps. No formulas.
No narrative paragraphs. No patient instructions.
`;

/** Clinician style — terse, operational, SBAR-ish */
export const clinicianStyle = `
Format for a clinician. Be terse and operational. No lay disclaimers, no 911/ambulance language.
HARD LIMITS: at most ${process.env.CLINICIAN_MAX_LINES ?? 6} lines; each line ≤ ${process.env.CLINICIAN_MAX_WORDS_PER_LINE ?? 14} words. No extra lines.
Use these exact single-line sections (in order):
Acuity: <Critical/High/Moderate> | NEWS2 <n> | qSOFA <n>
Key abnormalities: <comma-separated vitals/abnormal values>
Impression: <most likely pathophysiology / top dx cluster>
Immediate steps: <first-hour actions: O2/IV/fluids/antibiotics etc.>
Recommended tests: <ABG/VBG, labs, imaging, scores>
Disposition: <ED resus / ICU consult / ward / clinic / home with safety-net>
Keep each line concise. Avoid narrative paragraphs.
`;

/** Patient/Doc-AI style — simple explainer + “Further tests” */
export const patientStyle = `
Format for a general reader. Use plain language.
HARD LIMITS: at most ${process.env.PATIENT_MAX_BULLETS ?? 6} bullets; each bullet ≤ ${process.env.PATIENT_MAX_WORDS_PER_BULLET ?? 18} words. No extra bullets.
Include these sections (exact labels, in this order):
Summary: <what the numbers/symptoms mean in simple words>
Why this matters: <one line on risk/seriousness>
What to do now: <clear next step: home care / clinic today / ER now>
Further tests: <2–5 tests the clinician will likely order>
What to expect: <brief care steps or monitoring, optional>
Safety net: <when to seek urgent/emergency care>
Use plain language; briefly explain terms. No step-by-step math. One short sentence per bullet; prefer "Now/Next/If" phrasing.
`;

export function maxTokensFor(audience: Audience): number {
  const p = parseInt(process.env.PATIENT_MAX_TOKENS || "", 10) || 220;
  const c = parseInt(process.env.CLINICIAN_MAX_TOKENS || "", 10) || 220;
  return audience === "clinician" ? c : p;
}

