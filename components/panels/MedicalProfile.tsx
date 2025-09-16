"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

type ObservationLatest = {
  value: string | number | null;
  unit: string | null;
  observedAt: string;
} | null;

type GroupItem = {
  key: string;
  label: string;
  value: string | number | null;
  unit: string | null;
  observedAt: string;
  source?: string | null;
};

type Groups = Record<
  | "vitals"
  | "labs"
  | "imaging"
  | "medications"
  | "diagnoses"
  | "procedures"
  | "immunizations"
  | "notes"
  | "other",
  GroupItem[]
>;

type DomainPrediction = {
  id: string;
  condition: string;
  riskScore: number;
  riskLabel: string;
  topFactors: Array<{ name: string; detail?: string | null }>;
  features: Record<string, any> | null;
  generatedAt: string;
  model: string;
  patientSummaryMd: string | null;
  clinicianSummaryMd: string | null;
  summarizerModel: string | null;
  summarizerError: string | null;
};

type ProfilePayload = {
  profile: any;
  patient: { id: string; name: string | null; dob: string | null; sex: string | null } | null;
  groups: Groups;
  latest: Record<string, ObservationLatest>;
  predictions: DomainPrediction[];
  summaries: {
    patientSummaryMd: string | null;
    clinicianSummaryMd: string | null;
    summarizerModel: string | null;
    summarizerError: string | null;
  } | null;
};

