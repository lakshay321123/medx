"use client";

import { useMemo, type ReactNode } from "react";
import Section from "./Section";
import KV from "./KV";
import Divider from "./Divider";
import Row from "./Row";
import Empty from "./Empty";
import Button from "./Button";
import {
  IconBot,
  IconCheck,
  IconDna,
  IconFlask,
  IconNote,
  IconPill,
  IconUser,
  IconUsers,
} from "./AISummaryIcons";
import type { MedicationEntry } from "@/components/panels/MedicalProfile";
import { formatMedicationLabel } from "@/components/panels/MedicalProfile";

const NO_DATA = "No data available";

// Utils (local to this file)
function fmtDate(d?: string | number | Date) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export type LabLike = {
  name?: string;
  value?: string | number;
  unit?: string;
  collectedAt?: string | number | Date;
  type?: string;
};

function buildLabsLine(labs?: LabLike[], limit = 5): string {
  if (!labs || !Array.isArray(labs) || labs.length === 0) return NO_DATA;

  const sorted = [...labs].sort((a, b) => {
    const ta = new Date(a.collectedAt ?? 0).getTime();
    const tb = new Date(b.collectedAt ?? 0).getTime();
    return (tb || 0) - (ta || 0);
  });

  const parts: string[] = [];
  for (const lab of sorted.slice(0, limit)) {
    const name = lab.name?.trim();
    const val = lab.value != null ? String(lab.value).trim() : "";
    const unit = lab.unit?.trim();
    const when = fmtDate(lab.collectedAt);

    let piece = name || "";
    if (val) piece += piece ? ` ${val}` : val;
    if (unit) piece += ` ${unit}`;
    if (when) piece += ` (${when})`;
    if (piece) parts.push(piece);
  }

  return parts.length ? parts.join(", ") : NO_DATA;
}

export type MobileVitals = {
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: number | null;
  bmi?: number | null;
};

type MedicalProfileMobileProps = {
  fullName: string;
  sex: string;
  dob: string;
  bloodGroup: string;
  heightCm?: string | null;
  weightKg?: string | null;
  predispositions: string[];
  chronicConditions: string[];
  vitals: MobileVitals;
  medications: MedicationEntry[];
  labs?: LabLike[];
  labReports?: LabLike[];
  notes: string | null;
  nextSteps: string | null;
  predictionText: string;
  onEditPersonal?: () => void;
  onEditVitals?: () => void;
  onDiscussInChat?: () => void;
  onRecomputeRisk?: () => void;
  onAddMedication?: () => void;
  onAddNotes?: () => void;
  onAddNextSteps?: () => void;
};

