export type Audience = "clinician" | "patient";

export function detectAudience(mode?: string, hint?: string): Audience {
  const raw = (hint || mode || "").toLowerCase().trim();
  const norm = raw.replace(/[^a-z0-9]/g, "");
  if (raw === "clinician") return "clinician";
  if (raw === "patient") return "patient";
  if (["doctor","doctormode","clinician","research","md"].includes(norm)) return "clinician";
  if (["docai","aidoc","aidocmode","docmode","docreader","patient","patientmode"].includes(norm)) return "patient";
  return "patient";
}

export const clinicianStyle = `
Format for a clinician. Be terse and operational. No lay disclaimers; no 911 language.
DO NOT show formulas or derivations.
HARD LIMITS: at most ${process.env.CLINICIAN_MAX_LINES ?? 12} lines; each line ≤ ${process.env.CLINICIAN_MAX_WORDS_PER_LINE ?? 12} words.
Use these exact single-line sections (in order):
Acuity: <Critical/High/Moderate> | NEWS2 <n> | qSOFA <n>
Key abnormalities: <comma-separated vitals/abnormal values>
Impression: <most likely pathophysiology / top dx cluster>
Immediate steps: <first-hour actions>
MDM (concise): <one-line clinical reasoning; no formulas>   // up to 3 lines allowed
Recommended tests: <ABG/VBG, labs, imaging, scores>
Disposition: <ED resus / ICU consult / ward / clinic / home with safety-net>
Keep each line concise. Avoid narrative paragraphs.
`;

export const patientStyle = `
Format for a general reader. Be clear and brief.
HARD LIMITS: ${process.env.PATIENT_MAX_BULLETS ?? 6} bullets; each ≤ ${process.env.PATIENT_MAX_WORDS_PER_BULLET ?? 18} words.
Include:
Summary: <plain-language meaning>
Why this matters: <one brief line>
What to do now: <clear next action>
Further tests: <2–5 tests>
Safety net: <when to seek urgent care>
`;

export function maxTokensFor(a: Audience): number {
  const P = parseInt(process.env.PATIENT_MAX_TOKENS || "", 10) || 220;
  const C = parseInt(process.env.CLINICIAN_MAX_TOKENS || "", 10) || 220;
  return a === "clinician" ? C : P;
}
