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

/** Clinician style — terse, operational, SBAR-ish */
export const clinicianStyle = `
Format for a clinician. Be terse and operational. No lay disclaimers, no 911/ambulance language.
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
Format for a general reader. Keep it simple and under ~6 short bullets.
Include these sections (exact labels):
Summary: <what the numbers mean in plain language>
Why this matters: <one brief line; flag if serious>
What to do now: <clear next action; self-care vs see doctor vs ER>
Further tests: <only if helpful; list 2–5 likely next tests>
Safety net: <when to seek urgent/emergency care, if applicable>
Avoid medical jargon; explain terms briefly when needed.
`;

