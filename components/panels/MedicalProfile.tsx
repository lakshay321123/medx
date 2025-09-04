"use client";
import { useEffect, useState } from "react";
import { safeJson } from "@/lib/safeJson";

const SEXES = ["male", "female", "other"] as const;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const PRESET_CONDITIONS = [
  "Diabetes mellitus","Hypertension","Coronary artery disease","Asthma",
  "COPD","Hypothyroidism","Hyperthyroidism","CKD","Anemia","Arthritis",
  "Depression","Anxiety","Obesity","Dyslipidemia",
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

export default function MedicalProfile() {
  const [obs, setObs] = useState<Observation[]>([]);
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<null | "obs" | "all" | "zero">(null);

  // derive from profile
  const prof = data?.profile || {};
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [predis, setPredis] = useState<string[]>([]);
  const [chronic, setChronic] = useState<string[]>([]);

  useEffect(() => {
    if (!prof) return;
    setFullName(prof.full_name || "");
    setDob(prof.dob || "");
    setSex(prof.sex || "");
    setBloodGroup(prof.blood_group || "");
    setPredis(prof.conditions_predisposition || []);
    setChronic(prof.chronic_conditions || []);
  }, [prof]);

  async function loadProfile() {
    setErr(null);
    try {
      const r = await fetch("/api/profile", { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
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
    <div className="p-4 space-y-4">
      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Patient Info</h2>
          <div className="flex items-center gap-2">

            {/* RESET button — type="button" is REQUIRED for sidebar safety */}
            <button
              type="button"
              className="text-sm rounded-md border px-3 py-1.5 hover:bg-muted"
              onClick={async () => {
                const pick = window.prompt(
                  "Reset:\n1 = Clear observations\n2 = Clear everything (obs+pred+alerts)\n3 = Zero-out demo values\n\nEnter 1/2/3 or Cancel"
                );
                const map: any = { "1": "obs", "2": "all", "3": "zero" };
                const sel = map[pick || ""];
                if (!sel) return;
                setResetting(sel);
                try {
                  const body =
                    sel === "obs" ? { scope: "observations", mode: "clear" } :
                    sel === "all" ? { scope: "all", mode: "clear" } :
                                    { scope: "observations", mode: "zero" };
                  const r = await fetch("/api/admin/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  if (!r.ok) throw new Error(await r.text());
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("observations-updated"));
                  }
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

            {/* SAVE button — type="button" is REQUIRED for sidebar safety */}
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
            <input className="rounded-md border px-3 py-2"
                   value={fullName} onChange={e => setFullName(e.target.value)}
                   placeholder="Full name" />
          </label>

          <label className="flex flex-col gap-1">
            <span>DOB</span>
            <input type="date" className="rounded-md border px-3 py-2"
                   value={dob || ""} onChange={e => setDob(e.target.value)} />
            <span className="text-xs text-muted-foreground">Age: {ageFromDob(dob)}</span>
          </label>

          <label className="flex flex-col gap-1">
            <span>Sex</span>
            <select className="rounded-md border px-3 py-2" value={sex} onChange={e => setSex(e.target.value)}>
              <option value="">—</option>
              {SEXES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span>Blood Group</span>
            <select className="rounded-md border px-3 py-2" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
              <option value="">—</option>
              {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1 md:col-span-1">
            <span>Predispositions</span>
            <input
              className="rounded-md border px-3 py-2"
              placeholder="Type to add (Enter)…"
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) {
                  setPredis(Array.from(new Set([...predis, v])));
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              list="condlist"
            />
            <datalist id="condlist">
              {PRESET_CONDITIONS.map(c => <option key={c} value={c} />)}
            </datalist>
            <div className="flex flex-wrap gap-2 mt-1">
              {predis.map(c => (
                <span key={c} className="text-xs border rounded-full px-2 py-0.5">
                  {c} <button type="button" className="ml-1" onClick={() => setPredis(predis.filter(x => x !== c))}>×</button>
                </span>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1 md:col-span-1">
            <span>Chronic conditions</span>
            <input
              className="rounded-md border px-3 py-2"
              placeholder="Type to add (Enter)…"
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) {
                  setChronic(Array.from(new Set([...chronic, v])));
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              list="condlist"
            />
            <div className="flex flex-wrap gap-2 mt-1">
              {chronic.map(c => (
                <span key={c} className="text-xs border rounded-full px-2 py-0.5">
                  {c} <button type="button" className="ml-1" onClick={() => setChronic(chronic.filter(x => x !== c))}>×</button>
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

      {err && <div className="text-sm text-red-600">{err}</div>}
    </div>
  );
}

