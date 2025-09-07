import type { Citation, TrialsResult, ResearchFilters } from "./orchestrator";
import { isSelfDisclosure } from "@/lib/research/queryInterpreter";

function summarize(filters?: ResearchFilters) {
  if (!filters) return "";
  const parts: string[] = [];
  if (filters.phase) parts.push(`Phase ${filters.phase}`);
  if (filters.status && filters.status !== "any") {
    const map: any = {
      recruiting: "Recruiting",
      active: "Active, not recruiting",
      completed: "Completed",
    };
    parts.push(map[filters.status] || filters.status);
  }
  if (filters.countries?.length) parts.push(filters.countries.join("/") );
  if (filters.genes?.length) parts.push(filters.genes.join(", "));
  return parts.length ? `Filters: ${parts.join(" · ")}` : "";
}

export function composeTrialsAnswer(userQuery: string, trials: Citation[], papers: Citation[], filters?: ResearchFilters) {
  const header = `Here are the most relevant **clinical trials** for: **${userQuery}**`;
  const filterLine = summarize(filters);
  const tableHead = "| Trial (Registry) | Phase | Status | Last Update |\n|---|---|---|---|";
  const rows = trials.slice(0, 8).map(t => {
    const title = sanitize(t.title);
    const id = t.id || "—";
    const phase = (t.extra?.phase || "").replace(/phase\s*/i, "Phase ").trim() || "—";
    const status = t.extra?.status || "—";
    const date = t.date || "—";
    return `| [${title}](${t.url}) (${id}) | ${phase} | ${status} | ${date} |`;
  });

  const trialsBlock = rows.length ? [tableHead, ...rows].join("\n") : "";

  const pubBlock = (papers || [])
    .slice(0, 3)
    .map(p => `- ${sanitize(p.title)} (${p.date || "—"}) — ${p.url}`)
    .join("\n");

  const parts = [header];
  if (filterLine) parts.push(filterLine);
  if (trialsBlock) parts.push("", trialsBlock);
  if (pubBlock) parts.push("\n**Related publications:**\n" + pubBlock);

  return parts.join("\n");
}

export function composeAnswer(
  userQuery: string,
  trials: any[],
  papers: any[],
  opts: { mode: string },
  filters?: ResearchFilters
) {
  const selfDisclosure = isSelfDisclosure(userQuery);

  if (opts.mode === "patient") {
    const intro = selfDisclosure
      ? "I’m sorry to hear about your diagnosis. Here’s clear, simple information you can take to your doctor."
      : "Here’s clear, simple information about this condition and possible trials you may want to discuss with your doctor.";

    const filterLine = summarize(filters);
    const trialsBlock = trials
      .slice(0, 2)
      .map((t) => `- [${t.title}](${t.url}) (Phase ${t.extra?.phase || "?"})`)
      .join("\n");

    return [
      intro,
      filterLine,
      trialsBlock ||
        "I couldn’t find active trials right now. You can check [ClinicalTrials.gov](https://clinicaltrials.gov) for the latest.",
      "**Resources:** American Cancer Society, National Cancer Institute",
    ].filter(Boolean).join("\n\n");
  }

  // Research or Doctor mode → keep full detail
  return composeTrialsAnswer(userQuery, trials, papers, filters);
}

function sanitize(s?: string){
  return (s || "").replace(/\|/g, "\\|").trim();
}

export function buildTrialsTablePayload(r: TrialsResult, limit = 10) {
  const trials = (r.trials ?? []).slice(0, limit);
  return {
    kind: "trials_table" as const,
    columns: [
      { key: "registry", label: "Trial ID" },
      { key: "phase", label: "Phase" },
      { key: "condition", label: "Condition" },
      { key: "intervention", label: "Intervention" },
      { key: "status", label: "Status" },
      { key: "country", label: "Country" },
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
  const mdFallback =
    `**Trials (top ${Math.min(10, r.trials.length)})**\n` +
    r.trials
      .slice(0, 10)
      .map(t =>
        `- [${t.title}](${t.url}) • ${t.registryId || ""} • Phase ${t.extra?.phase || "—"} • ${t.extra?.status || "—"}`
      )
      .join("\n");
  return { text: mdFallback, payload };
}
