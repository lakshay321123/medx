export const LAB_HINTS = [
  "glucose",
  "cholesterol",
  "triglycer",
  "hba1c",
  "egfr",
  "creatinine",
  "bun",
  "bilirubin",
  "ast",
  "alt",
  "alp",
  "ggt",
  "hb",
  "hemoglobin",
  "wbc",
  "platelet",
  "esr",
  "ferritin",
  "tibc",
  "uibc",
  "transferrin",
  "sodium",
  "potassium",
  "vitamin",
  "lipase",
  "amylase",
  "fsh",
  "lh",
  "rheumatoid",
];

export const MED_HINTS = [
  "med",
  "rx",
  "drug",
  "dose",
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "prescription",
  "therapy",
];

export const CONDITION_HINTS = [
  "diagnosis",
  "condition",
  "problem",
  "disease",
  "icd",
  "impression",
  "hx",
  "history",
];

export const VITAL_HINTS = [
  "bp",
  "blood_pressure",
  "heart_rate",
  "hr",
  "pulse",
  "spo2",
  "oxygen",
  "resp",
  "rr",
  "temperature",
  "temp",
  "vital",
];

export type ClinicalState = {
  labs: any[];
  meds: any[];
  conditions: any[];
  vitals: { sbp?: number; hr?: number; spo2?: number; temp?: number };
};

