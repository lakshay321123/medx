"use client";
import { tfmt, useT } from "@/components/hooks/useI18n";
import { useEffect, useState } from "react";
import { getTrials } from "@/lib/hooks/useTrials";
import { patientTrialsPrompt, clinicianTrialsPrompt } from "@/lib/prompts/trials";
import { askLLM } from "@/lib/llm";
import { hintEligibility } from "@/lib/eligibility";
import type { TrialRow } from "@/types/trials";

export default function TrialsPane() {
  const t = useT();
  const [form, setForm] = useState({
    condition: "",
    status: "Recruiting,Enrolling by invitation",
    phase: "Phase 2,Phase 3",
  });
  const [country, setCountry] = useState<string>("auto");
  const [rows, setRows] = useState<(TrialRow & { hints?: string[] })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ age?: number; sex?: "male"|"female"|"other"; comorbids?: string[] }>({});
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { cache:"no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        const p = j?.profile || {};
        const age = p.dob ? Math.floor((Date.now()-new Date(p.dob).getTime())/(365.25*24*3600*1000)) : undefined;
        setProfile({ age, sex: p.sex, comorbids: p.chronic_conditions || [] });
      }).catch(()=>{});
  }, []);

  async function onSearch() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTrials({
        condition: form.condition,
        country: country === "auto" ? undefined : country,
        status: form.status,
        phase: form.phase,
        page: 1,
        pageSize: 25,
      });
      const enriched = res.rows.map((r:TrialRow)=>({ ...r, hints: hintEligibility(r, profile) }));
      setRows(enriched);
      if (!enriched.length) {
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError(t("Unable to load trials. Please try again."));
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }

  async function summarize(kind:"patient"|"doctor") {
    const prompt = kind === "patient"
      ? patientTrialsPrompt(rows, form.condition)
      : clinicianTrialsPrompt(rows, form.condition);
    await askLLM({ prompt, mode: kind === "patient" ? "patient" : "doctor" });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          className="border rounded p-2"
          placeholder={t("Condition (e.g., Type 2 Diabetes)")}
          value={form.condition}
          onChange={(e) => setForm({ ...form, condition: e.target.value })}
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="auto">{t("Auto")}</option>
          <option value="India">{t("India")}</option>
          <option value="USA">{t("USA")}</option>
          <option value="EU">{t("EU")}</option>
        </select>
        <input
          className="border rounded p-2"
          placeholder={t("Status (e.g., Recruiting,Active)")}
          value={form.status || ""}
          onChange={(e) => setForm({ ...form, status: e.target.value || undefined })}
        />
        <input
          className="border rounded p-2"
          placeholder={t("Phase (e.g., Phase 2,Phase 3)")}
          value={form.phase || ""}
          onChange={(e) => setForm({ ...form, phase: e.target.value || undefined })}
        />
      </div>

      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded bg-black text-white"
          onClick={onSearch}
          disabled={loading}
        >
          {t("Search trials")}
        </button>
        <button
          className="px-3 py-2 rounded border"
          onClick={() => summarize("patient")}
          disabled={!rows.length}
        >
          {t("Summarize (Wellness)")}
        </button>
        <button
          className="px-3 py-2 rounded border"
          onClick={() => summarize("doctor")}
          disabled={!rows.length}
        >
          {t("Summarize (Clinical)")}
        </button>
      </div>

      <div className="text-sm text-gray-500">{t("Informational only; not medical advice. Confirm eligibility with the sponsor.")}</div>

      {loading && (
        <div className="text-sm text-muted-foreground">{t("Loading…")}</div>
      )}

      {error && !loading && (
        <div className="rounded border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {!loading && hasSearched && !error && rows.length === 0 && (
        <div className="rounded border p-3 text-sm text-muted-foreground space-y-2">
          <div>{t("No results")}</div>
          <div className="text-xs">{t("Refine filters")}</div>
          <button
            type="button"
            className="text-xs font-medium text-blue-600 hover:underline"
            onClick={onSearch}
          >
            {t("Retry")}
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((trial: any) => (
            <li key={`${trial.registry}:${trial.registry_id}`} className="rounded border p-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-1.5 py-0.5 rounded border">{trial.registry}</span>
                <a
                  href={trial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  {trial.registry_id}
                </a>
              </div>
              <div className="text-sm mt-1">{trial.title}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {trial.phase && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border">{trial.phase}</span>
                )}
                {trial.status && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border">{trial.status}</span>
                )}
                {trial.when?.updated && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border">
                    {tfmt(t("Updated: {date}"), { date: trial.when.updated.slice(0, 10) })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
