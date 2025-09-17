"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeJson } from "@/lib/safeJson";
import { useProfile, useTimeline } from "@/lib/hooks/useAppData";
import { buildPredictionBundle } from "@/lib/predict/collectFromUI";

const AIDOC_UI = process.env.NEXT_PUBLIC_AIDOC_UI === "1";

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
export default function MedicalProfile() {
  const { data, error, isLoading, mutate } = useProfile();
  const { data: timelineData } = useTimeline();
  const [obs, setObs] = useState<Observation[]>([]);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<null | "obs" | "all" | "zero">(null);

  const router = useRouter();
  const params = useSearchParams();
  const _threadId = params.get("threadId") || "default";

  const [summary, setSummary] = useState<string>("");
  const [reasons, setReasons] = useState<string>("");

  const profileGroups = data?.groups || null;
  const currentProfileObject = data?.profile ?? null;
  const currentObservationsArray = useMemo(() => {
    if (!profileGroups) return [];
    const keys = ["vitals", "imaging", "diagnoses", "procedures", "immunizations", "notes", "other"] as const;
    const out: any[] = [];
    for (const key of keys) {
      const list = (profileGroups as any)[key];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (!item) continue;
        const label = typeof item.label === "string" && item.label.trim() ? item.label.trim() : undefined;
        out.push({
          id: item.key ? `${String(key)}:${item.key}` : undefined,
          observed_at: item.observedAt || undefined,
          type: item.key || label || String(key),
          value: item.value ?? null,
          units: item.unit ?? null,
          note: item.source ?? null,
        });
      }
    }
    return out;
  }, [profileGroups]);
  const currentLabsArray = useMemo(() => {
    const labs = (profileGroups as any)?.labs;
    if (!Array.isArray(labs)) return [];
    return labs.map((item: any) => ({
      id: item?.key ? `lab:${item.key}` : undefined,
      observed_at: item?.observedAt || undefined,
      analyte: (item?.label || item?.key || "") || undefined,
      value: item?.value ?? null,
      units: item?.unit ?? null,
      ref_low: null,
      ref_high: null,
      report_id: null,
    }));
  }, [profileGroups]);
  const currentMedsArray = useMemo(() => {
    const meds = (profileGroups as any)?.medications;
    if (!Array.isArray(meds)) return [];
    return meds.map((item: any) => {
      const strength = typeof item?.value === "string" && item.value.trim() ? item.value.trim() : undefined;
      return {
        id: item?.key ? `med:${item.key}` : undefined,
        name: (item?.label || item?.key || strength || "") || undefined,
        strength,
        route: undefined,
        freq: undefined,
        start_date: item?.observedAt || undefined,
        stop_date: null,
      };
    });
  }, [profileGroups]);
  const currentTextChunksArray = useMemo(() => {
    const items = Array.isArray(timelineData?.items) ? timelineData.items : [];
    const out: { file_id: string; page: number; chunk_index: number; content: string }[] = [];
    const seen = new Set<string>();
    let chunkIndex = 0;
    for (const item of items) {
      if (!item || item.kind !== "observation") continue;
      const meta = item.meta || {};
      const texts: string[] = [];
      const pushText = (val: any) => {
        if (typeof val !== "string") return;
        const trimmed = val.trim();
        if (!trimmed || trimmed.length < 40) return;
        if (!texts.includes(trimmed)) texts.push(trimmed);
      };
      pushText(meta.summary_long);
      pushText(meta.summary);
      pushText(meta.text);
      pushText(item.value);
      for (const text of texts) {
        const fileId = item.file?.upload_id || item.file?.path || `timeline-${item.id ?? chunkIndex}`;
        const pageRaw = meta.page ?? meta.page_number ?? meta.pageIndex;
        const page = typeof pageRaw === "number" && Number.isFinite(pageRaw) ? pageRaw : 0;
        const dedupKey = `${fileId}:${page}:${text.slice(0, 48)}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        out.push({
          file_id: String(fileId ?? `timeline-${chunkIndex}`),
          page,
          chunk_index: chunkIndex,
          content: text,
        });
        chunkIndex += 1;
        if (chunkIndex >= 600) break;
      }
      if (chunkIndex >= 600) break;
    }
    return out;
  }, [timelineData]);

  const loadSummary = async () => {
    try {
      const r = await fetch("/api/profile/summary", { cache: "no-store" });
      const j = await r.json();
      if (j?.text) setSummary(j.text);
      else if (j?.summary) setSummary(j.summary);
      if (j?.reasons) setReasons(j.reasons);
    } catch {}
  };
  useEffect(() => { loadSummary(); }, []);

  const prof = data?.profile ?? null;
  const [bootstrapped, setBootstrapped] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [predis, setPredis] = useState<string[]>([]);
  const [chronic, setChronic] = useState<string[]>([]);

  useEffect(() => {
    safeJson(fetch("/api/observations")).then(setObs).catch(() => setObs([]));
    const h = () => mutate();
    window.addEventListener("observations-updated", h);
    return () => window.removeEventListener("observations-updated", h);
  }, [mutate]);

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

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading profile…</div>;
  if (error)     return <div className="p-6 text-sm text-red-500">Couldn’t load profile. Retrying in background…</div>;
  if (!data)     return <div className="p-6 text-sm text-muted-foreground">No profile yet.</div>;

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
                  await mutate();
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
                  await mutate();
                  await loadSummary(); // ensure visible summary reflects just-saved arrays
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

      {/* --- AI Summary & Reasons --- */}
      <div className="mt-6 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">AI Summary</h3>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const prof = await fetch("/api/profile", { cache: "no-store" })
                    .then(r => r.json())
                    .catch(() => null);
                  const packet = await fetch("/api/profile/packet", { cache: "no-store" })
                    .then(r => r.json())
                    .catch(() => ({ text: "" }));
                  const prefill = encodeURIComponent(
                    JSON.stringify({
                      kind: "profileSummary",
                      summary,
                      reasons,
                      profile: prof?.profile || prof || null,
                      packet: packet?.text || "",
                    })
                  );
                  router.push(
                    `/?panel=chat&threadId=med-profile&context=profile&prefill=${prefill}`
                  );
                } catch {
                  const prefill = encodeURIComponent(
                    JSON.stringify({ kind: "profileSummary", summary, reasons })
                  );
                  router.push(
                    `/?panel=chat&threadId=med-profile&context=profile&prefill=${prefill}`
                  );
                }
              }}
              className="text-xs px-2 py-1 rounded-md border"
            >Discuss & Correct in Chat</button>
            <button
              onClick={async () => {
                await fetch("/api/alerts/recompute", { method: "POST" });
                await loadSummary();
                if (AIDOC_UI) {
                  try {
                    const threadForPredict = (() => {
                      if (typeof window === "undefined") return _threadId || "default_thread";
                      try {
                        return sessionStorage.getItem("aidoc_thread") || _threadId || "default_thread";
                      } catch {
                        return _threadId || "default_thread";
                      }
                    })();
                    const bundle = buildPredictionBundle({
                      profile: currentProfileObject,
                      observations: currentObservationsArray,
                      labs: currentLabsArray,
                      meds: currentMedsArray,
                      textChunks: currentTextChunksArray,
                    });
                    fetch("/api/aidoc/predict", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ threadId: threadForPredict, bundle }),
                    }).catch(() => {});
                  } catch {}
                }
              }}
              className="text-xs px-2 py-1 rounded-md border"
            >Recompute Risk</button>
          </div>
        </div>
        <p className="mt-2 text-sm whitespace-pre-wrap">{summary || "No summary yet."}</p>
        <div className="mt-3 text-[11px] text-muted-foreground">
          ⚠️ This is AI-generated support, not a medical diagnosis. Always consult a qualified clinician.
        </div>
      </div>
    </div>
  );
}

