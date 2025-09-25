"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import PanelLoader from "@/components/mobile/PanelLoader";
import { safeJson } from "@/lib/safeJson";
import { useProfile } from "@/lib/hooks/useAppData";
import { useModeController } from "@/hooks/useModeController";

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

type Observation = {
  id: string;
  kind: string;
  name: string | null;
  value: any;
  unit: string | null;
  observedAt: string;
  threadId?: string | null;
  meta?: any;
};

type ManualNoteKey = "chronic" | "symptoms" | "nextSteps";

const NOTE_FIELD_CONFIG: Record<ManualNoteKey, { label: string; placeholder: string }> = {
  chronic: {
    label: "Chronic Conditions notes",
    placeholder: "Add chronic conditions that aren’t in the reports…",
  },
  symptoms: {
    label: "Symptoms",
    placeholder: "Document key symptoms or patient-reported concerns…",
  },
  nextSteps: {
    label: "Next Steps",
    placeholder: "Add follow-up plans, screenings, or clinician instructions…",
  },
};

const GROUP_ORDER = [
  "vitals",
  "labs",
  "imaging",
  "medications",
  "diagnoses",
  "procedures",
  "immunizations",
  "notes",
  "other",
] as const;

const GROUP_TITLES: Record<(typeof GROUP_ORDER)[number], string> = {
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

function ageFromDob(dob?: string | null) {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

function normalizeKey(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function parseNumberish(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const num = parseFloat(match[0]);
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

function parseHeight(value: unknown, unit?: string | null) {
  const num = parseNumberish(value);
  if (num == null) return null;
  const u = unit?.toLowerCase() ?? "";
  if (u.includes("cm")) return num;
  if (u.includes("meter")) return num * 100;
  if (!u && num < 3) return num * 100;
  return num;
}

function parseWeight(value: unknown, unit?: string | null) {
  const num = parseNumberish(value);
  if (num == null) return null;
  const u = unit?.toLowerCase() ?? "";
  if (u.includes("kg")) return num;
  if (u.includes("lb") || u.includes("pound")) return +(num / 2.20462).toFixed(1);
  return num;
}

function parseBloodPressure(value: unknown) {
  const initial = { systolic: "", diastolic: "" };
  if (value == null) return initial;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const s = parseNumberish(obj.systolic);
    const d = parseNumberish(obj.diastolic);
    return {
      systolic: s != null ? String(Math.round(s)) : initial.systolic,
      diastolic: d != null ? String(Math.round(d)) : initial.diastolic,
    };
  }
  const str = String(value);
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === "object") {
      return parseBloodPressure(parsed);
    }
  } catch {}
  const match = str.match(/(\d{2,3})\D+(\d{2,3})/);
  if (match) {
    return { systolic: match[1], diastolic: match[2] };
  }
  const num = parseNumberish(str);
  if (num != null) {
    return { systolic: String(Math.round(num)), diastolic: initial.diastolic };
  }
  return initial;
}

function computeBmi(heightCm: number | null, weightKg: number | null) {
  if (!heightCm || !weightKg) return "";
  const meters = heightCm / 100;
  if (!meters) return "";
  const bmi = weightKg / (meters * meters);
  if (!Number.isFinite(bmi)) return "";
  return bmi.toFixed(1);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function dedupeStrings(list: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (!item) continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

const DOSE_PATTERN = /\b\d+(?:\.\d+)?\s*(mg|mcg|µg|ug|g|ml|iu)\b/i;

function hasDose(text: string) {
  return DOSE_PATTERN.test(text.replace(/\s+/g, "")) || DOSE_PATTERN.test(text);
}

function normalizeMedicationLabel(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function slugifyMedication(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  description?: React.ReactNode;
  defaultOpen?: boolean;
};

function ProfileSection({ title, children, actions, description, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border">
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2 font-semibold"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <span>{title}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {actions ? <div className="flex flex-wrap items-center gap-2 text-xs">{actions}</div> : null}
      </div>
      {description ? <p className="px-4 pt-3 text-xs text-muted-foreground">{description}</p> : null}
      {open ? <div className="px-4 pb-4 pt-3 space-y-3">{children}</div> : null}
    </section>
  );
}

function MedicationTag({ label, onRemove, disabled }: { label: string; onRemove?: () => void; disabled?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-muted-foreground transition hover:text-red-500 disabled:opacity-50"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
export default function MedicalProfile() {
  const { data, error, isLoading, mutate } = useProfile();
  const { state: modeState } = useModeController();
  const baseMode = modeState.base === "aidoc" ? "ai-doc" : modeState.base === "doctor" ? "clinical" : "wellness";
  const isWellness = baseMode === "wellness";
  const isClinical = baseMode === "clinical";
  const isAiDoc = baseMode === "ai-doc";

  const router = useRouter();
  const params = useSearchParams();
  const threadIdParam = params.get("threadId") || "default";

  const [obs, setObs] = useState<Observation[]>([]);
  const [obsLoading, setObsLoading] = useState(true);
  const [obsError, setObsError] = useState<string | null>(null);

  const loadObservations = useCallback(async () => {
    setObsLoading(true);
    setObsError(null);
    try {
      const list = await safeJson(fetch("/api/observations"));
      setObs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load observations", err);
      setObsError(err instanceof Error ? err.message : "Couldn’t load latest observations");
      setObs([]);
    } finally {
      setObsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadObservations();
  }, [loadObservations]);

  useEffect(() => {
    const handler = () => {
      void loadObservations();
      void mutate();
    };
    window.addEventListener("observations-updated", handler);
    return () => window.removeEventListener("observations-updated", handler);
  }, [loadObservations, mutate]);

  const [summary, setSummary] = useState<string>("");
  const [reasons, setReasons] = useState<string>("");

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/profile/summary", { cache: "no-store" });
      const body = await res.json();
      if (body?.text) setSummary(body.text);
      else if (body?.summary) setSummary(body.summary);
      if (body?.reasons) setReasons(body.reasons);
    } catch (err) {
      console.warn("Failed to load AI summary", err);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const prof = data?.profile ?? null;
  const [bootstrapped, setBootstrapped] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [predis, setPredis] = useState<string[]>([]);
  const [chronic, setChronic] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [resetting, setResetting] = useState<null | "obs" | "all" | "zero">(null);

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

  const [vitalDraft, setVitalDraft] = useState({
    systolic: "",
    diastolic: "",
    hr: "",
    heightCm: "",
    weightKg: "",
    bmi: "",
  });
  const [vitalsDirty, setVitalsDirty] = useState(false);
  const [vitalsSaving, setVitalsSaving] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);

  const vitalsGroup = data?.groups?.vitals ?? [];
  const labsGroup = data?.groups?.labs ?? [];
  const diagnosesGroup = data?.groups?.diagnoses ?? [];
  const notesGroup = data?.groups?.notes ?? [];

  const bpItem = vitalsGroup.find((it: any) => normalizeKey(it.key) === "bp" || normalizeKey(it.label) === "bp");
  const hrItem = vitalsGroup.find((it: any) => normalizeKey(it.key) === "hr" || normalizeKey(it.label) === "hr");
  const heightItem = vitalsGroup.find((it: any) => normalizeKey(it.key) === "height");
  const weightItem = vitalsGroup.find((it: any) => normalizeKey(it.key) === "weight");
  const bmiItem = vitalsGroup.find((it: any) => normalizeKey(it.key) === "bmi");

  const latestHeight = parseHeight(heightItem?.value, heightItem?.unit);
  const latestWeight = parseWeight(weightItem?.value, weightItem?.unit);
  const latestHr = parseNumberish(hrItem?.value);
  const latestBp = parseBloodPressure(bpItem?.value);
  const latestBmi = parseNumberish(bmiItem?.value);

  useEffect(() => {
    if (!vitalsDirty) {
      setVitalDraft({
        systolic: latestBp.systolic,
        diastolic: latestBp.diastolic,
        hr: latestHr != null ? String(Math.round(latestHr)) : "",
        heightCm: latestHeight != null ? String(Math.round(latestHeight)) : "",
        weightKg: latestWeight != null ? String(latestWeight.toFixed(1)) : "",
        bmi: latestBmi != null
          ? latestBmi.toFixed(1)
          : computeBmi(latestHeight ?? null, latestWeight ?? null),
      });
    }
  }, [latestBp.systolic, latestBp.diastolic, latestHr, latestHeight, latestWeight, latestBmi, vitalsDirty]);

  useEffect(() => {
    if (!vitalsDirty) return;
    const heightNum = parseNumberish(vitalDraft.heightCm);
    const weightNum = parseNumberish(vitalDraft.weightKg);
    const nextBmi = computeBmi(heightNum, weightNum);
    setVitalDraft((prev) => ({ ...prev, bmi: nextBmi }));
  }, [vitalDraft.heightCm, vitalDraft.weightKg, vitalsDirty]);

  const prediction = data?.prediction ?? null;
  const [riskBusy, setRiskBusy] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const lastRiskRunRef = useRef<number>(0);
  const riskTimeoutRef = useRef<number | null>(null);
  const computeRisk = useCallback(
    async (manual: boolean) => {
      try {
        setRiskBusy(true);
        setRiskError(null);
        const threadId = "med-profile";
        if (manual) {
          const url = new URL(window.location.href);
          url.searchParams.set("panel", "ai-doc");
          url.searchParams.set("threadId", threadId);
          url.searchParams.set("context", "ai-doc-med-profile");
          history.replaceState(null, "", url.toString());
        }
        const res = await fetch("/api/predictions/compute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.ok === false) {
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        await mutate();
        await loadSummary();
        if (manual) {
          fetch("/api/aidoc/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "doctor",
              threadId,
              messages: [
                {
                  role: "user",
                  content:
                    "Recompute risk based on my latest profile and timeline. Summarize key risks & next steps.",
                },
              ],
              context: "ai-doc-med-profile",
              clientRequestId: `recompute-${Date.now()}`,
            }),
          }).catch(() => {});
        }
        lastRiskRunRef.current = Date.now();
      } catch (err) {
        console.error("Risk compute failed", err);
        if (manual) {
          const message = err instanceof Error ? err.message : "Risk compute failed";
          setRiskError(message);
          alert(`Recompute failed: ${message}`);
        }
      } finally {
        setRiskBusy(false);
      }
    },
    [loadSummary, mutate]
  );

  const queueRiskCompute = useCallback(() => {
    if (riskTimeoutRef.current != null) return;
    const elapsed = Date.now() - lastRiskRunRef.current;
    const delay = elapsed >= 60000 ? 0 : 60000 - elapsed;
    riskTimeoutRef.current = window.setTimeout(async () => {
      riskTimeoutRef.current = null;
      if (document.hidden) {
        queueRiskCompute();
        return;
      }
      await computeRisk(false);
    }, delay);
  }, [computeRisk]);

  useEffect(() => {
    return () => {
      if (riskTimeoutRef.current != null) window.clearTimeout(riskTimeoutRef.current);
    };
  }, []);

  const lastTrackedObs = useRef<string | null>(null);
  useEffect(() => {
    if (!obs.length) return;
    const interesting = obs.find((o) => o.kind !== "ai_summary");
    const stamp = interesting?.observedAt ?? null;
    if (!stamp) return;
    if (!lastTrackedObs.current && !prediction) {
      queueRiskCompute();
    }
    if (lastTrackedObs.current && lastTrackedObs.current !== stamp) {
      queueRiskCompute();
    }
    lastTrackedObs.current = stamp;
  }, [obs, prediction, queueRiskCompute]);

  const [manualNotes, setManualNotes] = useState<Record<ManualNoteKey, string>>({
    chronic: "",
    symptoms: "",
    nextSteps: "",
  });
  const [noteDirty, setNoteDirty] = useState<Record<ManualNoteKey, boolean>>({
    chronic: false,
    symptoms: false,
    nextSteps: false,
  });
  const [noteSaving, setNoteSaving] = useState<Record<ManualNoteKey, boolean>>({
    chronic: false,
    symptoms: false,
    nextSteps: false,
  });
  const [noteError, setNoteError] = useState<Record<ManualNoteKey, string | null>>({
    chronic: null,
    symptoms: null,
    nextSteps: null,
  });

  const manualNoteLookup = useMemo(() => {
    const map: Record<ManualNoteKey, Observation | null> = {
      chronic: null,
      symptoms: null,
      nextSteps: null,
    };
    for (const entry of obs) {
      const field = entry.meta?.profileField as ManualNoteKey | undefined;
      if (!field || !(field in map)) continue;
      if (!map[field]) map[field] = entry;
    }
    return map;
  }, [obs]);

  useEffect(() => {
    setManualNotes((prev) => {
      const next = { ...prev };
      (Object.keys(NOTE_FIELD_CONFIG) as ManualNoteKey[]).forEach((key) => {
        if (noteDirty[key]) return;
        const existing = manualNoteLookup[key]?.value;
        next[key] = typeof existing === "string" ? existing : "";
      });
      return next;
    });
  }, [manualNoteLookup, noteDirty]);

  const [medInput, setMedInput] = useState("");
  const [medValidation, setMedValidation] = useState<
    | null
    | {
        status: "validated";
        label: string;
        slug: string;
        rxcui?: string | null;
      }
    | {
        status: "suggest";
        suggestion: string;
        canonical: string;
        slug: string;
      }
  >(null);
  const [medError, setMedError] = useState<string | null>(null);
  const [medSaving, setMedSaving] = useState(false);

  const medicationEntries = useMemo(() => {
    const map = new Map<string, { id: string; label: string; source: string | null }>();
    for (const entry of obs) {
      const metaCat = String(entry.meta?.category || "").toLowerCase();
      const kind = entry.kind ? normalizeKey(entry.kind) : "";
      const looksMed =
        metaCat === "medication" ||
        metaCat === "prescription" ||
        kind.startsWith("med") ||
        kind.includes("medication");
      if (!looksMed) continue;
      const rawLabel =
        entry.meta?.label ||
        entry.meta?.medication ||
        entry.name ||
        (typeof entry.value === "string" ? entry.value : null);
      if (!rawLabel) continue;
      const label = normalizeMedicationLabel(String(rawLabel));
      const slug = slugifyMedication(label);
      if (!slug || map.has(slug)) continue;
      map.set(slug, {
        id: entry.id,
        label,
        source: entry.meta?.source || entry.meta?.source_type || null,
      });
    }
    return Array.from(map.values());
  }, [obs]);

  const medSlugSet = useMemo(() => new Set(medicationEntries.map((m) => slugifyMedication(m.label))), [medicationEntries]);

  const autoChronic = useMemo(() => {
    const list = diagnosesGroup
      .map((d: any) => d?.label || d?.value || d?.name || "")
      .filter(Boolean) as string[];
    return dedupeStrings(list);
  }, [diagnosesGroup]);

  const autoSymptoms = useMemo(() => {
    const list = notesGroup
      .map((n: any) => (typeof n?.value === "string" ? n.value : n?.label || ""))
      .filter(Boolean) as string[];
    return dedupeStrings(list).slice(0, 6);
  }, [notesGroup]);

  const autoNextSteps = useMemo(() => {
    const stepsFromPrediction = Array.isArray(prediction?.structured?.next_steps)
      ? prediction!.structured!.next_steps
      : Array.isArray(prediction?.structured?.risk?.next_steps)
      ? prediction!.structured!.risk!.next_steps
      : [];
    return dedupeStrings(stepsFromPrediction as string[]).slice(0, 6);
  }, [prediction]);
  const saveVitals = useCallback(async () => {
    const entries: any[] = [];
    const now = new Date().toISOString();
    const systolic = parseNumberish(vitalDraft.systolic);
    const diastolic = parseNumberish(vitalDraft.diastolic);
    if (systolic != null && diastolic != null) {
      entries.push({
        kind: "bp",
        value_text: `${Math.round(systolic)}/${Math.round(diastolic)}`,
        unit: "mmHg",
        observed_at: now,
        thread_id: "med-profile",
        meta: {
          category: "vital",
          label: "Blood Pressure",
          source: "manual",
          committed: true,
        },
      });
    }
    const hrVal = parseNumberish(vitalDraft.hr);
    if (hrVal != null) {
      entries.push({
        kind: "hr",
        value_num: hrVal,
        unit: "bpm",
        observed_at: now,
        thread_id: "med-profile",
        meta: {
          category: "vital",
          label: "Heart Rate",
          source: "manual",
          committed: true,
        },
      });
    }
    const heightVal = parseNumberish(vitalDraft.heightCm);
    if (heightVal != null) {
      entries.push({
        kind: "height",
        value_num: heightVal,
        unit: "cm",
        observed_at: now,
        thread_id: "med-profile",
        meta: {
          category: "vital",
          label: "Height",
          source: "manual",
          committed: true,
        },
      });
    }
    const weightVal = parseNumberish(vitalDraft.weightKg);
    if (weightVal != null) {
      entries.push({
        kind: "weight",
        value_num: weightVal,
        unit: "kg",
        observed_at: now,
        thread_id: "med-profile",
        meta: {
          category: "vital",
          label: "Weight",
          source: "manual",
          committed: true,
        },
      });
    }
    const bmiVal = parseNumberish(vitalDraft.bmi);
    if (bmiVal != null) {
      entries.push({
        kind: "bmi",
        value_num: bmiVal,
        observed_at: now,
        thread_id: "med-profile",
        meta: {
          category: "vital",
          label: "BMI",
          source: "manual",
          committed: true,
        },
      });
    }
    if (!entries.length) {
      setVitalsError("Enter at least one vital to save.");
      return;
    }
    setVitalsError(null);
    setVitalsSaving(true);
    try {
      for (const entry of entries) {
        await fetch("/api/observations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        }).then((r) => {
          if (!r.ok) throw new Error(`Save failed (${r.status})`);
          return r.json();
        });
      }
      setVitalsDirty(false);
      await loadObservations();
      await mutate();
      queueRiskCompute();
      window.dispatchEvent(new Event("observations-updated"));
    } catch (err) {
      console.error("Failed to save vitals", err);
      setVitalsError(err instanceof Error ? err.message : "Couldn’t save vitals");
    } finally {
      setVitalsSaving(false);
    }
  }, [loadObservations, mutate, queueRiskCompute, vitalDraft]);
  const saveManualNote = useCallback(
    async (key: ManualNoteKey) => {
      const text = manualNotes[key].trim();
      const existing = manualNoteLookup[key];
      setNoteError((prev) => ({ ...prev, [key]: null }));
      setNoteSaving((prev) => ({ ...prev, [key]: true }));
      try {
        if (!text) {
          if (existing) {
            await fetch("/api/observations/discard", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: existing.id }),
            });
          }
        } else {
          await fetch("/api/observations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: `profile_manual_${key}`,
              name: NOTE_FIELD_CONFIG[key].label,
              value_text: text,
              observed_at: new Date().toISOString(),
              thread_id: "med-profile",
              meta: {
                category: "note",
                profileField: key,
                source: "manual",
                committed: true,
              },
            }),
          }).then((r) => {
            if (!r.ok) throw new Error(`Save failed (${r.status})`);
            return r.json();
          });
        }
        setNoteDirty((prev) => ({ ...prev, [key]: false }));
        await loadObservations();
        await mutate();
      } catch (err) {
        console.error("Failed to save note", err);
        setNoteError((prev) => ({
          ...prev,
          [key]: err instanceof Error ? err.message : "Couldn’t save note",
        }));
      } finally {
        setNoteSaving((prev) => ({ ...prev, [key]: false }));
      }
    },
    [loadObservations, manualNotes, manualNoteLookup, mutate]
  );
  const saveMedication = useCallback(
    async (label: string, slug: string, rxcui?: string | null) => {
      setMedSaving(true);
      try {
        await fetch("/api/observations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: `med_${slug}`,
            name: label,
            value_text: label,
            observed_at: new Date().toISOString(),
            thread_id: "med-profile",
            meta: {
              category: "medication",
              label,
              slug,
              rxcui: rxcui ?? null,
              source: "manual",
              committed: true,
              input: medInput,
            },
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(`Save failed (${r.status})`);
          return r.json();
        });
        setMedInput("");
        setMedValidation(null);
        await loadObservations();
        await mutate();
        queueRiskCompute();
        window.dispatchEvent(new Event("observations-updated"));
      } catch (err) {
        console.error("Failed to save medication", err);
        setMedError(err instanceof Error ? err.message : "Couldn’t save medication");
      } finally {
        setMedSaving(false);
      }
    },
    [loadObservations, medInput, mutate, queueRiskCompute]
  );

  const handleMedicationAction = useCallback(async () => {
    if (medSaving) return;
    if (medValidation?.status === "validated") {
      if (medSlugSet.has(medValidation.slug)) {
        setMedError("Medication already saved.");
        return;
      }
      await saveMedication(medValidation.label, medValidation.slug, medValidation.rxcui);
      return;
    }
    const cleaned = normalizeMedicationLabel(medInput);
    if (!cleaned) {
      setMedError("Enter a medication name");
      return;
    }
    const slug = slugifyMedication(cleaned);
    if (!slug) {
      setMedError("Medication name is too short");
      return;
    }
    if (medSlugSet.has(slug)) {
      setMedError("Medication already added");
      return;
    }
    if (!hasDose(cleaned)) {
      setMedError("Include a dose (e.g., 500 mg)");
      return;
    }
    setMedError(null);
    setMedSaving(true);
    try {
      const res = await fetch("/api/meds/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned }),
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.ok && body?.suggestion) {
          const suggestion = normalizeMedicationLabel(body.suggestion);
          setMedValidation({
            status: "suggest",
            suggestion,
            canonical: body.canonical ? normalizeMedicationLabel(body.canonical) : suggestion,
            slug: slugifyMedication(suggestion),
          });
          return;
        }
      }
      setMedValidation({
        status: "validated",
        label: cleaned,
        slug,
      });
    } catch (err) {
      console.error("Medication validation failed", err);
      setMedError("Couldn’t validate medication right now");
    } finally {
      setMedSaving(false);
    }
  }, [medInput, medSaving, medSlugSet, medValidation, saveMedication]);

  const acceptMedicationSuggestion = useCallback(() => {
    if (medValidation?.status !== "suggest") return;
    const label = medValidation.suggestion;
    setMedInput(label);
    setMedValidation({
      status: "validated",
      label,
      slug: slugifyMedication(label),
    });
    setMedError(null);
  }, [medValidation]);

  const keepOriginalMedication = useCallback(() => {
    if (medValidation?.status !== "suggest") return;
    const label = normalizeMedicationLabel(medInput);
    setMedValidation({
      status: "validated",
      label,
      slug: slugifyMedication(label),
    });
    setMedError(null);
  }, [medInput, medValidation]);

  const removeMedication = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/observations/discard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        await loadObservations();
        await mutate();
        queueRiskCompute();
        window.dispatchEvent(new Event("observations-updated"));
      } catch (err) {
        console.error("Failed to remove medication", err);
        alert("Couldn’t remove medication. Please try again.");
      }
    },
    [loadObservations, mutate, queueRiskCompute]
  );
  const handleProfileSave = useCallback(async () => {
    setSavingProfile(true);
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
      await mutate();
      await loadSummary();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.error("Failed to save profile", err);
      alert(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSavingProfile(false);
    }
  }, [bloodGroup, chronic, dob, fullName, loadSummary, mutate, predis, sex]);

  const handleReset = useCallback(async () => {
    const pick = window.prompt(
      "Reset:\n1 = Clear observations\n2 = Clear everything (obs+pred+alerts)\n3 = Zero demo values\n\nEnter 1/2/3 or Cancel"
    );
    const map: Record<string, typeof resetting> = { "1": "obs", "2": "all", "3": "zero" };
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
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      window.dispatchEvent(new Event("observations-updated"));
      await loadObservations();
      await mutate();
    } catch (err) {
      console.error("Reset failed", err);
      alert(`Reset failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setResetting(null);
    }
  }, [loadObservations, mutate, resetting]);
  const autoByField: Record<ManualNoteKey, string[]> = {
    chronic: autoChronic,
    symptoms: autoSymptoms,
    nextSteps: autoNextSteps,
  };
  if (isLoading) return <PanelLoader label="Medical Profile" />;
  if (error)
    return (
      <div className="p-6 text-sm text-red-500">Couldn’t load profile. Retrying in background…</div>
    );
  if (!data)
    return <div className="p-6 text-sm text-muted-foreground">No profile yet.</div>;

  const vitalsLastUpdated = vitalsGroup[0]?.observedAt || null;
  const labsEmpty = labsGroup.length === 0;
  const medsEmpty = medicationEntries.length === 0;

  return (
    <div className="relative z-0 space-y-4 p-4 mobile-medical-profile md:p-6">
      <ProfileSection
        title="Wellness Info"
        actions={
          <>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              onClick={handleReset}
              disabled={!!resetting}
            >
              {resetting ? "Resetting…" : "Reset"}
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              onClick={handleProfileSave}
              disabled={savingProfile}
            >
              {savingProfile ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span>Name</span>
            <input
              className="rounded-md border px-3 py-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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
              onChange={(e) => setDob(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">Age: {ageFromDob(dob)}</span>
          </label>

          <label className="flex flex-col gap-1">
            <span>Sex</span>
            <select
              className="rounded-md border px-3 py-2"
              value={sex || ""}
              onChange={(e) => setSex(e.target.value)}
            >
              <option value="">—</option>
              {SEXES.map((s) => (
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
              onChange={(e) => setBloodGroup(e.target.value)}
            >
              <option value="">—</option>
              {BLOOD_GROUPS.map((bg) => (
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
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) {
                  e.preventDefault();
                  setPredis((prev) => Array.from(new Set([...prev, v])));
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              list="condlist"
            />
            <datalist id="condlist">
              {PRESET_CONDITIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="mt-1 flex flex-wrap gap-2">
              {predis.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="mobile-tappable inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-3 py-1 text-xs transition hover:bg-muted md:min-h-0 md:px-2.5 md:py-1"
                  onClick={() => setPredis((prev) => prev.filter((x) => x !== c))}
                  aria-label={`Remove ${c}`}
                >
                  <span className="truncate">{c}</span>
                  <span aria-hidden="true">×</span>
                </button>
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
                  e.preventDefault();
                  setChronic((prev) => Array.from(new Set([...prev, v])));
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              list="condlist"
            />
            <div className="mt-1 flex flex-wrap gap-2">
              {chronic.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="mobile-tappable inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-3 py-1 text-xs transition hover:bg-muted md:min-h-0 md:px-2.5 md:py-1"
                  onClick={() => setChronic((prev) => prev.filter((x) => x !== c))}
                  aria-label={`Remove ${c}`}
                >
                  <span className="truncate">{c}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          </label>
        </div>
      </ProfileSection>
      {(isWellness || isAiDoc) && (
        <ProfileSection
          title="Vitals"
          actions={
            vitalsLastUpdated ? (
              <span className="text-xs text-muted-foreground">
                Updated {formatDate(vitalsLastUpdated)}
              </span>
            ) : null
          }
        >
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase text-muted-foreground">Blood Pressure</span>
              <div className="flex items-center gap-2">
                <input
                  className="w-24 rounded-md border px-3 py-2"
                  value={vitalDraft.systolic}
                  onChange={(e) => {
                    setVitalsDirty(true);
                    setVitalDraft((prev) => ({ ...prev, systolic: e.target.value }));
                  }}
                  placeholder="SYS"
                  inputMode="numeric"
                />
                <span className="text-muted-foreground">/</span>
                <input
                  className="w-24 rounded-md border px-3 py-2"
                  value={vitalDraft.diastolic}
                  onChange={(e) => {
                    setVitalsDirty(true);
                    setVitalDraft((prev) => ({ ...prev, diastolic: e.target.value }));
                  }}
                  placeholder="DIA"
                  inputMode="numeric"
                />
                <span className="text-xs text-muted-foreground">mmHg</span>
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase text-muted-foreground">Heart Rate</span>
              <input
                className="rounded-md border px-3 py-2"
                value={vitalDraft.hr}
                onChange={(e) => {
                  setVitalsDirty(true);
                  setVitalDraft((prev) => ({ ...prev, hr: e.target.value }));
                }}
                placeholder="Heart Rate (BPM)"
                inputMode="numeric"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase text-muted-foreground">Height</span>
              <input
                className="rounded-md border px-3 py-2"
                value={vitalDraft.heightCm}
                onChange={(e) => {
                  setVitalsDirty(true);
                  setVitalDraft((prev) => ({ ...prev, heightCm: e.target.value }));
                }}
                placeholder="Height (cm)"
                inputMode="decimal"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase text-muted-foreground">Weight</span>
              <input
                className="rounded-md border px-3 py-2"
                value={vitalDraft.weightKg}
                onChange={(e) => {
                  setVitalsDirty(true);
                  setVitalDraft((prev) => ({ ...prev, weightKg: e.target.value }));
                }}
                placeholder="Weight (kg)"
                inputMode="decimal"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-xs uppercase text-muted-foreground">BMI</span>
              <input
                className="rounded-md border px-3 py-2 bg-muted/40"
                value={vitalDraft.bmi}
                readOnly
                placeholder="BMI auto-calculates from height & weight"
              />
            </label>
          </div>
          {vitalsError ? (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span>{vitalsError}</span>
            </div>
          ) : null}
          {obsError ? (
            <div className="text-xs text-amber-600">{obsError}</div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              onClick={saveVitals}
              disabled={!vitalsDirty || vitalsSaving}
            >
              {vitalsSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save vitals"
              )}
            </button>
            {!vitalsDirty && !vitalsSaving ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Synced
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                BMI updates automatically from height & weight.
              </span>
            )}
          </div>
        </ProfileSection>
      )}
      {(isWellness || isAiDoc) && (
        <ProfileSection title="Labs" description="Latest values from uploaded reports.">
          {labsEmpty ? (
            <p className="text-sm text-muted-foreground">No labs detected yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Observed</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {labsGroup.map((lab: any) => (
                    <tr key={`${lab.key}-${lab.observedAt}`} className="border-t">
                      <td className="px-3 py-2 font-medium">{lab.label}</td>
                      <td className="px-3 py-2">
                        {[lab.value, lab.unit].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-3 py-2">{formatDate(lab.observedAt)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{lab.source || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ProfileSection>
      )}
      {(isClinical || isAiDoc) && (
        <ProfileSection title="Clinical Notes" description="Auto-detected data from reports plus your manual notes.">
          {(Object.keys(NOTE_FIELD_CONFIG) as ManualNoteKey[]).map((key) => {
            const auto = autoByField[key];
            return (
              <div key={key} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">{NOTE_FIELD_CONFIG[key].label}</h4>
                  {auto.length ? (
                    <span className="text-xs text-muted-foreground">Report matches: {auto.length}</span>
                  ) : null}
                </div>
                {auto.length ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {auto.map((item) => (
                      <span key={item} className="rounded-full border px-2.5 py-1">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No structured data yet.</p>
                )}
                <textarea
                  className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                  placeholder={NOTE_FIELD_CONFIG[key].placeholder}
                  value={manualNotes[key]}
                  onChange={(e) => {
                    setManualNotes((prev) => ({ ...prev, [key]: e.target.value }));
                    setNoteDirty((prev) => ({ ...prev, [key]: true }));
                  }}
                />
                {noteError[key] ? (
                  <div className="flex items-center gap-2 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{noteError[key]}</span>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                    disabled={!noteDirty[key] || noteSaving[key]}
                    onClick={() => saveManualNote(key)}
                  >
                    {noteSaving[key] ? "Saving…" : "Save"}
                  </button>
                  {!noteDirty[key] && manualNotes[key].trim() ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </ProfileSection>
      )}
      {(isClinical || isAiDoc) && (
        <ProfileSection title="Medications" description="Manage active medications from uploads or manual entry.">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase text-muted-foreground">Add medication</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                value={medInput}
                onChange={(e) => {
                  setMedInput(e.target.value);
                  setMedValidation(null);
                  setMedError(null);
                }}
                placeholder="e.g., Metformin 500 mg"
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                onClick={handleMedicationAction}
                disabled={medSaving}
              >
                {medSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking…
                  </>
                ) : medValidation?.status === "validated" ? (
                  "Save medication"
                ) : (
                  "Validate"
                )}
              </button>
            </div>
            {medValidation?.status === "suggest" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <span>Did you mean {medValidation.suggestion}?</span>
                <button
                  type="button"
                  className="rounded border border-amber-600 px-2 py-1"
                  onClick={acceptMedicationSuggestion}
                >
                  Use suggestion
                </button>
                <button
                  type="button"
                  className="rounded border border-transparent px-2 py-1 text-amber-700 underline"
                  onClick={keepOriginalMedication}
                >
                  Keep original
                </button>
              </div>
            ) : null}
            {medError ? (
              <div className="flex items-center gap-2 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{medError}</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {medsEmpty ? (
              <p className="text-sm text-muted-foreground">
                {obsLoading ? "Loading medications…" : "No medications added yet."}
              </p>
            ) : (
              medicationEntries.map((med) => (
                <MedicationTag
                  key={med.id}
                  label={`${med.label}${med.source ? ` • ${med.source}` : ""}`}
                  onRemove={() => removeMedication(med.id)}
                />
              ))
            )}
          </div>
        </ProfileSection>
      )}
      {(isClinical || isAiDoc) && (
        <ProfileSection
          title="AI Risk Score"
          actions={
            <button
              id="recompute-risk-btn"
              type="button"
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              onClick={() => computeRisk(true)}
              disabled={riskBusy}
            >
              {riskBusy ? "Recomputing…" : "Recompute Risk"}
            </button>
          }
        >
          {prediction ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {prediction.name || "Risk Assessment"}
                </span>
                {prediction.band ? (
                  <span className="rounded-full border px-2 py-0.5 text-xs uppercase">
                    {prediction.band}
                  </span>
                ) : null}
                {prediction.probability != null ? (
                  <span className="text-xs text-muted-foreground">
                    {(prediction.probability * 100).toFixed(0)}%
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  Updated {formatDate(prediction.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">
                {prediction.summary || "Risk summary generated."}
              </p>
              {prediction.structured?.next_steps?.length ? (
                <div className="text-xs text-muted-foreground">
                  Next steps: {prediction.structured.next_steps.join(", ")}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No risk found yet.</p>
          )}
          {riskError ? (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{riskError}</span>
            </div>
          ) : null}
        </ProfileSection>
      )}
      {(isWellness || isAiDoc) && (
        <ProfileSection
          title="AI Tips"
          actions={
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
              onClick={async () => {
                try {
                  const profRes = await fetch("/api/profile", { cache: "no-store" })
                    .then((r) => r.json())
                    .catch(() => null);
                  const packet = await fetch("/api/profile/packet", { cache: "no-store" })
                    .then((r) => r.json())
                    .catch(() => ({ text: "" }));
                  const prefill = encodeURIComponent(
                    JSON.stringify({
                      kind: "profileSummary",
                      summary,
                      reasons,
                      profile: profRes?.profile || profRes || null,
                      packet: packet?.text || "",
                    })
                  );
                  router.push(`/?panel=chat&threadId=${threadIdParam}&context=profile&prefill=${prefill}`);
                } catch {
                  const prefill = encodeURIComponent(
                    JSON.stringify({ kind: "profileSummary", summary, reasons })
                  );
                  router.push(`/?panel=chat&threadId=${threadIdParam}&context=profile&prefill=${prefill}`);
                }
              }}
            >
              Discuss in Chat
            </button>
          }
        >
          <p className="whitespace-pre-wrap text-sm">{summary || "No summary yet."}</p>
          <div className="text-[11px] text-muted-foreground">
            ⚠️ This is AI-generated support, not a medical diagnosis. Always consult a qualified clinician.
          </div>
        </ProfileSection>
      )}
      {isAiDoc && data?.groups && (
        <ProfileSection title="Full Medical History" description="Latest finding per category from uploaded reports.">
          <div className="space-y-6">
            {GROUP_ORDER.map((key) => {
              const items = data.groups[key] || [];
              if (!items.length) return null;
              return (
                <div key={key} className="space-y-3">
                  <div className="text-sm font-semibold">{GROUP_TITLES[key]}</div>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
                    {items.slice(0, 6).map((item: any) => (
                      <div
                        key={`${item.key}-${item.observedAt}`}
                        className="flex min-w-0 flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground mobile-truncate-2">
                            {formatDate(item.observedAt)}
                            {item.source ? ` • ${item.source}` : ""}
                          </div>
                        </div>
                        <div className="min-w-0 text-sm font-medium sm:text-right">
                          <span className="block truncate">
                            {[item.value, item.unit].filter(Boolean).join(" ") || "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            Shows the latest item per finding from your uploads. Use Timeline for full history.
          </div>
        </ProfileSection>
      )}
    </div>
  );
}
