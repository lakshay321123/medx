export type MedxMode = "doctor" | "patient" | "research" | "therapy" | "doc_ai";

export function normalizeMode(input?: string): MedxMode {
  const m = (input || "").toLowerCase().trim();
  if (m.includes("doctor")) return "doctor";
  if (m.includes("research")) return "research";
  if (m.includes("therapy")) return "therapy";
  if (m.includes("doc")) return "doc_ai";
  return "patient";
}
