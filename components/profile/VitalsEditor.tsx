"use client";

import { useState } from "react";

export type VitalsEditorValues = {
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: number | null;
};

export type VitalsEditorProps = {
  initialValues: VitalsEditorValues;
  onSave: (values: VitalsEditorValues) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
};

export default function VitalsEditor({
  initialValues,
  onSave,
  onCancel,
  isSaving = false,
}: VitalsEditorProps) {
  const [systolic, setSystolic] = useState(valueToString(initialValues.systolic));
  const [diastolic, setDiastolic] = useState(valueToString(initialValues.diastolic));
  const [heartRate, setHeartRate] = useState(valueToString(initialValues.heartRate));
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const next = {
      systolic: stringToNumber(systolic),
      diastolic: stringToNumber(diastolic),
      heartRate: stringToNumber(heartRate),
    } satisfies VitalsEditorValues;
    if (Object.values(next).every(v => v == null)) {
      setError("Enter at least one vital to save.");
      return;
    }
    try {
      await onSave(next);
    } catch (err: any) {
      setError(err?.message || "Couldn’t save vitals.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Systolic (mmHg)</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            className="rounded-md border px-3 py-2"
            placeholder="120"
            value={systolic}
            onChange={e => setSystolic(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Diastolic (mmHg)</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            className="rounded-md border px-3 py-2"
            placeholder="80"
            value={diastolic}
            onChange={e => setDiastolic(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Heart rate (BPM)</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            className="rounded-md border px-3 py-2"
            placeholder="72"
            value={heartRate}
            onChange={e => setHeartRate(e.target.value)}
          />
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

function valueToString(value?: number | null) {
  return value == null || Number.isNaN(value) ? "" : String(value);
}

function stringToNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}
