export type FollowupIntent = "medicines" | "hospitals" | "trials" | "vaccines" | null;

export function detectFollowupIntent(text: string): FollowupIntent {
  const q = text.toLowerCase();
  if (/\b(medicine|medicines|drugs|treatment|best meds|best medicine)\b/.test(q)) return "medicines";
  if (/\b(hospital|hospitals|top hospitals|centre|center|clinic)\b/.test(q)) return "hospitals";
  if (/\b(vaccine|vaccination|immunization|immunisation|shot|jab|flu shot|booster)\b/.test(q)) return "vaccines";
  if (/\b(latest|newest).*(trial|trials|study|studies|research)|\bclinical trial(s)?\b/.test(q)) return "trials";
  return null;
}

export type Mode = "patient" | "doctor";

/** Simple stem detection → returns an extra structure block for the system prompt. */
export function getIntentStyle(userText: string, mode: Mode): string {
  const s = (userText || "").trim().toLowerCase();

  const has = (re: RegExp) => re.test(s);

  // Common stems
  const isWhatIs   = has(/\b(what\s+is|explain|define)\b/);
  const isTypes    = has(/\btypes?\b/);
  const isSymptoms = has(/\bsymptoms?\b/);
  const isCauses   = has(/\b(why|cause|causes)\b/);
  const isRedFlags = has(/\b(red\s*flags?|when\s+should\s+i\s+see\s+(a\s+)?doctor|er|emergency)\b/);
  const isWorkup   = has(/\b(work[\s-]*up|initial\s+(work\s*up|assessment|evaluation)|tests?|diagnos(e|is))\b/);
  const isTx       = has(/\b(treatment|manage|management|therapy|medication|medications?)\b/);
  const isHomeCare = has(/\b(home\s*care|self\s*care|at\s*home|remedy|remedies)\b/);
  const isImaging  = has(/\b(imaging|x-?ray|ct|mri|ultrasound|do\s+i\s+need\s+imaging)\b/);

  if (mode === "patient") {
    if (isWhatIs || isTypes) {
      return [
        "STRUCTURE (intent):",
        "## **What it is**",
        "## **Types**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isSymptoms) {
      return [
        "STRUCTURE (intent):",
        "## **Common symptoms**",
        "## **When to see a doctor (red flags)**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isCauses) {
      return [
        "STRUCTURE (intent):",
        "## **Why it happens (common causes)**",
        "## **Less common/serious causes**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isHomeCare) {
      return [
        "STRUCTURE (intent):",
        "## **At-home care**",
        "## **When to stop home care and seek help**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isImaging) {
      return [
        "STRUCTURE (intent):",
        "## **Do I need imaging?**",
        "## **When imaging is useful vs not needed**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isTx) {
      return [
        "STRUCTURE (intent):",
        "## **First-line options**",
        "## **If symptoms persist/worsen**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isWorkup || isRedFlags) {
      return [
        "STRUCTURE (intent):",
        "## **What to check** (simple steps/tests)",
        "## **Red flags — when to seek urgent care**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
  } else {
    // doctor
    if (isWhatIs) {
      return [
        "STRUCTURE (intent, clinical):",
        "## **Definition (clinical)**",
        "## **Phenotypes**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isWorkup) {
      return [
        "STRUCTURE (intent, clinical):",
        "## **Initial work-up** (H&P, labs, imaging)",
        "## **When to image / stewardship**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isRedFlags) {
      return [
        "STRUCTURE (intent, clinical):",
        "## **Red flags**",
        "## **Immediate actions / escalation**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isTx) {
      return [
        "STRUCTURE (intent, clinical):",
        "## **First-line management**",
        "## **Step-up / referral**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isSymptoms) {
      return [
        "STRUCTURE (intent, clinical):",
        "## **Key historical features**",
        "## **Focused exam maneuvers**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
    if (isImaging) {
      return [
        "STRUCTURE (intent, clinical):",
        "## **Imaging choice (indications)**",
        "## **Avoid imaging when …**",
        "Finish with one short follow-up question (≤10 words)."
      ].join("\n");
    }
  }
  return ""; // no extra structure
}
