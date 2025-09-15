"use client";

import * as React from "react";

function useIsDoctor() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "doctor";
}

function pushAssistantToChat(content: string) {
  window.dispatchEvent(new CustomEvent("medx:push-assistant", { detail: { content } }));
}

function extractNctId(s: string) {
  return (s || "").toUpperCase().match(/NCT\d{8}/)?.[0] || "";
}

export function TrialsRow({
  row,
}: {
  row: { nctId: string; title: string; phase?: string; status?: string; country?: string };
}) {
  const isDoctor = useIsDoctor();

  const onSummarize = async (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return; // allow new tab
    if (!isDoctor) return; // non-doctors keep default navigation
    e.preventDefault();

    const nct = extractNctId(row.nctId);
    if (!nct) {
      pushAssistantToChat(`⚠️ Could not summarize: invalid Registry ID`);
      return;
    }

    pushAssistantToChat("_Summarizing trial…_");
    try {
      const r = await fetch(`/api/trials/${nct}/summary`, { cache: "no-store" });
      const text = await r.text();
      let j: any = null;
      try { j = JSON.parse(text); } catch {}
      if (!r.ok || !j || j.error) throw new Error(j?.error || `HTTP ${r.status}`);

      const md = formatTrialBriefMarkdown(nct, j);
      pushAssistantToChat(md);
    } catch (err: any) {
      pushAssistantToChat(`⚠️ Could not summarize **${nct}**: ${err?.message || "error"}`);
    }
  };

  return (
    <tr>
      <td className="whitespace-nowrap">
        <a
          href={`https://clinicaltrials.gov/study/${row.nctId}`}
          onClick={onSummarize}
          className={isDoctor ? "underline decoration-dotted hover:decoration-solid" : "underline"}
        >
          {row.nctId}
        </a>
      </td>
      <td>{row.title}</td>
      <td>{row.phase || "—"}</td>
      <td>{row.status || "—"}</td>
      <td>{row.country || "—"}</td>
    </tr>
  );
}

function formatTrialBriefMarkdown(nctId: string, brief: any) {
  const bullets = (brief.bullets ?? []).slice(0, 3).map((b: string) => `- ${b}`).join("\n");
  const cite = (brief.citations ?? [])
    .slice(0, 5)
    .map((c: any, i: number) => `[${i + 1}] ${c.title || new URL(c.url).hostname} — ${c.url}`)
    .join("\n");

  const d = brief.details || {};
  const lines = [
    d.design && `**Design:** ${d.design}`,
    d.population && `**Population:** ${d.population}`,
    d.interventions && `**Interventions:** ${d.interventions}`,
    d.primary_outcomes && `**Primary outcomes:** ${d.primary_outcomes}`,
    d.key_eligibility && `**Key eligibility:** ${d.key_eligibility}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `### ${nctId} — Doctor Brief`,
    brief.tldr ? `**TL;DR:** ${brief.tldr}` : "",
    bullets,
    lines,
    cite ? `\n**Sources**\n${cite}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