export function normalizeIso(input?: any): string {
  if (!input) return new Date().toISOString();
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

export function parseNumber(value: any): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function buildClinicalState(obsRows: any[], predRows: any[]): ClinicalState {
  const labs = new Map<string, any>();
  const meds = new Map<string, any>();
  const conditions = new Map<string, any>();
  const vitals: ClinicalState["vitals"] = {};

  for (const row of Array.isArray(obsRows) ? obsRows : []) {
    const kind = String(row?.kind || "").toLowerCase();
    const meta = (row?.meta as Record<string, any>) || {};
    const cat = String(meta?.category || "").toLowerCase();
    const type = String(meta?.type || "").toLowerCase();
    const group = String(meta?.group || "").toLowerCase();
    const labelRaw =
      meta?.label ??
      meta?.name ??
      meta?.analyte ??
      meta?.test_name ??
      row?.kind ??
      "Observation";
    const label = String(labelRaw).trim();
    const observedAt = normalizeIso(row?.observed_at ?? meta?.observed_at ?? row?.created_at ?? null);
    const search = `${kind} ${label} ${meta?.summary ?? meta?.notes ?? ""}`
      .toLowerCase()
      .replace(/[_-]+/g, " ");
    const catText = `${cat} ${type} ${group}`;
    const catHas = (needle: string) =>
      needle &&
      (cat.includes(needle) || type.includes(needle) || group.includes(needle));

    const isLab =
      catHas("lab") ||
      catHas("labs") ||
      kind.startsWith("lab") ||
      LAB_HINTS.some((hint) => kind.includes(hint) || search.includes(hint));
    const isMedication =
      catHas("medication") ||
      catHas("medications") ||
      catHas("meds") ||
      catHas("rx") ||
      MED_HINTS.some((hint) =>
        kind.includes(hint) || search.includes(hint) || catText.includes(hint)
      );
    const isCondition =
      catHas("diagnosis") ||
      catHas("diagnoses") ||
      catHas("condition") ||
      catHas("problem") ||
      catHas("history") ||
      CONDITION_HINTS.some((hint) =>
        kind.includes(hint) || search.includes(hint) || catText.includes(hint)
      );
    const isVital =
      catHas("vital") ||
      VITAL_HINTS.some((hint) => kind.includes(hint) || search.includes(hint));

    if (isLab) {
      const numeric =
        row?.value_num != null
          ? parseNumber(row.value_num)
          : parseNumber((row as any)?.value ?? meta?.value ?? meta?.result);
      const textVal =
        row?.value_text ??
        meta?.value ??
        meta?.result ??
        (numeric == null ? null : undefined);
      const entry = {
        name: label,
        value: numeric ?? (textVal != null ? textVal : null),
        unit: row?.unit ?? meta?.unit ?? null,
        takenAt: observedAt,
        panel: meta?.panel ?? null,
        abnormal: meta?.abnormal ?? null,
      };
      const key = `${label.toLowerCase()}|${entry.unit ?? ""}`;
      const prev = labs.get(key);
      if (!prev || new Date(observedAt).getTime() > new Date(prev.takenAt).getTime()) {
        labs.set(key, entry);
      }
    }

    if (isMedication) {
      const dose =
        meta?.dose ??
        meta?.dosage ??
        meta?.sig ??
        (typeof row?.value_text === "string" ? row.value_text : null);
      const entry = {
        name: label,
        dose: dose ? String(dose) : null,
        since: normalizeIso(meta?.started_at ?? meta?.start_date ?? observedAt),
        stoppedAt: meta?.stopped_at || meta?.stop_date ? normalizeIso(meta?.stopped_at ?? meta?.stop_date) : null,
      };
      const key = label.toLowerCase();
      const prev = meds.get(key);
      if (!prev || new Date(entry.since || 0).getTime() > new Date(prev.since || 0).getTime()) {
        meds.set(key, entry);
      }
    }

    if (isCondition) {
      const entry = {
        label,
        status: meta?.status ?? (meta?.active === false ? "resolved" : "active"),
        code: meta?.code ?? meta?.icd10 ?? meta?.icd ?? null,
        since: normalizeIso(meta?.since ?? meta?.start_date ?? observedAt),
      };
      const key = label.toLowerCase();
      const prev = conditions.get(key);
      if (!prev || new Date(entry.since || 0).getTime() > new Date(prev.since || 0).getTime()) {
        conditions.set(key, entry);
      }
    }

    if (isVital) {
      if (kind.includes("bp") || search.includes("blood pressure")) {
        const sbp = parseNumber(meta?.sbp ?? (Array.isArray(meta?.values) ? meta.values?.[0] : null));
        if (sbp != null) vitals.sbp = sbp;
        else if (typeof row?.value_text === "string" && row.value_text.includes("/")) {
          const parts = row.value_text.split(/[\/\s]+/).filter(Boolean);
          const parsed = parseNumber(parts?.[0]);
          if (parsed != null) vitals.sbp = parsed;
        }
      }
      if (kind.includes("hr") || kind.includes("heart") || search.includes("heart rate")) {
        const hr =
          row?.value_num != null
            ? parseNumber(row.value_num)
            : parseNumber(meta?.value ?? row?.value_text);
        if (hr != null) vitals.hr = hr;
      }
      if (kind.includes("spo2") || search.includes("spo2") || search.includes("oxygen")) {
        const spo2 =
          row?.value_num != null
            ? parseNumber(row.value_num)
            : parseNumber(meta?.value ?? row?.value_text);
        if (spo2 != null) vitals.spo2 = spo2;
      }
      if (kind.includes("temp") || search.includes("temperature")) {
        const temp =
          row?.value_num != null
            ? parseNumber(row.value_num)
            : parseNumber(meta?.value ?? row?.value_text);
        if (temp != null) vitals.temp = temp;
      }
    }
  }

  for (const pred of Array.isArray(predRows) ? predRows : []) {
    const details = (pred?.details as Record<string, any>) || {};
    const label =
      pred?.label ??
      pred?.name ??
      details?.label ??
      details?.name ??
      null;
    if (!label) continue;
    const cat = String(details?.category ?? pred?.type ?? "").toLowerCase();
    if (
      cat &&
      !["diagnosis", "condition", "problem", "history"].some((k) => cat.includes(k))
    ) {
      continue;
    }
    const probability =
      typeof pred?.probability === "number"
        ? pred.probability
        : typeof details?.probability === "number"
        ? details.probability
        : null;
    if (probability != null && probability < 0.5) continue;
    const entry = {
      label: String(label),
      status: details?.status ?? (probability != null && probability < 0.7 ? "review" : "active"),
      code: details?.code ?? details?.icd10 ?? details?.icd ?? null,
      since: normalizeIso(details?.since ?? details?.start_date ?? pred?.created_at ?? null),
    };
    const key = entry.label.toLowerCase();
    const prev = conditions.get(key);
    if (!prev || new Date(entry.since || 0).getTime() > new Date(prev.since || 0).getTime()) {
      conditions.set(key, entry);
    }
  }

  return {
    labs: Array.from(labs.values()).sort(
      (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
    ),
    meds: Array.from(meds.values()).sort(
      (a, b) => new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime()
    ),
    conditions: Array.from(conditions.values()).sort(
      (a, b) => new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime()
    ),
    vitals,
  };
}

export function mergeProfileConditions(
  clinical: ClinicalState,
  chronic: string[],
  predisposition: string[]
) {
  const map = new Map<string, any>();
  for (const c of clinical.conditions) {
    if (!c?.label) continue;
    map.set(String(c.label).toLowerCase(), c);
  }

  for (const label of chronic) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const existing = map.get(key);
    const entry = {
      label: trimmed,
      status: "active",
      code: existing?.code ?? null,
      since: existing?.since ?? null,
      source: existing?.source ?? "profile",
    };
    map.set(key, { ...existing, ...entry });
  }

  for (const label of predisposition) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (map.has(key)) {
      const existing = map.get(key);
      map.set(key, {
        ...existing,
        source: existing?.source ?? "profile",
        status: existing?.status || "family",
      });
      continue;
    }
    map.set(key, {
      label: trimmed,
      status: "family",
      code: null,
      since: null,
      source: "profile",
    });
  }

  clinical.conditions = Array.from(map.values()).sort(
    (a, b) => new Date(b.since || 0).getTime() - new Date(a.since || 0).getTime()
  );
}
