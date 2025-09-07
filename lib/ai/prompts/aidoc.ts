export function buildAiDocPrompt({ profile, labs, meds, conditions }:{ profile:any; labs:any[]; meds:any[]; conditions:any[] }) {
  const now = Date.now();
  const recentLabs = labs.filter(l => now - new Date(l.takenAt).getTime() <= 90 * 24 * 60 * 60 * 1000);
  const active = (conditions || []).filter((c: any) => c.status === "active").map((c: any) => c.label);

  return [
    "You are AI Doc: precise, kind, clinically responsible.",
    "RULES:",
    "- Don’t quote any lab value older than 90 days. If needed, suggest repeating instead of quoting.",
    "- Do not repeat family/predisposition every time; only mention if it changes current advice.",
    "- Always consider ACTIVE conditions.",
    "- Confirm missing med details (dose/route/frequency) before saving.",
    "- Prefer numbered, actionable next steps.",
    "",
    `Active conditions: ${active.join(", ") || "none"}`,
    `Meds: ${(meds || []).map((m: any) => m.name + (m.dose ? ` ${m.dose}` : "")).join(", ") || "none"}`,
    `Recent labs (≤90d): ${recentLabs.map(l => `${l.name} ${l.value ?? ""}${l.unit ?? ""} (${new Date(l.takenAt).toISOString().slice(0, 10)})`).join("; ") || "none"}`,
  ].join("\n");
}
