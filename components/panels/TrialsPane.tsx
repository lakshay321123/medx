"use client";
import { useEffect, useState } from "react";
import { getTrials } from "@/lib/hooks/useTrials";
import { patientTrialsPrompt, clinicianTrialsPrompt } from "@/lib/prompts/trials";
import { askLLM } from "@/lib/llm";
import { hintEligibility } from "@/lib/eligibility";
import type { TrialRow } from "@/types/trials";
import { useT } from "@/components/hooks/useI18n";

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
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          key={`${t.lang}-condition`}
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
          <option value="USA">{t("United States")}</option>
          <option value="EU">{t("European Union")}</option>
        </select>
        <input
          key={`${t.lang}-status`}
          className="border rounded p-2"
          placeholder={t("Status (e.g., Recruiting,Active)")}
          value={form.status || ""}
          onChange={(e) => setForm({ ...form, status: e.target.value || undefined })}
        />
        <input
          key={`${t.lang}-phase`}
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
          {loading ? t("Searching…") : t("Search trials")}
        </button>
        <button
          className="px-3 py-2 rounded border"
          onClick={()=>summarize("patient")}
          disabled={!rows.length}
        >
          {t("Summarize (Wellness)")}
        </button>
        <button
          className="px-3 py-2 rounded border"
          onClick={()=>summarize("doctor")}
          disabled={!rows.length}
        >
          {t("Summarize (Clinical)")}
        </button>
      </div>

      <div className="text-sm text-gray-500">
        {t("Informational only; not medical advice. Confirm eligibility with the sponsor.")}
      </div>

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((t: any) => (
            <li key={`${t.registry}:${t.registry_id}`} className="rounded border p-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-1.5 py-0.5 rounded border">{t.registry}</span>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  {t.registry_id}
                </a>
              </div>
              <div className="text-sm mt-1">{t.title}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {t.phase && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border">{t.phase}</span>
                )}
                {t.status && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border">{t.status}</span>
                )}
                {t.when?.updated && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border">
                    {t("Updated:")} {t.d(t.when.updated)}
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
