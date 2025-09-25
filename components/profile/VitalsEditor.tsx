"use client";

import { useState } from "react";

import { pushToast } from "@/lib/ui/toast";

type NumericLike = number | string | null | undefined;

export type VitalsEditorProps = {
  initialSystolic: NumericLike;
  initialDiastolic: NumericLike;
  initialHeartRate: NumericLike;
  heightCm: number | null;
  weightKg: number | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
};

export default function VitalsEditor({
  initialSystolic,
  initialDiastolic,
  initialHeartRate,
  heightCm,
  weightKg,
  onCancel,
  onSaved,
}: VitalsEditorProps) {
  const [systolic, setSystolic] = useState(toInputValue(initialSystolic));
  const [diastolic, setDiastolic] = useState(toInputValue(initialDiastolic));
  const [heartRate, setHeartRate] = useState(toInputValue(initialHeartRate));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bmi = computeBmi(heightCm, weightKg);

  const handleSave = async () => {
    const systolicValue = toNumber(systolic);
    const diastolicValue = toNumber(diastolic);
    const heartRateValue = toNumber(heartRate);

    if (
      systolicValue == null &&
      diastolicValue == null &&
      heartRateValue == null
    ) {
      setError("Enter at least one vital to save.");
      return;
    }

    const observedAt = new Date().toISOString();

    const observations = [
      systolicValue != null
        ? {
            kind: "bp_systolic",
            value: systolicValue,
            unit: "mmHg",
            observedAt,
          }
        : null,
      diastolicValue != null
        ? {
            kind: "bp_diastolic",
            value: diastolicValue,
            unit: "mmHg",
            observedAt,
          }
        : null,
      heartRateValue != null
        ? {
            kind: "heart_rate",
            value: heartRateValue,
            unit: "bpm",
            observedAt,
          }
        : null,
      bmi != null
        ? {
            kind: "bmi",
            value: bmi,
            unit: "kg/m2",
            observedAt,
          }
        : null,
    ].filter(Boolean);

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to save vitals.");
      }

      pushToast({ title: "Vitals updated" });
      await onSaved();
    } catch (err: any) {
      const message = err?.message || "Couldn't save vitals.";
      setError(message);
      pushToast({
        title: "Couldn't save vitals",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Systolic (mmHg)
          </span>
          <input
            type="number"
            inputMode="numeric"
            className="rounded-md border px-3 py-2"
            placeholder="120"
            value={systolic}
            onChange={event => setSystolic(event.target.value)}
            disabled={isSaving}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Diastolic (mmHg)
          </span>
          <input
            type="number"
            inputMode="numeric"
            className="rounded-md border px-3 py-2"
            placeholder="80"
            value={diastolic}
            onChange={event => setDiastolic(event.target.value)}
            disabled={isSaving}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Heart rate (BPM)
          </span>
          <input
            type="number"
            inputMode="numeric"
            className="rounded-md border px-3 py-2"
            placeholder="72"
            value={heartRate}
            onChange={event => setHeartRate(event.target.value)}
            disabled={isSaving}
          />
        </label>
      </div>

      <div className="text-sm text-muted-foreground">
        BMI: <span className="font-medium">{bmi ?? "—"}</span>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center rounded-md border bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow disabled:opacity-60"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function toInputValue(value: NumericLike) {
  if (value == null) return "";
  const str = String(value).trim();
  return Number.isFinite(Number(str)) ? str : "";
}

function toNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeBmi(heightCm: number | null, weightKg: number | null) {
  if (!heightCm || !weightKg) return null;
  const heightMeters = heightCm / 100;
  if (!heightMeters) return null;
  const bmi = weightKg / (heightMeters * heightMeters);
  if (!Number.isFinite(bmi)) return null;
  return Number(bmi.toFixed(1));
}
