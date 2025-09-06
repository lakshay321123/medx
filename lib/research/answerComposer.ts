import { isSelfDisclosure } from "@/lib/research/queryInterpreter";

// Add this helper: shape trials into a structured payload
export function buildTrialsTablePayload(trials: any[]) {
  // Keep columns stable and minimal for now
  return {
    kind: "trials_table",
    columns: [
      { key: "title", label: "Trial" },
      { key: "phase", label: "Phase" },
      { key: "status", label: "Status" },
      { key: "registry", label: "Registry" },
      { key: "country", label: "Locations" }
    ],
    rows: trials.map(t => ({
      title: { text: t.title, href: t.url },
      phase: t.extra?.phase || "—",
      status: t.extra?.status || "—",
      registry: t.extra?.registryId || "—",     // e.g. NCT01234567
      country: t.extra?.country || t.extra?.location || "—"
    }))
  };
}

// Research / Doctor → return both: structured + markdown fallback
export function composeTrialsAnswer(userQuery: string, trials: any[], papers: any[], opts?: { mode: string }) {
  const payload = buildTrialsTablePayload(trials.slice(0, 8));

  const mdFallback = [
    "### Trials",
    trials.slice(0, 8).map(t =>
      `- [${t.title}](${t.url}) • Phase ${t.extra?.phase || "—"} • ${t.extra?.status || "—"} • ${t.extra?.registryId || ""}`
    ).join("\n"),
    papers.length ? "\n### Related publications\n" + papers.slice(0,6).map(p => `- [${p.title}](${p.url})`).join("\n") : ""
  ].join("\n");

  return { text: mdFallback, payload };
}

export function composeAnswer(userQuery: string, trials: any[], papers: any[], opts: { mode: string }) {
  const selfDisclosure = isSelfDisclosure(userQuery);

  if (opts.mode === "patient") {
    const intro = selfDisclosure
      ? "I’m sorry to hear about your diagnosis. Here’s clear, simple information you can take to your doctor."
      : "Here’s clear, simple information about this condition and potential trials to discuss with your doctor.";

    const concise = trials.slice(0, 2).map(t =>
      `- [${t.title}](${t.url}) • Phase ${t.extra?.phase || "—"}`
    ).join("\n");

    return { text: [intro, "#### Trials (2 picks)", concise || "_No active trials found._"].join("\n\n") };
  }

  // Research / Doctor
  return composeTrialsAnswer(userQuery, trials, papers, opts);
}
