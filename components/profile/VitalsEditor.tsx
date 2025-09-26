"use client";

import { useEffect, useState } from "react";

import { pushToast } from "@/lib/ui/toast";

type NumericLike = number | string | null | undefined;

export type VitalsEditorProps = {
  initialSystolic: NumericLike;
  initialDiastolic: NumericLike;
  initialHeartRate: NumericLike;
  initialBmi?: NumericLike;
  heightCm: number | null;
  weightKg: number | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
};

export default function VitalsEditor({
  initialSystolic,
  initialDiastolic,
  initialHeartRate,
  initialBmi,
  heightCm,
  weightKg,
  onCancel,
  onSaved,
}: VitalsEditorProps) {
  const [systolic, setSystolic] = useState(toInputValue(initialSystolic));
  const [diastolic, setDiastolic] = useState(toInputValue(initialDiastolic));
  const [heartRate, setHeartRate] = useState(toInputValue(initialHeartRate));
  const computedBmi = computeBmi(heightCm, weightKg);
  const [manualBmi, setManualBmi] = useState(
    computedBmi != null ? String(computedBmi) : toInputValue(initialBmi),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (computedBmi != null) {
      setManualBmi(String(computedBmi));
    } else {
      setManualBmi(toInputValue(initialBmi));
    }
  }, [computedBmi, initialBmi]);

  const handleSave = async () => {
    const systolicValue = toNumber(systolic);
    const diastolicValue = toNumber(diastolic);
    const heartRateValue = toNumber(heartRate);
    const bmiValue =
      computedBmi != null
        ? computedBmi
        : manualBmi.trim()
        ? toNumber(manualBmi)
        : null;

    if (
      systolicValue == null &&
      diastolicValue == null &&
      heartRateValue == null &&
      bmiValue == null
    ) {
      setError("Enter at least one vital to save.");
      return;
    }

    const observedAt = new Date().toISOString();

    const observations = [
      systolicValue != null
        ? {
            kind: "bp_systolic",
            value_num: systolicValue,
            value_text: String(systolicValue),
            unit: "mmHg",
            observed_at: observedAt,
            meta: { source: "manual", category: "vital" },
          }
        : null,
      diastolicValue != null
        ? {
            kind: "bp_diastolic",
            value_num: diastolicValue,
            value_text: String(diastolicValue),
            unit: "mmHg",
            observed_at: observedAt,
            meta: { source: "manual", category: "vital" },
          }
        : null,
      heartRateValue != null
        ? {
            kind: "heart_rate",
            value_num: heartRateValue,
            value_text: String(heartRateValue),
            unit: "bpm",
            observed_at: observedAt,
            meta: { source: "manual", category: "vital" },
          }
        : null,
      bmiValue != null
        ? {
            kind: "bmi",
            value_num: bmiValue,
            value_text: String(bmiValue),
            unit: "kg/m2",
            observed_at: observedAt,
            meta: { source: "manual", category: "vital" },
          }
        : null,
    ].filter(Boolean);

    if (observations.length === 0) {
      setError("Enter at least one vital to save.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/observations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: observations }),
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

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">BMI (kg/m²)</span>
          <input
            type="number"
            inputMode="decimal"
            className="rounded-md border px-3 py-2"
            value={computedBmi != null ? String(computedBmi) : manualBmi}
            onChange={event => setManualBmi(event.target.value)}
            placeholder="e.g. 24.6"
            disabled={computedBmi != null || isSaving}
          />
          {computedBmi != null ? (
            <span className="text-xs text-muted-foreground">
              Calculated automatically from recorded height and weight.
            </span>
          ) : null}
        </label>
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
