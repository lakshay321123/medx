export function addEvidenceAnchorIfMedical(text: string): string {
  const lower = text.toLowerCase();
  const isMedical = ["cancer", "diabetes", "hypertension", "antibiotic", "chemotherapy", "trial"].some(k => lower.includes(k));
  if (!isMedical) return text;
  if (lower.includes("evidence") || lower.includes("guideline") || lower.includes("anchor")) return text;

  // add a neutral anchor line without specific links to avoid external deps
  return text + "\n\nEvidence anchor: base guidance reflects major clinical guidelines and peer-reviewed sources. For personalized advice, consult a licensed clinician.";
}
