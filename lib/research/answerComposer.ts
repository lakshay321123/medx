import { isSelfDisclosure } from "./queryInterpreter";
import type { TrialsResult, ResearchFilters } from "./orchestrator";

export function buildTrialsTablePayload(r: TrialsResult, limit = 10) {
  const trials = (r.trials || []).slice(0, limit);
  return {
    kind: "trials_table" as const,
    columns: [
      { key: "registry",   label: "Trial ID" },
      { key: "phase",      label: "Phase" },
      { key: "condition",  label: "Condition" },
      { key: "intervention", label: "Intervention" },
      { key: "status",     label: "Status" },
      { key: "country",    label: "Country" },
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
    meta: { total: r.trials.length }
  };
}

export function composePatientAnswer(q: string, r: TrialsResult) {
  const gentle = isSelfDisclosure(q)
    ? "I’m here to help with clear, simple info you can take to your doctor."
    : "Here’s clear, simple information to discuss with a clinician.";
  const picks = (r.trials || []).slice(0, 2);
  const bullets = picks.length
    ? picks.map(t => `- [${t.title}](${t.url}) • Phase ${t.extra?.phase || "—"}`).join("\n")
    : "_No matching trials right now. Ask me to broaden the search (phase, status, or region)._";
  return { text: `${gentle}\n\n**Trials (2 picks)**\n\n${bullets}` };
}

export function composeDoctorAnswer(q: string, r: TrialsResult, filters?: ResearchFilters) {
  const payload = buildTrialsTablePayload(r, 10);
  payload.filters = filters;
  const mdFallback =
`**Trials (top ${Math.min(10, r.trials.length)})**  \n${r.trials.slice(0,10).map(t => `- [${t.title}](${t.url}) • ${t.registryId || ""} • Phase ${t.extra?.phase || "—"} • ${t.extra?.status || "—"}`).join("\n")}

${r.papers?.length ? `**Related publications**\n` + r.papers.slice(0,6).map(p=>`- [${p.title}](${p.url})`).join("\n") : ""}`;
  return { text: mdFallback, payload };
}

// Legacy helper used by orchestrateResearch
export function composeAnswer(
  userQuery: string,
  trials: any[],
  papers: any[],
  opts: { mode: string },
  filters?: ResearchFilters
) {
  const r: TrialsResult = { trials, papers };
  return opts.mode === "patient"
    ? composePatientAnswer(userQuery, r).text
    : composeDoctorAnswer(userQuery, r, filters).text;
}
