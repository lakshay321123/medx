"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { safeJson } from "@/lib/safeJson";

const SEXES = ["male", "female", "other"] as const;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const PRESET_CONDITIONS = [
  "Diabetes mellitus",
  "Hypertension",
  "Coronary artery disease",
  "Asthma",
  "COPD",
  "Hypothyroidism",
  "Hyperthyroidism",
  "CKD",
  "Anemia",
  "Arthritis",
  "Depression",
  "Anxiety",
  "Obesity",
  "Dyslipidemia",
];

function ageFromDob(dob?: string | null) {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

type Observation = { kind: string; value: any; observedAt: string };

type Item = {
  key: string;
  label: string;
  value: string | number | null;
  unit: string | null;
  observedAt: string;
  source?: string | null;
};
type Groups = Record<
  "vitals" | "labs" | "imaging" | "medications" | "diagnoses" | "procedures" | "immunizations" | "notes" | "other",
  Item[]
>;
type ProfilePayload = { profile: any; groups: Groups };
type MetricEntry = {
  value: number | null;
  unit: string | null;
  observedAt: string | null;
  freshnessDays: number | null;
};
type MetricSnapshot = Record<string, MetricEntry>;
type CoreMetricKey = "ldl" | "hba1c" | "sbp" | "bmi" | "egfr";

export default function MedicalProfile() {
  const [obs, setObs] = useState<Observation[]>([]);
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<null | "obs" | "all" | "zero">(null);

  const queryClient = useQueryClient();
  const profileKey = ["profile", "active-patient"] as const;
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    error: summaryError,
  } = useQuery({
    queryKey: profileKey,
    queryFn: async () => {
      const res = await fetch("/api/profile/summary");
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
  });
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);

  const prof = data?.profile ?? null;
  const [bootstrapped, setBootstrapped] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [predis, setPredis] = useState<string[]>([]);
  const [chronic, setChronic] = useState<string[]>([]);

  async function loadProfile() {
    setErr(null);
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setErr(e.message || "Failed to load profile");
    }
  }

  useEffect(() => {
    safeJson(fetch("/api/observations")).then(setObs).catch(() => setObs([]));
    loadProfile();
    const h = () => loadProfile();
    window.addEventListener("observations-updated", h);
    return () => window.removeEventListener("observations-updated", h);
  }, []);

  useEffect(() => {
    if (!prof || bootstrapped) return;
    setFullName(prof.full_name || "");
    setDob(prof.dob || "");
    setSex(prof.sex || "");
    setBloodGroup(prof.blood_group || "");
    setPredis(prof.conditions_predisposition || []);
    setChronic(prof.chronic_conditions || []);
    setBootstrapped(true);
  }, [prof, bootstrapped]);

  const latestObs = (k: string) => obs.find(o => o.kind === k);

  const ORDER: Array<keyof Groups> = [
    "vitals","labs","imaging","medications","diagnoses","procedures","immunizations","notes","other",
  ];
  const TITLES: Record<keyof Groups, string> = {
    vitals: "Vitals",
    labs: "Labs",
    imaging: "Imaging",
    medications: "Medications",
    diagnoses: "Diagnoses",
    procedures: "Procedures",
    immunizations: "Immunizations",
    notes: "Notes",
    other: "Other Findings",
  };

  const patientSummary = summaryData?.patient ?? null;
  const metrics: MetricSnapshot = (summaryData?.metrics ?? {}) as MetricSnapshot;
  const predictions: Array<any> = Array.isArray(summaryData?.predictions)
    ? (summaryData?.predictions as any[])
    : [];
  const summaryErrorMessage = summaryError instanceof Error ? summaryError.message : summaryError ? String(summaryError) : null;
  const summaryRefreshing = summaryFetching && !!summaryData;
  const metricConfig: Array<{ key: CoreMetricKey; label: string }> = [
    { key: "ldl" as const, label: "LDL-C" },
    { key: "hba1c" as const, label: "HbA1c" },
    { key: "sbp" as const, label: "Systolic BP" },
    { key: "bmi" as const, label: "BMI" },
    { key: "egfr" as const, label: "eGFR" },
  ];

  const handleRecompute = async () => {
    try {
      setRecomputeError(null);
      setRecomputing(true);
      const payload = {
        patientId: patientSummary?.id ?? null,
        source: "ai-doc",
      };
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 422) {
        throw new Error(json?.error || "Failed to recompute risk");
      }
      await queryClient.invalidateQueries({ queryKey: profileKey });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("timeline-updated"));
      }
      if (res.status === 422) {
        setRecomputeError(json?.error || "Data insufficient for some predictions.");
      }
    } catch (error: any) {
      setRecomputeError(error?.message || "Failed to recompute risk");
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="p-4 space-y-4 relative z-0">
      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Patient Info</h2>
          <div className="flex items-center gap-2">
            {/* Reset (sidebar-safe) */}
            <button
              type="button"
              className="text-sm rounded-md border px-3 py-1.5 hover:bg-muted"
              onClick={async () => {
                const pick = window.prompt(
                  "Reset:\n1 = Clear observations\n2 = Clear everything (obs+pred+alerts)\n3 = Zero demo values\n\nEnter 1/2/3 or Cancel"
                );
                const map: any = { "1": "obs", "2": "all", "3": "zero" };
                const sel = map[pick || ""];
                if (!sel) return;
                setResetting(sel);
                try {
                  const body =
                    sel === "obs"
                      ? { scope: "observations", mode: "clear" }
                      : sel === "all"
                      ? { scope: "all", mode: "clear" }
                      : { scope: "observations", mode: "zero" };
                  const r = await fetch("/api/admin/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  if (!r.ok) throw new Error(await r.text());
                  window.dispatchEvent(new Event("observations-updated"));
                  await loadProfile();
                } catch (e: any) {
                  alert(e.message || "Reset failed");
                } finally {
                  setResetting(null);
                }
              }}
            >
              {resetting ? "Resetting…" : "Reset"}
            </button>

            {/* Save (sidebar-safe) */}
            <button
              type="button"
              className="text-sm rounded-md border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const r = await fetch("/api/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      full_name: fullName || null,
                      dob: dob || null,
                      sex: sex || null,
                      blood_group: bloodGroup || null,
                      conditions_predisposition: predis,
                      chronic_conditions: chronic,
                    }),
                  });
                  if (!r.ok) throw new Error(await r.text());
                  await loadProfile();
                  await queryClient.invalidateQueries({ queryKey: profileKey });
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("profile-updated"));
                  }
                } catch (e: any) {
                  alert(e.message || "Save failed");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span>Name</span>
            <input
              className="rounded-md border px-3 py-2"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span>DOB</span>
            <input
              type="date"
              className="rounded-md border px-3 py-2"
              value={/^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : ""}
              max={new Date().toISOString().slice(0,10)}
              onChange={e => setDob(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">Age: {ageFromDob(dob)}</span>
          </label>

          <label className="flex flex-col gap-1">
            <span>Sex</span>
            <select
              className="rounded-md border px-3 py-2"
              value={sex || ""}
              onChange={e => setSex(e.target.value)}
            >
              <option value="">—</option>
              {SEXES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span>Blood Group</span>
            <select
              className="rounded-md border px-3 py-2"
              value={bloodGroup || ""}
              onChange={e => setBloodGroup(e.target.value)}
            >
              <option value="">—</option>
              {BLOOD_GROUPS.map(bg => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 md:col-span-1">
            <span>Predispositions</span>
            <input
              className="rounded-md border px-3 py-2"
              placeholder="Type to add (Enter)…"
              onKeyDown={e => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) {
                  e.preventDefault();
                  setPredis(Array.from(new Set([...predis, v])));
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              list="condlist"
            />
            <datalist id="condlist">
              {PRESET_CONDITIONS.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-2 mt-1">
              {predis.map(c => (
                <span key={c} className="text-xs border rounded-full px-2 py-0.5">
                  {c}
                  <button type="button" className="ml-1" onClick={() => setPredis(predis.filter(x => x !== c))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1 md:col-span-1">
            <span>Chronic conditions</span>
            <input
              className="rounded-md border px-3 py-2"
              placeholder="Type to add (Enter)…"
              onKeyDown={e => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) {
                  e.preventDefault();
                  setChronic(Array.from(new Set([...chronic, v])));
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              list="condlist"
            />
            <div className="flex flex-wrap gap-2 mt-1">
              {chronic.map(c => (
                <span key={c} className="text-xs border rounded-full px-2 py-0.5">
                  {c}
                  <button type="button" className="ml-1" onClick={() => setChronic(chronic.filter(x => x !== c))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Key Risk Metrics</h2>
          <div className="text-xs text-muted-foreground">
            {summaryRefreshing ? "Refreshing…" : summaryLoading ? "Loading…" : ""}
          </div>
        </div>
        {summaryErrorMessage && (
          <div className="mb-3 text-xs text-red-600">{summaryErrorMessage}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metricConfig.map(item => {
            const metric = metrics[item.key] ?? null;
            const value = metric?.value ?? null;
            const unit = metric?.unit ?? null;
            const observedAt = metric?.observedAt ? new Date(metric.observedAt).toLocaleDateString() : "—";
            const freshness = typeof metric?.freshnessDays === "number"
              ? `${Math.round(metric.freshnessDays)}d ago`
              : "—";
            const stale = typeof metric?.freshnessDays === "number" && metric.freshnessDays > 365;
            const displayValue =
              typeof value === "number"
                ? value.toFixed(item.key === "hba1c" ? 1 : item.key === "bmi" ? 1 : 0)
                : "—";
            return (
              <div
                key={item.key}
                className="rounded-lg border px-3 py-3 bg-muted/40 flex flex-col gap-1"
              >
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-lg font-semibold">
                  {displayValue}
                  {unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Last: {observedAt}
                </div>
                <div className={`text-[11px] ${stale ? "text-amber-600" : "text-muted-foreground"}`}>
                  Freshness: {freshness}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Existing fixed sections (unchanged) */}
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Vitals</h2>
        <ul className="text-sm space-y-1">
          {["bp","hr","bmi"].map(k => {
            const o = latestObs(k);
            return <li key={k}>{k.toUpperCase()}: {o ? JSON.stringify(o.value) : "—"}</li>;
          })}
        </ul>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Labs</h2>
        <ul className="text-sm space-y-1">
          {["HbA1c","FPG","eGFR"].map(k => {
            const o = latestObs(k);
            return <li key={k}>{k}: {o ? JSON.stringify(o.value) : "—"}</li>;
          })}
        </ul>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Symptoms/notes</h2>
        <ul className="text-sm space-y-1">
          {obs.filter(o => typeof o.value === "string").slice(0, 5).map(o => (
            <li key={o.observedAt}>{o.value}</li>
          ))}
        </ul>
      </section>

      {/* NEW: Dynamic renderer for ALL categories from /api/profile */}
      {data?.groups && (
        <section className="rounded-xl border p-4">
          <h2 className="font-semibold mb-2">From uploads (all categories)</h2>
          <div className="space-y-6">
            {ORDER.map(key => {
              const items = data.groups[key] || [];
              if (!items.length) return null;
              return (
                <div key={key}>
                  <div className="mb-2 text-sm font-medium">{TITLES[key]}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {items.slice(0, 6).map(it => (
                      <div key={it.key} className="flex items-start justify-between rounded-md bg-muted/40 px-3 py-2">
                        <div className="pr-2">
                          <div>{it.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(it.observedAt).toLocaleDateString()}
                            {it.source ? ` • ${it.source}` : ""}
                          </div>
                        </div>
                        <div className="font-medium text-right">
                          {it.value ?? "—"}{it.unit ? ` ${it.unit}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Shows the latest item per finding from your uploads. Use Timeline for full history.
          </div>
        </section>
      )}

      <section className="rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">AI Risk Predictions</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {summaryRefreshing ? "Refreshing…" : summaryLoading ? "Loading…" : ""}
            </span>
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted disabled:opacity-60"
            >
              {recomputing ? "Recomputing…" : "Recompute Risk"}
            </button>
          </div>
        </div>
        {recomputeError && (
          <div className="text-xs text-amber-600">{recomputeError}</div>
        )}
        {summaryLoading && predictions.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading predictions…</div>
        ) : predictions.length === 0 ? (
          <div className="text-sm text-muted-foreground">No predictions yet.</div>
        ) : (
          <div className="space-y-4">
            {predictions.map(pred => {
              const pct = typeof pred.riskScore === "number" ? Math.round(pred.riskScore * 100) : null;
              const badgeClass =
                pred.riskLabel === "High"
                  ? "bg-red-500/10 text-red-600 border-red-500/30"
                  : pred.riskLabel === "Moderate"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : pred.riskLabel === "Low"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-muted-foreground/20";
              return (
                <div key={pred.condition} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Condition</div>
                      <div className="text-base font-semibold">{pred.condition}</div>
                    </div>
                    <div className={`px-3 py-1 text-xs font-medium rounded-full border ${badgeClass}`}>
                      {pred.riskLabel || "Unknown"}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Risk score: {pct != null ? `${pct}%` : "—"}
                  </div>
                  {Array.isArray(pred.topFactors) && pred.topFactors.length > 0 && (
                    <div>
                      <div className="text-sm font-medium">Top factors</div>
                      <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                        {pred.topFactors.map((factor: any, idx: number) => (
                          <li key={`${pred.condition}-factor-${idx}`}>
                            <span className="font-medium text-foreground">{factor.name}</span>
                            {factor.detail ? ` — ${factor.detail}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pred.summaries?.patient_summary_md && (
                    <div>
                      <div className="text-sm font-medium">Patient summary</div>
                      <div className="prose prose-sm dark:prose-invert max-w-none mt-1 text-muted-foreground">
                        <ReactMarkdown>{pred.summaries.patient_summary_md}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {pred.summaries?.clinician_summary_md && (
                    <div>
                      <div className="text-sm font-medium">Clinician summary</div>
                      <div className="prose prose-sm dark:prose-invert max-w-none mt-1 text-muted-foreground">
                        <ReactMarkdown>{pred.summaries.clinician_summary_md}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-3">
                    <span>Model: {pred.model || "—"}</span>
                    <span>
                      Generated {pred.generatedAt ? new Date(pred.generatedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground">
          ⚠️ Predictions are decision support, not a medical diagnosis. Confirm with a clinician.
        </div>
      </section>

      {err && <div className="text-sm text-red-600">{err}</div>}
    </div>
  );
}

