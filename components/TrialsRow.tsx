"use client";

import * as React from "react";
import { ExternalLink, FlaskConical } from "lucide-react";

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
  const nct = extractNctId(row.nctId);
  const trialUrl = nct
    ? `https://clinicaltrials.gov/study/${nct}`
    : row.nctId.startsWith("http") ? row.nctId : `https://clinicaltrials.gov/study/${row.nctId}`;

  const [summarizing, setSummarizing] = React.useState(false);

  const onSummarize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nct) return;

    setSummarizing(true);
    pushAssistantToChat("_Summarizing trial\u2026_");
    try {
      const r = await fetch(`/api/trials/${nct}/summary`, { cache: "no-store" });
      const text = await r.text();
      let j: any = null;
      try { j = JSON.parse(text); } catch {}
      if (!r.ok || !j || j.error) throw new Error(j?.error || `HTTP ${r.status}`);
      pushAssistantToChat(formatTrialBriefMarkdown(nct, j));
    } catch (err: any) {
      pushAssistantToChat(`Could not summarize **${nct}**: ${err?.message || "error"}`);
    } finally {
      setSummarizing(false);
    }
  };

  const statusColor = (row.status || "").toLowerCase().includes("recruiting")
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-[var(--so-text-secondary,#8E8E93)]";

  return (
    <a
      href={trialUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4 transition hover:border-[var(--so-accent,#06B6D4)] hover:bg-[rgba(6,182,212,0.02)] group"
    >
      {/* Title + external link */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] leading-snug flex-1">
          {row.title}
        </h3>
        <ExternalLink className="h-4 w-4 shrink-0 text-[var(--so-text-secondary,#8E8E93)] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
      </div>

      {/* Meta row: NCT ID + Phase + Status + Country */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-mono text-[var(--so-accent,#06B6D4)]">{nct || row.nctId}</span>
        {row.phase && (
          <span className="rounded-full bg-[rgba(139,92,246,0.1)] px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
            Phase {row.phase}
          </span>
        )}
        <span className={`font-medium ${statusColor}`}>{row.status || "Unknown"}</span>
        {row.country && (
          <span className="text-[var(--so-text-secondary,#8E8E93)]">{row.country}</span>
        )}
      </div>

      {/* Summarize button */}
      {nct && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onSummarize}
            disabled={summarizing}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] px-3 py-1.5 text-xs font-medium text-[var(--so-accent,#06B6D4)] transition hover:bg-[rgba(6,182,212,0.05)] disabled:opacity-40"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            {summarizing ? "Summarizing\u2026" : "Get Full Summary"}
          </button>
        </div>
      )}
    </a>
  );
}

export type TrialsMobileCardProps = {
  title: string;
  statusLine: string;
  registryLine: string;
  recruitingLabel: string;
  onCopy: () => void;
  onSummarize: () => void;
};

export function TrialsMobileCard({
  title,
  statusLine,
  registryLine,
  recruitingLabel,
  onCopy,
  onSummarize,
}: TrialsMobileCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4 transition hover:border-[var(--so-accent,#06B6D4)]">
      <h3 className="text-sm font-semibold leading-5">{title}</h3>
      <p className="mt-1 text-xs text-[var(--so-text-secondary,#8E8E93)]">{statusLine}</p>
      <p className="text-[11px] text-[var(--so-text-secondary,#8E8E93)]">{registryLine}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          Recruiting: {recruitingLabel}
        </span>
        <button type="button" onClick={onCopy} className="rounded-lg border border-[var(--so-border,#E5E5EA)] px-2 py-0.5 text-[11px]">Copy</button>
        <button type="button" onClick={onSummarize} className="rounded-lg border border-[var(--so-accent,#06B6D4)] px-2 py-0.5 text-[11px] text-[var(--so-accent,#06B6D4)]">Summarize</button>
      </div>
    </div>
  );
}

function formatTrialBriefMarkdown(nctId: string, brief: any) {
  const d = brief.details || {};
  const lines = [
    `### ${nctId} — Clinical Trial Summary`,
    "",
    brief.tldr ? `**Summary:** ${brief.tldr}` : "",
    "",
    d.design ? `**Study Design:** ${d.design}` : "",
    d.population ? `**Target Population:** ${d.population}` : "",
    d.interventions ? `**Interventions:** ${d.interventions}` : "",
    d.primary_outcomes ? `**Primary Outcomes:** ${d.primary_outcomes}` : "",
    d.secondary_outcomes ? `**Secondary Outcomes:** ${d.secondary_outcomes}` : "",
    d.key_eligibility ? `**Eligibility Criteria:** ${d.key_eligibility}` : "",
    d.enrollment ? `**Enrollment:** ${d.enrollment}` : "",
    d.start_date ? `**Start Date:** ${d.start_date}` : "",
    d.completion_date ? `**Expected Completion:** ${d.completion_date}` : "",
    d.sponsor ? `**Sponsor:** ${d.sponsor}` : "",
    "",
    (brief.bullets ?? []).length ? "**Key Points:**" : "",
    ...(brief.bullets ?? []).map((b: string) => `- ${b}`),
    "",
    (brief.citations ?? []).length ? "**References:**" : "",
    ...(brief.citations ?? []).slice(0, 5).map((c: any, i: number) =>
      `${i + 1}. [${c.title || "Source"}](${c.url})`
    ),
    "",
    `[View on ClinicalTrials.gov](https://clinicaltrials.gov/study/${nctId})`,
  ].filter(Boolean);

  return lines.join("\n");
}
