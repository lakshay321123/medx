export type MedicationEntry = {
  key: string;
  name: string;
  doseLabel?: string | null;
  doseValue?: number | null;
  doseUnit?: string | null;
  observationId?: string | number | null;
  rxnormId?: string | null;
};

export function buildDoseLabelFromParts(value: number | null, unit: string | null) {
  if (value == null && !unit) return null;
  const numeric =
    value != null ? Number(value.toFixed(value % 1 ? 1 : 0)) : null;
  const parts: string[] = [];
  if (numeric != null) parts.push(String(numeric));
  if (unit) parts.push(unit);
  return parts.length ? parts.join(" ") : null;
}

export function formatMedicationLabel(med: MedicationEntry) {
  const doseLabel =
    med.doseLabel || buildDoseLabelFromParts(med.doseValue ?? null, med.doseUnit ?? null);
  return doseLabel ? `${med.name} ${doseLabel}` : med.name;
}