function formatDobValue(dob: string) {
  if (!dob) return "—";
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return dob;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const now = Date.now();
  const age = Math.floor((now - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const base = `${day}/${month}/${year}`;
  if (Number.isFinite(age) && age >= 0) {
    return `${base} • Age: ${age}`;
  }
  return base;
}

function formatSex(value: string) {
  if (!value) return "—";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "—";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatHeight(value?: string | null) {
  if (!value) return "—";
  return `${value} cm`;
}

function formatWeight(value?: string | null) {
  if (!value) return "—";
  return `${value} kg`;
}

function formatPatientLine({
  fullName,
  sex,
  dob,
  bloodGroup,
}: {
  fullName: string;
  sex: string;
  dob: string;
  bloodGroup: string;
}) {
  const parts: string[] = [];
  if (fullName) parts.push(fullName);
  const descriptor: string[] = [];
  if (sex) descriptor.push(sex.toLowerCase());
  if (dob) {
    const date = new Date(dob);
    if (!Number.isNaN(date.getTime())) {
      const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (Number.isFinite(age) && age >= 0) descriptor.push(`${age} y`);
    }
  }
  if (bloodGroup) descriptor.push(bloodGroup);
  if (descriptor.length) parts.push(`(${descriptor.join(", ")})`);
  if (!parts.length) return NO_DATA;
  return parts.join(" ");
}

function joinValues(values: string[]) {
  const filtered = values.map(v => v.trim()).filter(Boolean);
  if (!filtered.length) return NO_DATA;
  return filtered.join(", ");
}

function buildMedicationSummary(medications: MedicationEntry[]) {
  if (!medications.length) return NO_DATA;
  return medications.map(med => formatMedicationLabel(med)).join(", ");
}

export default function MedicalProfileMobile({
  fullName,
  sex,
  dob,
  bloodGroup,
  heightCm,
  weightKg,
  predispositions,
  chronicConditions,
  vitals,
  medications,
  labs,
  labReports,
  notes,
  nextSteps,
  predictionText,
  onEditPersonal,
  onEditVitals,
  onDiscussInChat,
  onRecomputeRisk,
  onAddMedication,
  onAddNotes,
  onAddNextSteps,
}: MedicalProfileMobileProps) {
  const patientLine = useMemo(
    () =>
      formatPatientLine({
        fullName: fullName.trim(),
        sex: sex.trim(),
        dob: dob,
        bloodGroup: bloodGroup.trim(),
      }),
    [bloodGroup, dob, fullName, sex],
  );

  const predispositionsValue = useMemo(() => joinValues(predispositions), [predispositions]);
  const chronicValue = useMemo(() => joinValues(chronicConditions), [chronicConditions]);
  const medsSummary = useMemo(() => buildMedicationSummary(medications), [medications]);
  const labsLine = useMemo(() => {
    const labsSource = labs && labs.length ? labs : labReports ?? [];
    return buildLabsLine(labsSource, 5);
  }, [labReports, labs]);

  const symptomsLine = notes?.trim() ? notes.trim() : NO_DATA;
  const nextStepsLine = nextSteps?.trim() ? nextSteps.trim() : NO_DATA;
  const predictionLine = predictionText?.trim() ? predictionText.trim() : NO_DATA;

  const medicationsList = medications.map(med => ({ key: med.key, label: formatMedicationLabel(med) }));

  const bpValue =
    vitals.systolic != null && vitals.diastolic != null
      ? `${vitals.systolic}/${vitals.diastolic} mmHg`
      : "—";
  const heartRateValue = vitals.heartRate != null ? `${vitals.heartRate} bpm` : "—";
  const bmiValue = vitals.bmi != null ? `${vitals.bmi}` : "—";

  return (
    <div className="space-y-4 px-4 py-4">
      <Section
        title="Personal details"
        actionLabel="Edit"
        primary
        onActionClick={onEditPersonal}
        actionAriaLabel="Edit personal details"
      >
        <div className="space-y-3">
          <KV label="Name" value={fullName || "—"} />
          <KV label="Sex" value={formatSex(sex)} />
          <KV label="DOB" value={formatDobValue(dob)} />
          <KV label="Blood group" value={bloodGroup || "—"} />
          <KV label="Height (cm)" value={formatHeight(heightCm)} />
          <KV label="Weight (kg)" value={formatWeight(weightKg)} />
        </div>
        <Divider />
        <div className="space-y-3">
          <KV label="Predispositions" value={predispositionsValue} />
          <KV label="Chronic conditions" value={chronicValue} />
        </div>
      </Section>

      <Section
        title="Vitals"
        actionLabel="Edit"
        primary
        onActionClick={onEditVitals}
        actionAriaLabel="Edit vitals"
      >
        <div className="space-y-2">
          <Row label="Blood pressure" value={bpValue} muted={bpValue === "—"} />
          <Row label="Heart rate" value={heartRateValue} bold={heartRateValue !== "—"} />
          <Row label="BMI" value={bmiValue} bold={bmiValue !== "—"} />
        </div>
      </Section>

      <Section title="AI Summary">
        <div className="space-y-3 text-[13px] leading-[1.45]">
          <div className="space-y-3">
            <SummaryLine icon={<IconUser aria-hidden="true" />} label="Patient" value={patientLine} />
            <SummaryLine icon={<IconDna aria-hidden="true" />} label="Chronic" value={chronicValue} />
            <SummaryLine icon={<IconUsers aria-hidden="true" />} label="Predispositions" value={predispositionsValue} />
            <SummaryLine icon={<IconPill aria-hidden="true" />} label="Active meds" value={medsSummary} />
            <SummaryLine icon={<IconFlask aria-hidden="true" />} label="Recent labs" value={labsLine} />
            <SummaryLine icon={<IconBot aria-hidden="true" />} label="AI Prediction" value={predictionLine} />
            <SummaryLine icon={<IconNote aria-hidden="true" />} label="Symptoms/Notes" value={symptomsLine} />
            <SummaryLine icon={<IconCheck aria-hidden="true" />} label="Next Steps" value={nextStepsLine} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              onClick={onDiscussInChat}
              aria-label="Discuss in chat"
            >
              Discuss in chat
            </Button>
            <Button primary onClick={onRecomputeRisk} aria-label="Recompute risk">
              Recompute risk
            </Button>
          </div>
        </div>
      </Section>

      <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-3 text-[13px] dark:border-amber-800 dark:bg-amber-900/20">
        <p className="font-medium">⚠️ AI support, not a medical diagnosis.</p>
        <p>Always consult a clinician.</p>
      </div>

      <Section title="Medications">
        <div className="space-y-3">
          {medicationsList.length ? (
            <div className="space-y-2">
              {medicationsList.map(item => (
                <div key={item.key} className="text-[13px] font-semibold leading-5 text-slate-700 dark:text-slate-200">
                  {item.label}
                </div>
              ))}
            </div>
          ) : (
            <Empty>No medications recorded yet.</Empty>
          )}
          <Button variant="outline" onClick={onAddMedication} aria-label="Add medication">
            Add medication
          </Button>
        </div>
      </Section>

      <Section title="Symptoms & Notes">
        <div className="space-y-3">
          {symptomsLine === NO_DATA ? (
            <Empty>No data available.</Empty>
          ) : (
            <p className="whitespace-pre-line text-[13px] leading-6 text-slate-700 dark:text-slate-200">{symptomsLine}</p>
          )}
          <Button variant="outline" onClick={onAddNotes} aria-label="Add notes">
            Add notes
          </Button>
        </div>
      </Section>

      <Section title="Next Steps">
        <div className="space-y-3">
          {nextStepsLine === NO_DATA ? (
            <Empty>No data available.</Empty>
          ) : (
            <p className="whitespace-pre-line text-[13px] leading-6 text-slate-700 dark:text-slate-200">{nextStepsLine}</p>
          )}
          <Button variant="outline" onClick={onAddNextSteps} aria-label="Add next steps">
            Add next steps
          </Button>
        </div>
      </Section>
    </div>
  );
}

type SummaryLineProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function SummaryLine({ icon, label, value }: SummaryLineProps) {
  const isPlaceholder = value === NO_DATA;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5" aria-hidden="true">
        {icon}
      </span>
      <div className="flex-1 space-y-1">
        <div className="text-[11px] tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
        <div
          className={`text-[13px] leading-5 ${
            isPlaceholder ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-100"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
