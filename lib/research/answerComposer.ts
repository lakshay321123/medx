import type { TrialsResult, ResearchFilters } from "./orchestrator";

export function buildTrialsTablePayload(r: TrialsResult, limit = 10) {
  const trials = (r.trials ?? []).slice(0, limit);
  return {
    kind: "trials_table" as const,
    columns: [
      { key: "registry",    label: "Trial ID" },
      { key: "phase",       label: "Phase" },
      { key: "condition",   label: "Condition" },
      { key: "intervention",label: "Intervention" },
      { key: "status",      label: "Status" },
      { key: "country",     label: "Country" },
    ],
    rows: trials.map(t => ({
      title: { text: t.title, href: t.url },
      registry: t.registryId || "—",
      phase: t.extra?.phase || "—",
      condition: t.extra?.condition || "—",
      intervention: t.extra?.intervention || "—",
      status: t.extra?.status || "—",
      country: t.extra?.country || "—",
    })),
    meta: { total: r.trials.length },
  };
}

export function composePatientTrialsAnswer(q: string, r: TrialsResult) {
  const picks = (r.trials ?? []).slice(0, 2);
  const bullets = picks.length
    ? picks.map(t => `- [${t.title}](${t.url}) • Phase ${t.extra?.phase || "—"}`).join("\n")
    : "_No matching trials found. Ask me to broaden phase, status, or country._";
  return { text: `Here are a couple of trials you can discuss with your clinician:\n\n${bullets}` };
}

export function composeDoctorTrialsAnswer(q: string, r: TrialsResult, filters?: ResearchFilters) {
  const payload = buildTrialsTablePayload(r, 10);
  (payload as any).filters = filters;
  const mdFallback = `**Trials (top ${Math.min(10, r.trials.length)})**\n` +
    r.trials.slice(0,10).map(t => `- [${t.title}](${t.url}) • ${t.registryId || ""} • Phase ${t.extra?.phase || "—"} • ${t.extra?.status || "—"}`).join("\n");
  return { text: mdFallback, payload };
}

// Legacy helper used by orchestrateResearch
export function composeAnswer(
  q: string,
  trials: any[],
  papers: any[],
  opts: { mode: string },
  filters?: ResearchFilters
) {
  const result: TrialsResult = { trials, papers };
  if (opts.mode === "patient") return composePatientTrialsAnswer(q, result).text;
  return composeDoctorTrialsAnswer(q, result, filters).text;
}
