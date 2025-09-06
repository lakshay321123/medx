export function classifyPubType(types: string[] = []): string {
  const t = types.map(x => x.toLowerCase()).join(" ");
  if (t.includes("meta")) return "Meta-Analysis";
  if (t.includes("review")) return "Review";
  if (t.includes("clinical trial")) return "Clinical Study";
  return "Research Article";
}

export function normalizePhase(p: string = ""): string {
  const phase = p.toLowerCase();
  if (phase.includes("phase 1") || phase.includes("phase i")) return "Phase I";
  if (phase.includes("phase 2") || phase.includes("phase ii")) return "Phase II";
  if (phase.includes("phase 3") || phase.includes("phase iii")) return "Phase III";
  if (phase.includes("phase 4") || phase.includes("phase iv")) return "Phase IV";
  if (phase.includes("not applicable")) return "Observational";
  return p ? p : "Clinical Trial";
}
