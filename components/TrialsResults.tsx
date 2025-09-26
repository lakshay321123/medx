"use client";

import TrialsTable from "@/components/TrialsTable";
import { sendMessage } from "@/lib/chat/sendMessage";
import type { TrialRow } from "@/types/trials";

function getRegistryLabel(source?: string) {
  switch (source) {
    case "CTgov":
      return "ClinicalTrials.gov";
    case "EUCTR":
      return "EudraCT";
    case "CTRI":
      return "CTRI";
    case "ISRCTN":
      return "ISRCTN";
    default:
      return source || "ClinicalTrials.gov";
  }
}

function getRegistryId(trial: TrialRow) {
  if (trial.id) return trial.id.toUpperCase();
  if (trial.url) {
    const parts = trial.url.split("/").filter(Boolean);
    return parts[parts.length - 1]?.toUpperCase() || trial.url;
  }
  return "—";
}

function getCountries(trial: TrialRow): string[] {
  const fromLocations = Array.isArray(trial.locations)
    ? trial.locations
        .map(loc => loc?.country)
        .filter((country): country is string => Boolean(country))
    : [];
  const values = fromLocations.length ? fromLocations : trial.country ? [trial.country] : [];
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

function getRecruitingLabel(trial: TrialRow) {
  if (Array.isArray(trial.locations) && trial.locations.length > 0) {
    return String(trial.locations.length);
  }
  if (trial.status && /recruit/i.test(trial.status)) {
    return "Yes";
  }
  if (trial.status) {
    return "No";
  }
  return "—";
}

function copyTrial(trial: TrialRow) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
  const registryId = getRegistryId(trial);
  const pieces = [trial.title, registryId];
  if (trial.url) pieces.push(trial.url);
  const text = pieces.filter(Boolean).join(" — ");
  navigator.clipboard.writeText(text).catch(() => {});
}

function summarizeTrialIntoChat(trial: TrialRow) {
  const registryId = getRegistryId(trial);
  const countries = getCountries(trial);
  const status = trial.status || "—";
  const phase = trial.phase || "—";
  const label = registryId.startsWith("NCT") ? "NCT" : "Registry ID";
  const lines = [
    "Summarize this clinical trial for a clinician:",
    `• ${label}: ${registryId}`,
    `• Title: ${trial.title}`,
    `• Status/Phase: ${status} / Phase ${phase}`,
    `• Countries: ${countries.length ? countries.join(", ") : "—"}`,
    trial.url ? `• Registry: ${trial.url}` : "",
  ].filter(Boolean);
  sendMessage(lines.join("\n"));
}

async function exportTrials(rows: TrialRow[]) {
  try {
    const res = await fetch("/api/trials/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trials.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export trials failed", err);
  }
}

export default function TrialsResults({ trials }: { trials: TrialRow[] }) {
  if (!trials || trials.length === 0) return null;

  return (
    <>
      <section className="hidden md:block">
        <div className="rounded-xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="mb-2 flex justify-end">
            <button
              onClick={() => exportTrials(trials)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Export CSV
            </button>
          </div>
          <TrialsTable rows={trials} />
        </div>
      </section>

      <section className="md:hidden grid gap-3 px-3 pb-[96px]">
        {trials.map(trial => {
          const registryId = getRegistryId(trial);
          const registryLabel = getRegistryLabel(trial.source);
          const countries = getCountries(trial);
          const recruiting = getRecruitingLabel(trial);
          const phase = trial.phase || "—";
          const status = trial.status || "—";

          return (
            <article
              key={`${trial.source || "src"}:${trial.id || trial.url}`}
              className="rounded-2xl border border-white/10 bg-white/[.06] p-4"
            >
              <h3 className="text-[15px] font-semibold leading-5 text-white break-words hyphens-auto">
                {trial.title}
              </h3>

              <p className="mt-1 text-[12.5px] text-white/80">
                {status} • Phase {phase} • {countries.length ? countries.join(", ") : "—"}
              </p>

              <p className="text-[11px] text-white/60">
                {registryId} • {registryLabel}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" className="chip-sm">
                  Recruiting: {recruiting}
                </button>
                <button type="button" className="chip-sm" onClick={() => copyTrial(trial)}>
                  Copy
                </button>
                <button type="button" className="chip-sm" onClick={() => summarizeTrialIntoChat(trial)}>
                  Summarize
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
