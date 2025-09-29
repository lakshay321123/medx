"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";

import TrialsTable from "@/components/TrialsTable";
import { TrialsMobileCard } from "./TrialsRow";
import { sendMessage } from "@/lib/chat/sendMessage";
import { fromSearchParams } from "@/lib/modes/url";
import type { TrialRow } from "@/types/trials";
import { useT } from "@/components/hooks/useI18n";

const MOBILE_MAX_WIDTH = 480;

function useIsMobile(maxWidth = MOBILE_MAX_WIDTH) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);

    const update = () => setIsMobile(query.matches);
    update();

    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handler);
      return () => query.removeEventListener("change", handler);
    }

    query.addListener(handler);
    return () => query.removeListener(handler);
  }, [maxWidth]);

  return isMobile;
}

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
  if (trial.status) {
    const status = trial.status.toLowerCase().trim();

    if (
      status.includes("not recruiting") ||
      status.includes("no longer recruiting") ||
      status.includes("active, not recruiting")
    ) {
      return "No";
    }

    if (status.startsWith("recruit") || status === "recruiting") {
      return "Yes";
    }

    return trial.status;
  }
  return "Unknown";
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
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const t = useT();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const searchParamsString = searchParams.toString();
  const modeState = useMemo(
    () => fromSearchParams(new URLSearchParams(searchParamsString), theme),
    [searchParamsString, theme],
  );
  const mode = modeState.base === "doctor" ? "clinical" : modeState.base === "aidoc" ? "aidoc" : "wellness";
  const researchEnabled = Boolean(modeState.research);
  const isMobile = useIsMobile();
  const mobileContrast = isMobile && mode === "clinical" && researchEnabled && theme === "light";

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
              {t("Export")}
            </button>
          </div>
          <TrialsTable rows={trials} />
        </div>
      </section>

      <section className="md:hidden px-3 pb-[96px]">
        <div
          className="results-list grid gap-3"
          data-mobile-contrast={mobileContrast ? "on" : undefined}
        >
          {trials.map(trial => {
            const registryId = getRegistryId(trial);
            const registryLabel = getRegistryLabel(trial.source);
            const countries = getCountries(trial);
            const recruiting = getRecruitingLabel(trial);
            const phase = trial.phase || "—";
            const status = trial.status || "—";
            const countriesLabel = countries.length ? countries.join(", ") : "—";
            const statusLine = `${t("Status")}: ${status} • ${t("Phase")}: ${phase} • ${t("Country")}: ${countriesLabel}`;
            const registryLine = `${registryId} • ${t("Registry")}: ${registryLabel}`;

            return (
              <TrialsMobileCard
                key={`${trial.source || "src"}:${trial.id || trial.url}`}
                title={trial.title}
                statusLine={statusLine}
                registryLine={registryLine}
                recruitingLabel={recruiting}
                onCopy={() => copyTrial(trial)}
                onSummarize={() => summarizeTrialIntoChat(trial)}
              />
            );
          })}
        </div>
      </section>
    </>
  );
}
