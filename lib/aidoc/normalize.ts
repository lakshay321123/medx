export const NAME_ALIAS: Record<string, string> = {
  "alt (sgpt)": "ALT",
  "ast (sgot)": "AST",
  "hdl cholesterol": "HDL",
  "ldl cholesterol": "LDL",
  "total cholesterol": "Total Cholesterol",
  "fasting glucose": "Fasting Glucose",
  "vitamin d (25-oh)": "Vitamin D",
};

export const UNIT_ALIAS: Record<string, string> = {
  "mg/dl": "mg/dL",
  "u/l": "U/L",
  "ng/ml": "ng/mL",
  "%": "%",
};

export function normName(raw?: string) {
  if (!raw) return "";
  const k = raw.trim().toLowerCase();
  return NAME_ALIAS[k] || raw.replace(/\s+/g, " ").trim();
}

export function normUnit(raw?: string | null) {
  if (!raw) return undefined;
  const k = raw.trim().toLowerCase();
  return UNIT_ALIAS[k] || raw.trim();
}

export type LabLike = { name?: string; value?: number | string | null; unit?: string | null; takenAt?: string | Date };

function toIsoDate(value?: string | Date): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function groupByIsoDate(items: LabLike[]) {
  const byDate = new Map<string, LabLike[]>();
  for (const item of items) {
    const key = toIsoDate(item.takenAt);
    const arr = byDate.get(key) || [];
    arr.push(item);
    byDate.set(key, arr);
  }
  return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export function dedupeSameDay(items: LabLike[]) {
  const map = new Map<string, LabLike>();
  for (const item of items) {
    const name = normName(item.name);
    if (!name) continue;
    const unit = normUnit(item.unit ?? undefined);
    const key = `${name}|${unit || ""}`;
    map.set(key, { ...item, name, unit });
  }
  return [...map.values()];
}

