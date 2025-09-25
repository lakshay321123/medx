"use client";
import { useEffect, useState } from "react";
import { getTrials } from "@/lib/hooks/useTrials";
import { patientTrialsPrompt, clinicianTrialsPrompt } from "@/lib/prompts/trials";
import { askLLM } from "@/lib/llm";
import { hintEligibility } from "@/lib/eligibility";
import type { TrialRow } from "@/types/trials";

export default function TrialsPane() {
  const [form, setForm] = useState({
    condition: "",
    status: "Recruiting,Enrolling by invitation",
    phase: "Phase 2,Phase 3",
  });
  const [country, setCountry] = useState<string>("auto");
  const [rows, setRows] = useState<(TrialRow & { hints?: string[] })[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ age?: number; sex?: "male"|"female"|"other"; comorbids?: string[] }>({});

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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  async function summarize(kind:"patient"|"doctor") {
    const prompt = kind === "patient"
      ? patientTrialsPrompt(rows, form.condition)
      : clinicianTrialsPrompt(rows, form.condition);
    await askLLM({ prompt, mode: kind === "patient" ? "patient" : "doctor" });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className="w-full rounded border p-2 text-sm"
          placeholder="Condition (e.g., Type 2 Diabetes)"
          value={form.condition}
          onChange={(e) => setForm({ ...form, condition: e.target.value })}
        />
        <select
          className="w-full rounded border px-2 py-2 text-sm"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="auto">Auto</option>
          <option value="India">India</option>
          <option value="USA">USA</option>
          <option value="EU">EU</option>
        </select>
        <input
          className="w-full rounded border p-2 text-sm"
          placeholder="Status (e.g., Recruiting,Active)"
          value={form.status || ""}
          onChange={(e) => setForm({ ...form, status: e.target.value || undefined })}
        />
        <input
          className="w-full rounded border p-2 text-sm"
          placeholder="Phase (e.g., Phase 2,Phase 3)"
          value={form.phase || ""}
          onChange={(e) => setForm({ ...form, phase: e.target.value || undefined })}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white sm:w-auto"
          onClick={onSearch}
          disabled={loading}
        >
          Search trials
        </button>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            className="w-full rounded border px-4 py-2 text-sm font-medium sm:w-auto"
            onClick={() => summarize("patient")}
            disabled={!rows.length}
          >
            Summarize (Wellness)
          </button>
          <button
            className="w-full rounded border px-4 py-2 text-sm font-medium sm:w-auto"
            onClick={() => summarize("doctor")}
            disabled={!rows.length}
          >
            Summarize (Clinical)
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 sm:text-sm">
        Informational only; not medical advice. Confirm eligibility with the sponsor.
      </div>

      {rows.length > 0 && (
        <ul className="space-y-3 sm:space-y-2">
          {rows.map((t: any) => (
            <li key={`${t.registry}:${t.registry_id}`} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-gray-600">
                  {t.registry}
                </span>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold hover:underline"
                >
                  {t.registry_id}
                </a>
              </div>
              <div className="mt-1 text-sm leading-snug text-gray-700 dark:text-gray-200">
                {t.title}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-gray-600">
                {t.phase && (
                  <span className="rounded border px-1.5 py-0.5">{t.phase}</span>
                )}
                {t.status && (
                  <span className="rounded border px-1.5 py-0.5">{t.status}</span>
                )}
                {t.when?.updated && (
                  <span className="rounded border px-1.5 py-0.5">
                    Updated: {t.when.updated.slice(0, 10)}
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