function ageFromDob(dob?: string | null) {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

function labelTheme(label: string) {
  switch (label) {
    case "High":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "Moderate":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "Low":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}

function percent(score: number) {
  if (!Number.isFinite(score)) return "—";
  return `${Math.round(score * 100)}%`;
}

export default function MedicalProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [patientId, setPatientId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("active_patient_id");
  });
  const patientIdRef = useRef<string | null>(patientId);
  useEffect(() => {
    patientIdRef.current = patientId;
  }, [patientId]);

  const fetchProfile = async (targetId: string | null) => {
    const url = targetId
      ? `/api/profile?patientId=${encodeURIComponent(targetId)}`
      : "/api/profile";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to load profile");
    }
    const json = (await res.json()) as ProfilePayload;
    const resolvedId = json?.patient?.id ?? null;
    if (resolvedId) {
      queryClient.setQueryData(["profile", resolvedId], json);
      if (patientIdRef.current !== resolvedId) {
        patientIdRef.current = resolvedId;
        setPatientId(resolvedId);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("active_patient_id", resolvedId);
        }
      }
    }
    return json;
  };

  const profileQuery = useQuery<ProfilePayload>({
    queryKey: ["profile", patientId ?? "bootstrap"],
    queryFn: ({ queryKey }) => {
      const [, pid] = queryKey as [string, string | null];
      return fetchProfile(pid === "bootstrap" ? null : pid);
    },
  });

  const data = profileQuery.data;
  const profile = data?.profile ?? null;
  const patient = data?.patient ?? null;
  const groups = data?.groups;
  const latest = data?.latest ?? {};
  const predictions = data?.predictions ?? [];
  const summaries = data?.summaries ?? null;

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [predis, setPredis] = useState<string[]>([]);
  const [chronic, setChronic] = useState<string[]>([]);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!profile || bootstrapped) return;
    setFullName(profile.full_name || "");
    setDob(profile.dob || "");
    setSex(profile.sex || "");
    setBloodGroup(profile.blood_group || "");
    setPredis(Array.isArray(profile.conditions_predisposition) ? profile.conditions_predisposition : []);
    setChronic(Array.isArray(profile.chronic_conditions) ? profile.chronic_conditions : []);
    setBootstrapped(true);
  }, [profile, bootstrapped]);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<null | "obs" | "all" | "zero">(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);
  const [summaryMode, setSummaryMode] = useState<"patient" | "clinician">("patient");

  useEffect(() => {
    if (summaryMode === "patient" && !summaries?.patientSummaryMd && summaries?.clinicianSummaryMd) {
      setSummaryMode("clinician");
    }
    if (summaryMode === "clinician" && !summaries?.clinicianSummaryMd && summaries?.patientSummaryMd) {
      setSummaryMode("patient");
    }
  }, [summaryMode, summaries?.patientSummaryMd, summaries?.clinicianSummaryMd]);

  const latestObs = (key: string) => latest[key] ?? null;

  const noteSnippets = useMemo(() => {
    return (groups?.notes ?? [])
      .filter(item => typeof item.value === "string" && item.value)
      .slice(0, 5);
  }, [groups]);

  useEffect(() => {
    const handler = () => {
      if (!patientIdRef.current) return;
      queryClient.invalidateQueries({ queryKey: ["profile", patientIdRef.current] });
    };
    window.addEventListener("observations-updated", handler);
    return () => window.removeEventListener("observations-updated", handler);
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    const key = patientIdRef.current ?? "bootstrap";
    await queryClient.invalidateQueries({ queryKey: ["profile", key] });
  }, [queryClient]);

  useEffect(() => {
    const handler = () => {
      setBootstrapped(false);
      refreshProfile();
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [refreshProfile]);

  if (profileQuery.isLoading && !profileQuery.data) {
    return <div className="p-4 text-sm text-muted-foreground">Loading medical profile…</div>;
  }

  const queryError = profileQuery.error as Error | null;

  return (
    <div className="p-4 space-y-4 relative z-0">
      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Patient Info</h2>
          <div className="flex items-center gap-2">
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
                setOpError(null);
                try {
                  const body =
                    sel === "obs"
                      ? { scope: "observations", mode: "clear" }
                      : sel === "all"
                      ? { scope: "all", mode: "clear" }
                      : { scope: "observations", mode: "zero" };
                  const res = await fetch("/api/admin/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  window.dispatchEvent(new Event("observations-updated"));
                  window.dispatchEvent(new Event("timeline-updated"));
                  setBootstrapped(false);
                  await refreshProfile();
                } catch (e: any) {
                  setOpError(e?.message || "Reset failed");
                } finally {
                  setResetting(null);
                }
              }}
            >
              {resetting ? "Resetting…" : "Reset"}
            </button>

            <button
              type="button"
              className="text-sm rounded-md border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setOpError(null);
                try {
                  const res = await fetch("/api/profile", {
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
                  if (!res.ok) throw new Error(await res.text());
                  setBootstrapped(false);
                  await refreshProfile();
                  window.dispatchEvent(new Event("profile-updated"));
                } catch (e: any) {
                  setOpError(e?.message || "Save failed");
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
              max={new Date().toISOString().slice(0, 10)}
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
        <h2 className="font-semibold mb-2">Vitals</h2>
        <ul className="text-sm space-y-1">
          {["bp", "hr", "bmi"].map(k => {
            const o = latestObs(k);
            return (
              <li key={k}>
                {k.toUpperCase()}: {o ? `${o.value ?? "—"}${o.unit ? ` ${o.unit}` : ""}` : "—"}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Labs</h2>
        <ul className="text-sm space-y-1">
          {["hba1c", "fasting_glucose", "egfr"].map(k => {
            const o = latestObs(k);
            const label = k === "fasting_glucose" ? "FPG" : k.toUpperCase();
            return (
              <li key={k}>
                {label}: {o ? `${o.value ?? "—"}${o.unit ? ` ${o.unit}` : ""}` : "—"}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Symptoms/notes</h2>
        <ul className="text-sm space-y-1">
          {noteSnippets.map(item => (
            <li key={item.key + item.observedAt}>{String(item.value)}</li>
          ))}
          {noteSnippets.length === 0 && <li className="text-muted-foreground">—</li>}
        </ul>
      </section>

      {groups && (
        <section className="rounded-xl border p-4">
          <h2 className="font-semibold mb-2">From uploads (all categories)</h2>
          <div className="space-y-6">
            {(
              ["vitals", "labs", "imaging", "medications", "diagnoses", "procedures", "immunizations", "notes", "other"] as Array<keyof Groups>
            ).map(key => {
              const items = groups[key] || [];
              if (!items.length) return null;
              const titles: Record<keyof Groups, string> = {
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
              return (
                <div key={key}>
                  <div className="mb-2 text-sm font-medium">{titles[key]}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {items.slice(0, 6).map(it => (
                      <div key={`${it.key}-${it.observedAt}`} className="flex items-start justify-between rounded-md bg-muted/40 px-3 py-2">
                        <div className="pr-2">
                          <div>{it.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(it.observedAt).toLocaleDateString()}
                            {it.source ? ` • ${it.source}` : ""}
                          </div>
                        </div>
                        <div className="font-medium text-right">
                          {it.value ?? "—"}
                          {it.unit ? ` ${it.unit}` : ""}
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

      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-semibold">AI Predictions</h3>
          <div className="flex items-center gap-2 text-xs">
            {recomputeError && <span className="text-rose-600">{recomputeError}</span>}
            <button
              onClick={async () => {
                if (!patientIdRef.current) {
                  setRecomputeError("No patient selected");
                  return;
                }
                setRecomputeError(null);
                setRecomputing(true);
                try {
                  const res = await fetch("/api/predict", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ patientId: patientIdRef.current, source: "ai-doc" }),
                  });
                  if (!res.ok) {
                    const payload = await res.json().catch(() => ({}));
                    throw new Error(payload?.error || res.statusText);
                  }
                  await refreshProfile();
                  window.dispatchEvent(new Event("timeline-updated"));
                } catch (e: any) {
                  setRecomputeError(e?.message || "Failed to recompute");
                } finally {
                  setRecomputing(false);
                }
              }}
              className="px-3 py-1.5 rounded-md border hover:bg-muted disabled:opacity-60"
              disabled={recomputing || !patientIdRef.current}
            >
              {recomputing ? "Recomputing…" : "Recompute Risk"}
            </button>
            <button
              onClick={() => {
                const payload = {
                  kind: "aidocSnapshot",
                  patient,
                  profile,
                  predictions: predictions.map(p => ({
                    condition: p.condition,
                    riskLabel: p.riskLabel,
                    riskScore: p.riskScore,
                    topFactors: p.topFactors,
                    generatedAt: p.generatedAt,
                    model: p.model,
                  })),
                  summaries,
                };
                const prefill = encodeURIComponent(JSON.stringify(payload));
                router.push(`/?panel=chat&threadId=med-profile&context=profile&prefill=${prefill}`);
              }}
              className="px-3 py-1.5 rounded-md border hover:bg-muted"
            >
              Discuss &amp; Correct in Chat
            </button>
          </div>
        </div>

        {predictions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No AI Doc predictions yet. Recompute to analyze the longitudinal record.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {predictions.map(pred => (
                <div key={pred.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{pred.condition}</div>
                      <div className="text-xs text-muted-foreground">
                        Generated {new Date(pred.generatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${labelTheme(pred.riskLabel)}`}>
                      {pred.riskLabel} • {percent(pred.riskScore)}
                    </div>
                  </div>
                  {pred.topFactors.length > 0 && (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        Top factors
                      </div>
                      <ul className="space-y-1 text-sm">
                        {pred.topFactors.slice(0, 4).map((factor, idx) => (
                          <li key={`${pred.id}-factor-${idx}`} className="flex items-start gap-2">
                            <span className="mt-[2px] text-xs text-muted-foreground">•</span>
                            <span>
                              <span className="font-medium">{factor.name}</span>
                              {factor.detail ? <span className="text-muted-foreground"> — {factor.detail}</span> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setSummaryMode("patient")}
                  className={`px-2 py-1 rounded-md border ${
                    summaryMode === "patient" ? "bg-muted" : "hover:bg-muted"
                  } ${!summaries?.patientSummaryMd ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!summaries?.patientSummaryMd}
                >
                  Patient Summary
                </button>
                <button
                  onClick={() => setSummaryMode("clinician")}
                  className={`px-2 py-1 rounded-md border ${
                    summaryMode === "clinician" ? "bg-muted" : "hover:bg-muted"
                  } ${!summaries?.clinicianSummaryMd ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!summaries?.clinicianSummaryMd}
                >
                  Clinician Summary
                </button>
                {summaries?.summarizerModel && (
                  <span className="text-muted-foreground ml-auto">
                    {summaries.summarizerModel}
                  </span>
                )}
              </div>
              <article className="mt-3 prose prose-sm prose-zinc dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                {summaryMode === "patient" && summaries?.patientSummaryMd}
                {summaryMode === "clinician" && summaries?.clinicianSummaryMd}
                {!summaries?.patientSummaryMd && !summaries?.clinicianSummaryMd && (
                  <span className="text-muted-foreground text-sm">
                    Summaries are unavailable. Numeric results are still shown above.
                  </span>
                )}
              </article>
              {summaries?.summarizerError && (
                <div className="mt-2 text-xs text-amber-600">
                  Summaries may be stale ({summaries.summarizerError}).
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {(opError || queryError) && (
        <div className="text-sm text-rose-600">
          {opError || queryError?.message || "An error occurred"}
        </div>
      )}
    </div>
  );
}
