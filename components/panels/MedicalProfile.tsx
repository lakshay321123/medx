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
import { extractManualObservation } from "@/lib/profile/extractManualObservation";
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

const MANUAL_NOTES_KIND = "summary_notes_manual";
const MANUAL_NEXT_STEPS_KIND = "summary_next_steps_manual";
const NO_DATA_TEXT = "No data available";

type MedicationEntry = {
  key: string;
  name: string;
  doseLabel?: string | null;
  doseValue?: number | null;
  doseUnit?: string | null;
  observationId?: string | number | null;
  rxnormId?: string | null;
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

function describeUpdatedAt(timestamp: string | number | Date | null | undefined) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diff < dayMs) return "Updated today";
  if (diff < 2 * dayMs) return "Updated yesterday";
  const days = Math.floor(diff / dayMs);
  if (days < 7) return `Updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `Updated ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Updated ${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `Updated ${years} year${years === 1 ? "" : "s"} ago`;
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

function formatNumberInput(value: number | null) {
  if (value == null || Number.isNaN(value)) return "";
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return rounded.replace(/\.0$/, "");
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
  const [predictionText, setPredictionText] = useState(NO_DATA_TEXT);
  const [summaryNotes, setSummaryNotes] = useState(NO_DATA_TEXT);
  const [summaryNextSteps, setSummaryNextSteps] = useState(NO_DATA_TEXT);
  const [manualNotes, setManualNotes] = useState<string | null>(null);
  const [manualNextSteps, setManualNextSteps] = useState<string | null>(null);
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

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
  const [summaryMedsEditing, setSummaryMedsEditing] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [showMedicationComposer, setShowMedicationComposer] = useState(false);

  const extractedMedications = useMemo(() => extractMedicationEntries(data), [data]);

  const latestMap: ObservationMap = (data?.latest as ObservationMap) || {};

  const manualSyncKey = useMemo(() => {
    const updated = data?.profile?.updated_at ?? data?.profile?.updatedAt ?? "";
    const count = Array.isArray(data?.profile?.observations)
      ? data.profile.observations.length
      : "";
    return `${updated}|${count}`;
  }, [data?.profile?.updated_at, data?.profile?.updatedAt, data?.profile?.observations]);

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
    const bmiEntry = pickObservation(latestMap, ["bmi"]);

    const bpPair = bpEntry ? parseBp(bpEntry.value) : {};

    const systolic = bpPair.systolic ?? parseNumber(bpEntry?.value);
    const diastolic = bpPair.diastolic ?? parseNumber(dpEntry?.value);
    const heartRate = parseNumber(heartEntry?.value);

    const heightMeters = heightToMeters(heightEntry?.value, heightEntry?.unit);
    const weightKg = weightToKg(weightEntry?.value, weightEntry?.unit);
    const computedBmi =
      heightMeters && weightKg ? Number((weightKg / (heightMeters * heightMeters)).toFixed(1)) : null;
    const observedBmi = parseNumber(bmiEntry?.value);

    return {
      systolic,
      diastolic,
      heartRate,
      bmi: observedBmi ?? computedBmi,
      weightKg,
      heightMeters,
    };
  }, [latestMap]);

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

    const profVitals = (prof as any)?.vitals ?? {};
    const heightFromProfile = parseNumber(profVitals?.height_cm);
    const weightFromProfile = parseNumber(profVitals?.weight_kg);
    const fallbackHeight =
      profileVitals.heightMeters != null ? Number((profileVitals.heightMeters * 100).toFixed(1)) : null;
    const fallbackWeight =
      profileVitals.weightKg != null ? Number(profileVitals.weightKg.toFixed(1)) : null;
    setHeightInput(formatNumberInput(heightFromProfile ?? fallbackHeight));
    setWeightInput(formatNumberInput(weightFromProfile ?? fallbackWeight));

    setBootstrapped(true);
  }, [
    bootstrapped,
    data?.profile,
    extractedMedications,
    profileVitals.heightMeters,
    profileVitals.weightKg,
  ]);

  useEffect(() => {
    if (!bootstrapped) return;
    setMedications(extractedMedications);
  }, [bootstrapped, extractedMedications]);

  useEffect(() => {
    if (!bootstrapped) return;
    const profVitals = (data?.profile as any)?.vitals ?? {};
    const heightFromProfile = parseNumber(profVitals?.height_cm);
    const weightFromProfile = parseNumber(profVitals?.weight_kg);
    const fallbackHeight =
      profileVitals.heightMeters != null ? Number((profileVitals.heightMeters * 100).toFixed(1)) : null;
    const fallbackWeight =
      profileVitals.weightKg != null ? Number(profileVitals.weightKg.toFixed(1)) : null;
    setHeightInput(formatNumberInput(heightFromProfile ?? fallbackHeight));
    setWeightInput(formatNumberInput(weightFromProfile ?? fallbackWeight));
  }, [bootstrapped, data?.profile, profileVitals.heightMeters, profileVitals.weightKg]);

  useEffect(() => {
    let cancelled = false;

    const loadManualNotes = async () => {
      try {
        const { text } = await extractManualObservation(MANUAL_NOTES_KIND);
        if (cancelled) return;
        const trimmed = text?.trim?.() ?? "";
        setManualNotes(trimmed ? trimmed : null);
      } catch (err) {
        console.warn("Failed to load manual notes observation", err);
        if (!cancelled) {
          setManualNotes(null);
        }
      }
    };

    void loadManualNotes();

    return () => {
      cancelled = true;
    };
  }, [manualSyncKey]);

  useEffect(() => {
    let cancelled = false;

    const loadManualNextSteps = async () => {
      try {
        const { text } = await extractManualObservation(MANUAL_NEXT_STEPS_KIND);
        if (cancelled) return;
        const trimmed = text?.trim?.() ?? "";
        setManualNextSteps(trimmed ? trimmed : null);
      } catch (err) {
        console.warn("Failed to load manual next steps observation", err);
        if (!cancelled) {
          setManualNextSteps(null);
        }
      }
    };

    void loadManualNextSteps();

    return () => {
      cancelled = true;
    };
  }, [manualSyncKey]);

  const parseSummary = useCallback((text: string) => {
    const lines = text
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean);
    const findValue = (label: string) => {
      const line = lines.find(l => l.toLowerCase().startsWith(label.toLowerCase()));
      if (!line) return NO_DATA_TEXT;
      const value = line.slice(label.length).replace(/^[:\s]+/, "").trim();
      if (!value) return NO_DATA_TEXT;
      return value;
    };
    setSummaryText(text || "No summary yet.");
    setSummaryExpanded(false);
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
        setSummaryExpanded(false);
      }
    } catch (err) {
      console.warn("Failed to load profile summary", err);
    }
  }, [parseSummary]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

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

  const vitalsUpdatedRaw =
    (data?.profile as any)?.vitals?.updated_at ??
    (data?.profile as any)?.vitals?.updatedAt ??
    (data?.profile as any)?.vitals_updated_at ??
    null;
  const vitalsStatus = describeUpdatedAt(vitalsUpdatedRaw);
  const summaryShouldClamp = (summaryText || "").length > 320;
  const displayedNotes = manualNotes ?? (summaryNotes !== NO_DATA_TEXT ? summaryNotes : null);
  const displayedNextSteps =
    manualNextSteps ?? (summaryNextSteps !== NO_DATA_TEXT ? summaryNextSteps : null);

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

  const handleAddMedication = async (med: {
    name: string;
    dose?: string | null;
    rxnormId?: string | null;
  }) => {
    const normalizedName = med.name.trim();
    if (!normalizedName) throw new Error("Medication name required");

    const { doseLabel, doseUnit, doseValue } = parseDoseString(med.dose ?? null);
    const observedAt = new Date().toISOString();
    const res = await fetch("/api/observations/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        observations: [
          {
            kind: "medication",
            value_text: normalizedName,
            value_num: doseValue ?? null,
            unit: doseUnit ?? null,
            observed_at: observedAt,
            thread_id: null,
            meta: {
              source: "manual",
              normalizedName,
              doseLabel: doseLabel ?? null,
              rxnormId: med.rxnormId ?? null,
              summary: doseLabel ? `${normalizedName} — ${doseLabel}` : normalizedName,
              text: doseLabel
                ? `${normalizedName} (${doseLabel}) saved from Medical Profile`
                : `${normalizedName} saved from Medical Profile`,
              committed: true,
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error((await res.text()) || "Failed to save medication");
    }

    const body = await res.json().catch(() => ({}));
    const inserted = Array.isArray(body?.observations) ? body.observations : [];
    const observationId = inserted?.[0]?.id ?? inserted?.[0]?.observation?.id ?? null;
    if (!observationId) {
      throw new Error("Medication saved but response was malformed");
    }

    const nextEntry: MedicationEntry = {
      key: buildMedicationKey(normalizedName, doseLabel ?? null, { observationId }),
      name: normalizedName,
      doseLabel,
      doseUnit: doseUnit ?? null,
      doseValue: doseValue ?? null,
      rxnormId: med.rxnormId ?? null,
      observationId,
    };

    setMedications(prev => dedupeMedicationList([...prev, nextEntry]));
    setShowMedicationComposer(false);
    await Promise.all([mutateProfile?.(), mutateGlobal?.("/api/profile"), loadSummary?.()]);
  };

  const persistManualObservation = async (
    manualKind: string,
    label: string,
    text: string | null,
  ): Promise<string | null> => {
    const observedAt = new Date().toISOString();
    const trimmed = (text ?? "").trim();
    const cleared = trimmed.length === 0;
    const title = manualKind === MANUAL_NEXT_STEPS_KIND ? "Next steps" : "Note";
    const summary = cleared
      ? `${title} cleared`
      : trimmed.length > 140
      ? `${trimmed.slice(0, 140)}…`
      : trimmed || title;
    const textPayload = cleared
      ? `${title} cleared from Medical Profile`
      : trimmed || title;
    const res = await fetch("/api/observations/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        observations: [
          {
            kind: "note",
            value_text: cleared ? null : trimmed,
            value_num: null,
            unit: cleared ? "__cleared__" : null,
            observed_at: observedAt,
            thread_id: null,
            meta: {
              source: "manual",
              category: "note",
              committed: true,
              label,
              cleared,
              manualKind,
              title,
              summary,
              text: textPayload,
            },
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return cleared ? null : trimmed;
  };

  const handleRemoveMedication = async (med: MedicationEntry) => {
    try {
      const removalObservation: Record<string, any> = {
        kind: "medication",
        value_text: med.name,
        value_num: null,
        unit: "__deleted__",
        observed_at: new Date().toISOString(),
        meta: {
          normalizedName: med.name,
          doseLabel: med.doseLabel ?? null,
          rxnormId: med.rxnormId ?? null,
          deleted: true,
          committed: true,
        },
        thread_id: null,
      };
      if (med.observationId != null) {
        removalObservation.observation_id = med.observationId;
      }

      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(removalObservation),
      });

      if (!res.ok) throw new Error((await res.text()) || "Failed to remove medication");

      setMedications(prev => prev.filter(item => item.key !== med.key));
      await Promise.all([mutateProfile?.(), mutateGlobal?.("/api/profile"), loadSummary?.()]);
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
      const stored = await persistManualObservation(MANUAL_NOTES_KIND, "Symptoms / notes", notesDraft);
      setManualNotes(stored);
      setSummaryNotes(stored || NO_DATA_TEXT);
      pushToast({ title: "Notes saved" });
      setNotesEditing(false);
      await mutateProfile();
      await mutateGlobal("/api/profile");
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

  const handleClearNotes = async () => {
    setSavingNotes(true);
    try {
      await persistManualObservation(MANUAL_NOTES_KIND, "Symptoms / notes", null);
      setManualNotes(null);
      setSummaryNotes(NO_DATA_TEXT);
      setNotesDraft("");
      setNotesEditing(false);
      pushToast({ title: "Notes removed" });
      await mutateProfile();
      await mutateGlobal("/api/profile");
      await loadSummary();
    } catch (err: any) {
      pushToast({
        title: "Couldn’t remove notes",
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
      const stored = await persistManualObservation(MANUAL_NEXT_STEPS_KIND, "Next steps", nextStepsDraft);
      setManualNextSteps(stored);
      setSummaryNextSteps(stored || NO_DATA_TEXT);
      pushToast({ title: "Next steps saved" });
      setNextStepsEditing(false);
      await mutateProfile();
      await mutateGlobal("/api/profile");
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

  const handleClearNextSteps = async () => {
    setSavingNextSteps(true);
    try {
      await persistManualObservation(MANUAL_NEXT_STEPS_KIND, "Next steps", null);
      setManualNextSteps(null);
      setSummaryNextSteps(NO_DATA_TEXT);
      setNextStepsDraft("");
      setNextStepsEditing(false);
      pushToast({ title: "Next steps removed" });
      await mutateProfile();
      await mutateGlobal("/api/profile");
      await loadSummary();
    } catch (err: any) {
      pushToast({
        title: "Couldn’t remove next steps",
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
        setSummaryExpanded(false);
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
  const displaySex = sex ? `${sex[0]?.toUpperCase()}${sex.slice(1)}` : "";
  const displayAge = ageFromDob(dob);
  const identityDetails = [displaySex, displayAge ? `${displayAge} yrs` : "", bloodGroup]
    .map(value => value?.toString().trim())
    .filter(Boolean)
    .join(" • ");
  const isVerified = Boolean(
    (data?.profile as any)?.verified ??
      (data?.profile as any)?.is_verified ??
      (data?.profile as any)?.isVerified ??
      false,
  );
  const initials = useMemo(() => {
    const trimmed = (fullName || "").trim();
    if (!trimmed) return "MP";
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (!parts.length) return "MP";
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [fullName]);

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
    <div className="space-y-3 p-3 md:p-6">
      <ProfileSection
        title="Personal details"
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-[10px] border border-border/70 px-3 text-[13px] font-medium text-foreground whitespace-nowrap transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
              onClick={() => router.push("/?panel=chat&threadId=med-profile&context=profile")}
            >
              Open in chat
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-[10px] border border-primary/70 bg-primary px-3 text-[13px] font-semibold text-primary-foreground whitespace-nowrap shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleProfileSave}
              disabled={savingProfile}
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-muted text-base font-semibold text-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    fullName
                      ? "truncate text-sm font-semibold text-foreground"
                      : "truncate text-sm font-semibold text-muted-foreground"
                  }
                >
                  {fullName || "Add full name"}
                </span>
                {isVerified ? (
                  <span className="inline-flex h-5 items-center rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-200">
                    Verified
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {identityDetails || "Add demographic details"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <input
                className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Full name"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">DOB</span>
              <input
                type="date"
                className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                value={/^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : ""}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setDob(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">Age: {displayAge || "—"}</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Sex</span>
              <select
                className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
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
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Blood group</span>
              <select
                className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
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
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Height (cm)</span>
              <input
                type="number"
                inputMode="decimal"
                className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                placeholder="e.g. 170"
                value={heightInput}
                onChange={e => setHeightInput(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Weight (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                placeholder="e.g. 70"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Predispositions</span>
              <input
                className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
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
              <div className="flex flex-wrap gap-1.5">
                {predis.map(c => (
                  <button
                    key={c}
                    type="button"
                    className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border/70 px-3 text-[11px] font-medium text-foreground/90 transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                    onClick={() => setPredis(predis.filter(x => x !== c))}
                  >
                    <span className="truncate">{c}</span>
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Chronic conditions</span>
              <input
                className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
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
              <div className="flex flex-wrap gap-1.5">
                {chronic.map(c => (
                  <button
                    key={c}
                    type="button"
                    className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border/70 px-3 text-[11px] font-medium text-foreground/90 transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                    onClick={() => setChronic(chronic.filter(x => x !== c))}
                  >
                    <span className="truncate">{c}</span>
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            </label>
          </div>
        </div>
      </ProfileSection>

      {showWellnessSections ? (
        <ProfileSection
          title="Vitals"
          actions={
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-[10px] border border-border/70 px-3 text-[13px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
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
              initialBmi={profileVitals.bmi ?? null}
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
            <div className="space-y-2">
              <dl className="grid grid-cols-1 gap-3 text-[13px] min-[380px]:grid-cols-2 xl:grid-cols-4">
                {vitalsDisplay.map(item => (
                  <div key={item.label} className="rounded-[10px] border border-border/60 bg-muted/40 p-3 dark:border-border/30 dark:bg-muted/20">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</dt>
                    <dd className="mt-1 truncate text-[13px] font-semibold text-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[11px] text-muted-foreground">
                {vitalsStatus || "No recent vitals recorded."}
              </p>
            </div>
          )}
        </ProfileSection>
      ) : null}

      {showWellnessSections || showClinicalSections ? (
        <ProfileSection
          title="AI Summary"
          actions={
            <>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-[10px] border border-border/70 px-3 text-[13px] font-medium text-foreground whitespace-nowrap transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                onClick={() => router.push("/?panel=chat&threadId=med-profile&context=profile")}
              >
                Discuss in chat
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-primary/70 bg-primary px-3 text-[13px] font-semibold text-primary-foreground whitespace-nowrap shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onRecomputeRisk}
                disabled={recomputeBusy}
              >
                {recomputeBusy ? "Computing…" : "Recompute risk"}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-[13px]">
            <div className="space-y-2">
              <p
                className="whitespace-pre-wrap text-[14px] leading-[1.6] text-foreground"
                style={
                  !summaryExpanded && summaryShouldClamp
                    ? { display: "-webkit-box", WebkitLineClamp: 7, WebkitBoxOrient: "vertical", overflow: "hidden" }
                    : undefined
                }
              >
                {summaryText}
              </p>
              {summaryShouldClamp ? (
                <button
                  type="button"
                  className="text-[12px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  onClick={() => setSummaryExpanded(expanded => !expanded)}
                >
                  {summaryExpanded ? "Show less" : "Show more"}
                </button>
              ) : null}
            </div>
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/5 dark:text-amber-200">
              <span aria-hidden>⚠️</span>
              <span className="truncate">
                This is AI-generated support, not a medical diagnosis. Always consult a clinician.
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="space-y-2 rounded-[10px] border border-border/60 bg-muted/20 p-3 dark:border-border/30 dark:bg-muted/10">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Meds</h4>
                {medications.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {medications.map(med => (
                      <MedicationTag
                        key={`summary-${med.key}`}
                        label={formatMedicationLabel(med)}
                        onRemove={() => handleRemoveMedication(med)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground">No medications recorded yet.</p>
                )}
                {summaryMedsEditing ? (
                  <div className="space-y-2">
                    <MedicationInput
                      onSave={handleAddMedication}
                      placeholder="Add a medication"
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                        onClick={() => setSummaryMedsEditing(false)}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                    onClick={() => setSummaryMedsEditing(true)}
                  >
                    Add medication
                  </button>
                )}
              </div>
              <div className="space-y-2 rounded-[10px] border border-border/60 bg-muted/20 p-3 dark:border-border/30 dark:bg-muted/10">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Symptoms &amp; Notes</h4>
                {displayedNotes && !notesEditing ? (
                  <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">{displayedNotes}</p>
                ) : !notesEditing ? (
                  <p className="text-[12px] text-muted-foreground">{NO_DATA_TEXT}</p>
                ) : null}
                {notesEditing ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full rounded-[10px] border border-border/70 bg-background px-3 py-2 text-[13px] leading-relaxed shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                      rows={3}
                      value={notesDraft}
                      onChange={e => setNotesDraft(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-[10px] border border-primary/70 bg-primary px-3 text-[13px] font-semibold text-primary-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                      >
                        {savingNotes ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[13px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border/40"
                        onClick={() => setNotesEditing(false)}
                        disabled={savingNotes}
                      >
                        Cancel
                      </button>
                      {manualNotes ? (
                        <button
                          type="button"
                          className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[13px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border/40"
                          onClick={handleClearNotes}
                          disabled={savingNotes}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : displayedNotes ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                      onClick={() => {
                        setNotesDraft(displayedNotes ?? "");
                        setNotesEditing(true);
                      }}
                    >
                      Edit
                    </button>
                    {manualNotes ? (
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 dark:border-border/40"
                        onClick={handleClearNotes}
                        disabled={savingNotes}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                    onClick={() => {
                      setNotesDraft("");
                      setNotesEditing(true);
                    }}
                  >
                    Add notes
                  </button>
                )}
              </div>
              <div className="space-y-2 rounded-[10px] border border-border/60 bg-muted/20 p-3 dark:border-border/30 dark:bg-muted/10">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Steps</h4>
                {displayedNextSteps && !nextStepsEditing ? (
                  <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">{displayedNextSteps}</p>
                ) : !nextStepsEditing ? (
                  <p className="text-[12px] text-muted-foreground">{NO_DATA_TEXT}</p>
                ) : null}
                {nextStepsEditing ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full rounded-[10px] border border-border/70 bg-background px-3 py-2 text-[13px] leading-relaxed shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                      rows={3}
                      value={nextStepsDraft}
                      onChange={e => setNextStepsDraft(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-[10px] border border-primary/70 bg-primary px-3 text-[13px] font-semibold text-primary-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleSaveNextSteps}
                        disabled={savingNextSteps}
                      >
                        {savingNextSteps ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[13px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border/40"
                        onClick={() => setNextStepsEditing(false)}
                        disabled={savingNextSteps}
                      >
                        Cancel
                      </button>
                      {manualNextSteps ? (
                        <button
                          type="button"
                          className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[13px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border/40"
                          onClick={handleClearNextSteps}
                          disabled={savingNextSteps}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : displayedNextSteps ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                      onClick={() => {
                        setNextStepsDraft(displayedNextSteps ?? "");
                        setNextStepsEditing(true);
                      }}
                    >
                      Edit
                    </button>
                    {manualNextSteps ? (
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 dark:border-border/40"
                        onClick={handleClearNextSteps}
                        disabled={savingNextSteps}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
                    onClick={() => {
                      setNextStepsDraft("");
                      setNextStepsEditing(true);
                    }}
                  >
                    Add next steps
                  </button>
                )}
              </div>
            </div>
            {showClinicalSections ? (
              <div className="rounded-[10px] border border-border/60 bg-muted/20 p-3 text-[13px] dark:border-border/30 dark:bg-muted/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI prediction</div>
                <div className="mt-1 whitespace-pre-wrap text-[13px] font-semibold text-foreground">
                  {predictionText && predictionText !== NO_DATA_TEXT
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
          title="Active Meds"
          actions={
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-[10px] border border-border/70 px-3 text-[13px] font-medium text-foreground whitespace-nowrap transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
              onClick={() => setShowMedicationComposer(open => !open)}
            >
              {showMedicationComposer || medications.length === 0 ? "Close" : "Add"}
            </button>
          }
        >
          <div className="space-y-3 text-[13px]">
            {medications.length ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {medications.map(med => (
                    <MedicationTag
                      key={med.key}
                      label={formatMedicationLabel(med)}
                      onRemove={() => handleRemoveMedication(med)}
                    />
                  ))}
                </div>
                <ul className="space-y-2.5">
                  {medications.map(med => (
                    <li
                      key={`row-${med.key}`}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-border/60 bg-background px-3 py-2.5 dark:border-border/30 dark:bg-muted/10"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-foreground">{med.name}</p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {med.doseLabel || buildDoseLabelFromParts(med.doseValue ?? null, med.doseUnit) || "No dose recorded"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-9 shrink-0 items-center rounded-[10px] border border-border/70 px-3 text-[12px] font-medium text-foreground whitespace-nowrap transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 dark:border-border/40"
                        onClick={() => handleRemoveMedication(med)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[12px] text-muted-foreground">No medications recorded yet.</p>
            )}
            {showMedicationComposer || medications.length === 0 ? (
              <div className="rounded-[10px] border border-border/60 bg-background/80 p-3 shadow-sm dark:border-border/30 dark:bg-muted/10">
                <MedicationInput
                  onSave={handleAddMedication}
                  placeholder="Add a medication"
                  autoFocus={showMedicationComposer || medications.length === 0}
                />
              </div>
            ) : null}
          </div>
        </ProfileSection>
      ) : null}
    </div>
  );
}

function extractMedicationEntries(data: any): MedicationEntry[] {
  if (!data) return [];

  const entries: MedicationEntry[] = [];
  const profile = (data?.profile as any) ?? data ?? {};
  const groups = (profile?.groups as any) ?? {};
  const groupMeds = Array.isArray(groups?.medications) ? groups.medications : [];
  for (const item of groupMeds) {
    const med = normalizeMedicationItem(item);
    if (med) entries.push(med);
  }

  const profileMeds = Array.isArray(profile?.medications) ? profile.medications : [];
  for (const item of profileMeds) {
    const med = normalizeMedicationItem(item);
    if (med) entries.push(med);
  }

  const observationMeds = Array.isArray(profile?.observations) ? profile.observations : [];
  for (const item of observationMeds) {
    if (typeof item?.kind === "string" && item.kind.toLowerCase() !== "medication") {
      continue;
    }
    const med = normalizeMedicationItem(item);
    if (med) entries.push(med);
  }

  return dedupeMedicationList(entries);
}

function normalizeMedicationItem(raw: any): MedicationEntry | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return {
      key: buildMedicationKey(trimmed, null),
      name: trimmed,
    };
  }

  if (Array.isArray(raw)) return null;

  const rawUnit = typeof raw.unit === "string" ? raw.unit.trim() : null;
  if (rawUnit && rawUnit.toLowerCase() === "__deleted__") return null;
  if (raw?.meta?.deleted) return null;

  const normalizedKind = typeof raw.kind === "string" ? raw.kind.toLowerCase() : "";
  const normalizedGroup = typeof raw.group === "string" ? raw.group.toLowerCase() : "";
  const normalizedCategory = typeof raw.category === "string" ? raw.category.toLowerCase() : "";
  if (
    normalizedKind &&
    normalizedKind !== "medication" &&
    !normalizedKind.startsWith("medication") &&
    normalizedGroup !== "medications" &&
    normalizedCategory !== "medication"
  ) {
    return null;
  }

  const observationId =
    raw.observation_id ?? raw.observationId ?? raw.id ?? raw.meta?.observation_id ?? raw.meta?.observationId ?? null;

  const keyCandidate = [raw.key, raw.kind]
    .map(value => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean);

  const possibleNames = [
    raw.name,
    raw.label,
    raw.title,
    raw.medication,
    raw.value_text,
    raw.valueText,
    raw.meta?.normalizedName,
    raw.meta?.label,
  ];

  const derivedName = keyCandidate ? deriveMedicationNameFromKey(keyCandidate) : null;
  const nameCandidate = possibleNames.find(value => typeof value === "string" && value.trim());
  const name = (nameCandidate || derivedName || "").toString().trim();
  if (!name) return null;

  const doseTextCandidate = [
    raw.meta?.doseLabel,
    raw.meta?.dose,
    raw.metadata?.dose,
    raw.dose,
    raw.sig,
  ]
    .map(value => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean);

  const numericCandidates = [raw.value_num, raw.valueNum, raw.value, raw.meta?.doseValue, raw.meta?.value_num];
  let doseValue: number | null = null;
  for (const candidate of numericCandidates) {
    const parsed = parseNumber(candidate);
    if (parsed != null) {
      doseValue = parsed;
      break;
    }
  }

  const unitCandidate = rawUnit || (typeof raw.meta?.unit === "string" ? raw.meta.unit.trim() : null);
  const doseLabel = doseTextCandidate || buildDoseLabelFromParts(doseValue, unitCandidate);

  return {
    key: buildMedicationKey(name, doseLabel || null, {
      observationId,
      rawKey: typeof raw.key === "string" ? raw.key : null,
    }),
    name,
    doseLabel: doseLabel || null,
    doseValue: doseValue ?? null,
    doseUnit: unitCandidate ?? null,
    observationId,
    rxnormId:
      raw.rxnormId ??
      raw.rxnorm_id ??
      raw.rxcui ??
      raw.meta?.rxnormId ??
      raw.meta?.rxcui ??
      null,
  };
}

function dedupeMedicationList(input: MedicationEntry[]): MedicationEntry[] {
  const map = new Map<string, MedicationEntry>();
  for (const med of input) {
    const dedupeKey =
      med.observationId != null
        ? `id-${med.observationId}`
        : `${med.name.toLowerCase()}|${(med.doseLabel ?? "").toLowerCase()}`;
    if (!map.has(dedupeKey)) {
      map.set(dedupeKey, med);
    }
  }
  return Array.from(map.values());
}

function formatMedicationLabel(med: MedicationEntry) {
  const doseLabel = med.doseLabel || buildDoseLabelFromParts(med.doseValue ?? null, med.doseUnit);
  return doseLabel ? `${med.name} ${doseLabel}` : med.name;
}

function parseDoseString(raw: string | null) {
  if (!raw) {
    return { doseLabel: null, doseUnit: null, doseValue: null };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { doseLabel: null, doseUnit: null, doseValue: null };
  }

  const match = trimmed.match(/([\d.,]+)\s*([\p{L}%µμ\/]+)?/u);
  let doseValue: number | null = null;
  let doseUnit: string | null = null;
  if (match) {
    const numeric = Number(match[1].replace(/,/g, ""));
    doseValue = Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : null;
    doseUnit = match[2] ? match[2].toLowerCase() : null;
  }

  return {
    doseLabel: trimmed,
    doseUnit,
    doseValue,
  };
}

function buildMedicationKey(
  name: string,
  doseLabel: string | null,
  opts: { observationId?: string | number | null; rawKey?: string | null; fallbackId?: string | number } = {}
) {
  if (opts.observationId != null) {
    return `obs-${opts.observationId}`;
  }
  if (opts.rawKey) {
    return `raw-${opts.rawKey}`;
  }
  if (opts.fallbackId != null) {
    return `tmp-${opts.fallbackId}`;
  }
  const base = slugifyToken(name);
  const dose = slugifyToken(doseLabel || "");
  return `med-${base || "entry"}-${dose || "none"}`;
}

function slugifyToken(value: string | null | undefined) {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function deriveMedicationNameFromKey(key: string) {
  const cleaned = key.replace(/^medication[_:]+/i, "");
  if (!cleaned) return "";
  return cleaned
    .split(/[_:]+/)
    .filter(Boolean)
    .map(part => part.replace(/\b\w/g, c => c.toUpperCase()))
    .join(" ");
}

function buildDoseLabelFromParts(value: number | null, unit: string | null) {
  if (value == null && !unit) return null;
  const numeric = value != null ? Number(value.toFixed(value % 1 ? 1 : 0)) : null;
  const parts = [] as string[];
  if (numeric != null) parts.push(String(numeric));
  if (unit) parts.push(unit);
  return parts.length ? parts.join(" ") : null;
}
