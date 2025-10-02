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

export type LabLike = {
  name?: string;
  value?: number | string | null;
  unit?: string | null;
  takenAt?: string | Date | null;
};

function toISODate(input?: string | Date | null): string {
  if (!input) return new Date().toISOString().slice(0, 10);
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function groupAndDedupeByDate(items: LabLike[]) {
  const byDate = new Map<string, LabLike[]>();
  for (const it of items) {
    const iso = toISODate(it.takenAt ?? null);
    const arr = byDate.get(iso) || [];
    arr.push(it);
    byDate.set(iso, arr);
  }

  return [...byDate.entries()].map(([date, arr]) => {
    const map = new Map<string, LabLike>();
    for (const l of arr) {
      const name = normName(l.name);
      if (!name) continue;
      const unit = normUnit(l.unit ?? undefined);
      const key = `${name}|${unit || ""}`;
      map.set(key, { ...l, name, unit });
    }
    return { date, labs: [...map.values()] };
  });
}

