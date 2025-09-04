"use client";
import { useEffect, useState } from "react";
import { safeJson } from "@/lib/safeJson";

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

