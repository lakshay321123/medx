"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import PanelLoader from "@/components/mobile/PanelLoader";
import ProfileSection from "@/components/profile/ProfileSection";
import VitalsEditor from "@/components/profile/VitalsEditor";
import MedicationInput from "@/components/meds/MedicationInput";
import MedicationTag from "@/components/meds/MedicationTag";
import { useProfile } from "@/lib/hooks/useAppData";
import { pushToast } from "@/lib/ui/toast";
import { fromSearchParams } from "@/lib/modes/url";
import { useSWRConfig } from "swr";

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

type MedicationEntry = {
  name: string;
  dose?: string | null;
  since?: string | null;
};

type ObservationMap = Record<string, { value: any; unit: string | null; observedAt: string } | undefined>;

type PanelMode = "wellness" | "clinical" | "ai-doc";

function ageFromDob(dob?: string | null) {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

function parseNumber(raw: any): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.,-]+/g, "").replace(/,/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseBp(value: any): { systolic?: number; diastolic?: number } {
  if (typeof value === "string" && value.includes("/")) {
    const [s, d] = value.split("/").map(part => parseNumber(part));
    return { systolic: s ?? undefined, diastolic: d ?? undefined };
  }
  return {};
}

function heightToMeters(value: any, unit?: string | null): number | null {
  const numeric = parseNumber(value);
  if (numeric == null) return null;
  const u = (unit || "").toLowerCase();
  if (u.includes("cm")) return numeric / 100;
  if (u.includes("meter")) return numeric;
  if (u.includes("inch") || u.includes("in")) return numeric * 0.0254;
  return numeric > 3 ? numeric / 100 : numeric; // assume cm if large number
}

function weightToKg(value: any, unit?: string | null): number | null {
  const numeric = parseNumber(value);
  if (numeric == null) return null;
  const u = (unit || "").toLowerCase();
  if (u.includes("lb")) return numeric * 0.453592;
  if (u.includes("kg")) return numeric;
  return numeric;
}

function pickObservation(map: ObservationMap, keys: string[]): { value: any; unit: string | null } | null {
  for (const key of keys) {
    const entry = map?.[key];
    if (entry && entry.value != null) {
      return { value: entry.value, unit: entry.unit ?? null };
    }
  }
  return null;
}

function derivePanelMode(searchParams: ReadonlyURLSearchParams, theme: string | undefined): PanelMode {
  const serialized = searchParams?.toString?.() ?? "";
  const state = fromSearchParams(new URLSearchParams(serialized), (theme as "light" | "dark") ?? "light");
  if (state.base === "aidoc") return "ai-doc";
  if (state.base === "doctor") return "clinical";
  return "wellness";
}

export default function MedicalProfile() {
  const router = useRouter();
  const params = useSearchParams();
  const { theme } = useTheme();
  const panelMode = useMemo(() => derivePanelMode(params, theme), [params, theme]);

  const { mutate: mutateGlobal } = useSWRConfig();
  const { data, error, isLoading, mutate: mutateProfile } = useProfile();

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [predis, setPredis] = useState<string[]>([]);
  const [chronic, setChronic] = useState<string[]>([]);
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [summaryText, setSummaryText] = useState("No summary yet.");
  const [predictionText, setPredictionText] = useState("—");
  const [summaryNotes, setSummaryNotes] = useState("—");
  const [summaryNextSteps, setSummaryNextSteps] = useState("—");

  const [bootstrapped, setBootstrapped] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingVitals, setEditingVitals] = useState(false);
  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [nextStepsEditing, setNextStepsEditing] = useState(false);
  const [nextStepsDraft, setNextStepsDraft] = useState("");
  const [savingNextSteps, setSavingNextSteps] = useState(false);

  const extractedMedications = useMemo(() => extractMedicationEntries(data), [data]);

  const latestMap: ObservationMap = (data?.latest as ObservationMap) || {};

  useEffect(() => {
    const prof = data?.profile ?? null;
    if (!prof || bootstrapped) return;
    setFullName(prof.full_name || "");
    setDob(prof.dob || "");
    setSex(prof.sex || "");
    setBloodGroup(prof.blood_group || "");
    setPredis(Array.isArray(prof.conditions_predisposition) ? prof.conditions_predisposition : []);
    setChronic(Array.isArray(prof.chronic_conditions) ? prof.chronic_conditions : []);
    setMedications(extractedMedications);
    setBootstrapped(true);
  }, [bootstrapped, data?.profile, extractedMedications]);

  useEffect(() => {
    if (!bootstrapped) return;
    setMedications(extractedMedications);
  }, [bootstrapped, extractedMedications]);

  const parseSummary = useCallback((text: string) => {
    const lines = text
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean);
    const findValue = (label: string) => {
      const line = lines.find(l => l.toLowerCase().startsWith(label.toLowerCase()));
      if (!line) return "—";
      return line.slice(label.length).replace(/^[:\s]+/, "").trim() || "—";
    };
    setSummaryText(text || "No summary yet.");
    setPredictionText(findValue("AI Prediction"));
    setSummaryNotes(findValue("Symptoms/Notes"));
    setSummaryNextSteps(findValue("Next Steps"));
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/summary", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      const text = body?.text || body?.summary || "";
      if (text) parseSummary(text);
      const reasons = body?.reasons || "";
      if (typeof reasons === "string" && !text) {
        setSummaryText(reasons);
      }
    } catch (err) {
      console.warn("Failed to load profile summary", err);
    }
  }, [parseSummary]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const profileVitals = useMemo(() => {
    const bpEntry = pickObservation(latestMap, [
      "bp_systolic",
      "sbp",
      "bp",
      "systolic_bp",
      "blood_pressure",
    ]);
    const dpEntry = pickObservation(latestMap, ["bp_diastolic", "dbp", "diastolic_bp"]);
    const heartEntry = pickObservation(latestMap, ["heart_rate", "hr", "pulse", "heart_rate_bpm"]);
    const heightEntry = pickObservation(latestMap, ["height", "height_cm", "height_m"]);
    const weightEntry = pickObservation(latestMap, ["weight", "weight_kg", "body_weight"]);

    const bpPair = bpEntry ? parseBp(bpEntry.value) : {};

    const systolic = bpPair.systolic ?? parseNumber(bpEntry?.value);
    const diastolic = bpPair.diastolic ?? parseNumber(dpEntry?.value);
    const heartRate = parseNumber(heartEntry?.value);

    const heightMeters = heightToMeters(heightEntry?.value, heightEntry?.unit);
    const weightKg = weightToKg(weightEntry?.value, weightEntry?.unit);
    const bmi =
      heightMeters && weightKg ? Number((weightKg / (heightMeters * heightMeters)).toFixed(1)) : null;

    return { systolic, diastolic, heartRate, bmi, weightKg, heightMeters };
  }, [latestMap]);

  const vitalsDisplay = [
    {
      label: "Blood pressure",
      value:
        profileVitals.systolic != null && profileVitals.diastolic != null
          ? `${profileVitals.systolic}/${profileVitals.diastolic} mmHg`
          : "—",
    },
    {
      label: "Heart rate",
      value: profileVitals.heartRate != null ? `${profileVitals.heartRate} bpm` : "—",
    },
    {
      label: "BMI",
      value: profileVitals.bmi != null ? `${profileVitals.bmi}` : "—",
    },
  ];

  const labs = data?.groups?.labs ?? [];
  const medsEmpty = medications.length === 0;

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        full_name: fullName || null,
        dob: dob || null,
        sex: sex || null,
        blood_group: bloodGroup || null,
        conditions_predisposition: predis,
        chronic_conditions: chronic,
      } as Record<string, unknown>;
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      pushToast({ title: "Profile saved" });
      await mutateProfile();
      await mutateGlobal("/api/profile");
      await loadSummary();
    } catch (err: any) {
      pushToast({
        title: "Couldn’t save profile",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveMedications = async (next: MedicationEntry[]) => {
    const payload = { medications: next } as Record<string, unknown>;
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    setMedications(next);
    await mutateProfile();
    await mutateGlobal("/api/profile");
    await loadSummary();
  };

  const handleAddMedication = async (med: { name: string; dose?: string | null }) => {
    const name = med.name.trim();
    if (!name) throw new Error("Medication name required");
    const dose = med.dose ? med.dose.trim() : null;
    const next = dedupeMedicationList([...medications, { name, dose }]);
    await saveMedications(next);
  };

  const handleRemoveMedication = async (med: MedicationEntry) => {
    const next = medications.filter(
      item => item.name !== med.name || (item.dose || "") !== (med.dose || ""),
    );
    try {
      await saveMedications(next);
      pushToast({ title: "Medication removed" });
    } catch (err: any) {
      pushToast({
        title: "Couldn’t remove medication",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      pushToast({ title: "Notes saved" });
      setNotesEditing(false);
      await loadSummary();
    } catch (err: any) {
      pushToast({
        title: "Couldn’t save notes",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveNextSteps = async () => {
    setSavingNextSteps(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_steps: nextStepsDraft.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      pushToast({ title: "Next steps saved" });
      setNextStepsEditing(false);
      await loadSummary();
    } catch (err: any) {
      pushToast({
        title: "Couldn’t save next steps",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNextSteps(false);
    }
  };

  const onRecomputeRisk = async () => {
    setRecomputeBusy(true);
    try {
      const res = await fetch("/api/predictions/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: "med-profile" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.ok === false) {
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const summary = body?.summary as string | undefined;
      if (summary) {
        parseSummary(summary);
        setSummaryText(summary);
        if (/insufficient data/i.test(summary)) {
          setPredictionText("Not enough data to compute risk yet.");
        }
      } else {
        setPredictionText("Not enough data to compute risk yet.");
      }
      pushToast({ title: "Risk recomputed" });
      await loadSummary();
    } catch (err: any) {
      pushToast({
        title: "Recompute failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRecomputeBusy(false);
    }
  };

  const showWellnessSections = panelMode !== "clinical";
  const showClinicalSections = panelMode !== "wellness";

  if (isLoading) return <PanelLoader label="Medical Profile" />;
  if (error) {
    return (
      <div className="p-6 text-sm text-red-500">Couldn’t load profile. Retrying in background…</div>
    );
  }
  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">No profile yet.</div>;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <ProfileSection
        title="Personal details"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={() => router.push("/?panel=chat&threadId=med-profile&context=profile")}
            >
              Open in chat
            </button>
            <button
              type="button"
              className="rounded-md border bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow disabled:opacity-60"
              onClick={handleProfileSave}
              disabled={savingProfile}
            >
              {savingProfile ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
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
            <span className="text-xs text-muted-foreground">Age: {ageFromDob(dob) || "—"}</span>
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
            <span>Blood group</span>
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
                const value = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && value) {
                  e.preventDefault();
                  setPredis(dedupeStrings([...predis, value]));
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
            <div className="mt-1 flex flex-wrap gap-2">
              {predis.map(c => (
                <button
                  key={c}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                  onClick={() => setPredis(predis.filter(x => x !== c))}
                >
                  <span className="truncate">{c}</span>
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1 md:col-span-1">
            <span>Chronic conditions</span>
            <input
              className="rounded-md border px-3 py-2"
              placeholder="Type to add (Enter)…"
              onKeyDown={e => {
                const value = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && value) {
                  e.preventDefault();
                  setChronic(dedupeStrings([...chronic, value]));
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              list="condlist"
            />
            <div className="mt-1 flex flex-wrap gap-2">
              {chronic.map(c => (
                <button
                  key={c}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                  onClick={() => setChronic(chronic.filter(x => x !== c))}
                >
                  <span className="truncate">{c}</span>
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          </label>
        </div>
      </ProfileSection>

      {showWellnessSections ? (
        <ProfileSection
          title="Vitals"
          actions={
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={() => setEditingVitals(open => !open)}
            >
              {editingVitals ? "Close" : "Edit"}
            </button>
          }
        >
          {editingVitals ? (
            <VitalsEditor
              initialSystolic={
                (data?.profile as any)?.vitals?.bp_systolic ?? profileVitals.systolic ?? ""
              }
              initialDiastolic={
                (data?.profile as any)?.vitals?.bp_diastolic ?? profileVitals.diastolic ?? ""
              }
              initialHeartRate={
                (data?.profile as any)?.vitals?.heart_rate ?? profileVitals.heartRate ?? ""
              }
              heightCm={
                parseNumber((data?.profile as any)?.vitals?.height_cm) ??
                (profileVitals.heightMeters != null
                  ? Number((profileVitals.heightMeters * 100).toFixed(1))
                  : null)
              }
              weightKg={
                parseNumber((data?.profile as any)?.vitals?.weight_kg) ??
                (profileVitals.weightKg != null
                  ? Number(profileVitals.weightKg.toFixed(1))
                  : null)
              }
              onCancel={() => setEditingVitals(false)}
              onSaved={async () => {
                setEditingVitals(false);
                await mutateProfile();
                await mutateGlobal("/api/profile");
                await loadSummary();
              }}
            />
          ) : (
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              {vitalsDisplay.map(item => (
                <div key={item.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</dt>
                  <dd className="text-base font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </ProfileSection>
      ) : null}

      <ProfileSection
        title="Labs"
        isEmpty={labs.length === 0}
        emptyMessage="No labs yet—upload a report or add data in chat."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Test</th>
                <th className="px-3 py-2 text-left font-semibold">Value</th>
                <th className="px-3 py-2 text-left font-semibold">Observed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {labs.map(item => (
                <tr key={`${item.key}-${item.observedAt}`}>
                  <td className="px-3 py-2 font-medium">{item.label}</td>
                  <td className="px-3 py-2">
                    {item.value ?? "—"}
                    {item.unit ? ` ${item.unit}` : ""}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(item.observedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProfileSection>

      {showWellnessSections || showClinicalSections ? (
        <ProfileSection
          title="AI Summary"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => router.push("/?panel=chat&threadId=med-profile&context=profile")}
              >
                Discuss in chat
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow disabled:opacity-60"
                onClick={onRecomputeRisk}
                disabled={recomputeBusy}
              >
                {recomputeBusy ? "Computing…" : "Recompute risk"}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap leading-relaxed">{summaryText}</p>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              ⚠️ This is AI-generated support, not a medical diagnosis. Always consult a clinician.
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Chronic conditions
                </h4>
                <p className="mt-1 text-sm">
                  {chronic.length ? chronic.join(", ") : "—"}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Symptoms / notes
                </h4>
                {summaryNotes !== "—" && !notesEditing ? (
                  <p className="mt-1 text-sm whitespace-pre-wrap">{summaryNotes}</p>
                ) : null}
                {notesEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      rows={3}
                      value={notesDraft}
                      onChange={e => setNotesDraft(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow disabled:opacity-60"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                      >
                        {savingNotes ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1.5 text-sm"
                        onClick={() => setNotesEditing(false)}
                        disabled={savingNotes}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : summaryNotes === "—" ? (
                  <button
                    type="button"
                    className="mt-2 rounded-md border px-3 py-1.5 text-sm"
                    onClick={() => {
                      setNotesDraft("");
                      setNotesEditing(true);
                    }}
                  >
                    Add notes
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mt-2 rounded-md border px-3 py-1.5 text-xs"
                    onClick={() => {
                      setNotesDraft(summaryNotes === "—" ? "" : summaryNotes);
                      setNotesEditing(true);
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Next steps
                </h4>
                {summaryNextSteps !== "—" && !nextStepsEditing ? (
                  <p className="mt-1 text-sm whitespace-pre-wrap">{summaryNextSteps}</p>
                ) : null}
                {nextStepsEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      rows={3}
                      value={nextStepsDraft}
                      onChange={e => setNextStepsDraft(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow disabled:opacity-60"
                        onClick={handleSaveNextSteps}
                        disabled={savingNextSteps}
                      >
                        {savingNextSteps ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1.5 text-sm"
                        onClick={() => setNextStepsEditing(false)}
                        disabled={savingNextSteps}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : summaryNextSteps === "—" ? (
                  <button
                    type="button"
                    className="mt-2 rounded-md border px-3 py-1.5 text-sm"
                    onClick={() => {
                      setNextStepsDraft("");
                      setNextStepsEditing(true);
                    }}
                  >
                    Add next steps
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mt-2 rounded-md border px-3 py-1.5 text-xs"
                    onClick={() => {
                      setNextStepsDraft(summaryNextSteps === "—" ? "" : summaryNextSteps);
                      setNextStepsEditing(true);
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            {showClinicalSections ? (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">AI prediction</div>
                <div className="mt-1 text-base font-medium whitespace-pre-wrap">
                  {predictionText && predictionText !== "—"
                    ? predictionText
                    : "No prediction yet — add vitals, labs, or medications to compute risk."}
                </div>
              </div>
            ) : null}
          </div>
        </ProfileSection>
      ) : null}

      {showClinicalSections ? (
        <ProfileSection
          title="Active medications"
          isEmpty={medsEmpty}
          emptyMessage="No medications recorded yet."
        >
          {medications.length ? (
            <div className="flex flex-wrap gap-2">
              {medications.map(med => (
                <MedicationTag
                  key={`${med.name}-${med.dose || ""}`}
                  label={`${med.name}${med.dose ? ` ${med.dose}` : ""}`}
                  onRemove={() => handleRemoveMedication(med)}
                />
              ))}
            </div>
          ) : null}
          <div className="mt-3">
            <MedicationInput onSave={handleAddMedication} />
          </div>
        </ProfileSection>
      ) : null}
    </div>
  );
}

function extractMedicationEntries(data: any): MedicationEntry[] {
  if (!data) return [];

  const entries: MedicationEntry[] = [];
  const groups = (data as any)?.groups;
  const groupMeds = Array.isArray(groups?.medications) ? groups.medications : [];

  if (groupMeds.length) {
    for (const item of groupMeds) {
      const med = normalizeMedicationItem(item);
      if (med) entries.push(med);
    }
    return dedupeMedicationList(entries);
  }

  const profileMeds = Array.isArray((data?.profile as any)?.medications)
    ? (data.profile as any).medications
    : [];

  if (profileMeds.length) {
    for (const item of profileMeds) {
      const med = normalizeMedicationItem(item);
      if (med) entries.push(med);
    }
    return dedupeMedicationList(entries);
  }

  const flatItems = Array.isArray((data as any)?.items) ? (data as any).items : [];
  for (const item of flatItems) {
    if (!isMedicationLike(item)) continue;
    const med = normalizeMedicationItem(item);
    if (med) entries.push(med);
  }

  return dedupeMedicationList(entries);
}

function normalizeMedicationItem(raw: any): MedicationEntry | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? { name: trimmed } : null;
  }

  const nameCandidate = [
    raw.name,
    raw.label,
    raw.title,
    raw.value,
    raw.medication,
  ].find(value => typeof value === "string" && value.trim());

  if (!nameCandidate) return null;

  const doseCandidate = [raw.dose, raw.meta?.dose, raw.metadata?.dose, raw.sig].find(
    value => typeof value === "string" && value.trim(),
  ) as string | undefined;

  return {
    name: (nameCandidate as string).trim(),
    dose: doseCandidate ? doseCandidate.trim() : null,
  };
}

function isMedicationLike(item: any) {
  if (!item || typeof item !== "object") return false;
  const kind = typeof item.kind === "string" ? item.kind.toLowerCase() : "";
  const group = typeof item.group === "string" ? item.group.toLowerCase() : "";
  const key = typeof item.key === "string" ? item.key.toLowerCase() : "";
  const category = typeof item.category === "string" ? item.category.toLowerCase() : "";

  return (
    group === "medications" ||
    kind === "medication" ||
    kind.includes("med") ||
    category.includes("med") ||
    key.startsWith("med_")
  );
}

function dedupeMedicationList(input: MedicationEntry[]): MedicationEntry[] {
  const map = new Map<string, MedicationEntry>();
  for (const med of input) {
    if (!med.name) continue;
    const key = `${med.name.toLowerCase()}::${(med.dose || "").toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, med);
    }
  }
  return Array.from(map.values());
}
