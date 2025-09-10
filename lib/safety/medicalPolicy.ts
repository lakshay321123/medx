export function applyMedicalPolicy(text: string, opts: { requiresPrescription?: boolean } = {}) {
  const pre = "General information only — not a diagnosis or treatment plan.";
  const rx = opts.requiresPrescription ? " This medicine requires a valid prescription in your region." : "";
  const post = "Always consult a licensed clinician for personal advice.";
  return `${pre}${rx}\n\n${text}\n\n${post}`;
}
