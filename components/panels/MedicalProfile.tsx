"use client";
import { useEffect, useState } from "react";
import { safeJson } from "@/lib/safeJson";

// Existing observation type for legacy profile sections
type Observation = { kind: string; value: any; observedAt: string };

// Types for latest labs card
type LatestRow = { value: string | number | null; unit: string | null; observedAt: string } | null;
type Latest = Record<string, LatestRow>;
type ProfilePayload = { profile: any; latest: Latest };

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
    safeJson(fetch("/api/observations?userId=me"))
      .then(setObs)
      .catch(() => setObs([]));
    loadProfile();
    const h = () => loadProfile();
    window.addEventListener("observations-updated", h);
    return () => window.removeEventListener("observations-updated", h);
  }, []);

  const latestLabs = data?.latest;
  const latestObs = (kind: string) => obs.find((o) => o.kind === kind);

  return (
    <div className="p-4 space-y-4">
      {/* Existing profile sections */}
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Vitals</h2>
        <ul className="text-sm space-y-1">
          {["bp", "hr", "bmi"].map((k) => {
            const o = latestObs(k);
            return <li key={k}>{k.toUpperCase()}: {o ? JSON.stringify(o.value) : "—"}</li>;
          })}
        </ul>
      </section>
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Labs</h2>
        <ul className="text-sm space-y-1">
          {["HbA1c", "FPG", "eGFR"].map((k) => {
            const o = latestObs(k);
            return <li key={k}>{k}: {o ? JSON.stringify(o.value) : "—"}</li>;
          })}
        </ul>
      </section>
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold mb-2">Symptoms/notes</h2>
        <ul className="text-sm space-y-1">
          {obs.filter((o) => typeof o.value === "string").slice(0, 5).map((o) => (
            <li key={o.observedAt}>{o.value}</li>
          ))}
        </ul>
      </section>

      {latestLabs && (
        <div className="rounded-lg border p-4">
          <div className="mb-2 font-medium">Latest Labs (from uploads)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {([
              ["HbA1c", "hba1c"],
              ["Fasting Glucose", "fasting_glucose"],
              ["BMI", "bmi"],
              ["eGFR", "egfr"],
              ["Blood Group", "blood_group"],
              ["Smoking", "smoking"],
              ["Family History", "family_history"],
            ] as const).map(([label, key]) => {
              const row = latestLabs[key];
              return (
                <div key={key} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <span>{label}</span>
                  <span className="font-medium">
                    {row?.value ?? "—"}{row?.unit ? ` ${row.unit}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Values shown are the latest parsed from your uploads. Timeline has full history.
          </div>
        </div>
      )}

      {err && <div className="text-sm text-red-600">{err}</div>}
    </div>
  );
}
