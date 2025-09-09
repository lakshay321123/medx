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
    country: "", // "" = Worldwide; code3 like "IND" or "USA"
    status: "Recruiting,Enrolling by invitation",
    phase: "Phase 2,Phase 3",
  });
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
        country: form.country,
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
        <input className="border rounded p-2" placeholder="Condition (e.g., Type 2 Diabetes)"
          value={form.condition} onChange={e=>setForm({...form, condition:e.target.value})}/>
        <input
          className="border rounded p-2"
          placeholder="Country code (optional)"
          value={form.country}
          onChange={e=>setForm({...form, country:e.target.value.toUpperCase()})}
          maxLength={3}
        />
        <input className="border rounded p-2" placeholder="Status (e.g., Recruiting,Active)"
          value={form.status||""} onChange={e=>setForm({...form, status:e.target.value||undefined})}/>
        <input className="border rounded p-2" placeholder="Phase (e.g., Phase 2,Phase 3)"
          value={form.phase||""} onChange={e=>setForm({...form, phase:e.target.value||undefined})}/>
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-2 rounded bg-black text-white" onClick={onSearch} disabled={loading}>Search trials</button>
        <button className="px-3 py-2 rounded border" onClick={()=>summarize("patient")} disabled={!rows.length}>Summarize (Patient)</button>
        <button className="px-3 py-2 rounded border" onClick={()=>summarize("doctor")} disabled={!rows.length}>Summarize (Doctor)</button>
      </div>

      <div className="text-sm text-gray-500">Informational only; not medical advice. Confirm eligibility with the sponsor.</div>

      {rows.length > 0 && (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Title</th>
                <th className="p-2">Phase</th>
                <th className="p-2">Status</th>
                <th className="p-2">Location</th>
                <th className="p-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">
                    {r.title}
                    {r.hints && r.hints.length > 0 && (
                      <span className="ml-1" title={r.hints.join('; ')}>⚑</span>
                    )}
                  </td>
                  <td className="p-2 text-center">{r.phase || "—"}</td>
                  <td className="p-2 text-center">{r.status || "—"}</td>
                  <td className="p-2 text-center">{r.country || "—"}</td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[11px] px-1.5 py-0.5 rounded border">
                        {(r.source || "").toUpperCase()}
                      </span>
                      {r.id ? (
                        <a
                          className="underline font-semibold"
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.id}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
