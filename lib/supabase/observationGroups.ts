export type ObservationGroupKey =
  | "vitals"
  | "labs"
  | "imaging"
  | "medications"
  | "diagnoses"
  | "procedures"
  | "immunizations"
  | "notes"
  | "other";

export const OBSERVATION_LABELS: Record<string, string> = {
  bp: "BP",
  hr: "HR",
  bmi: "BMI",
  hba1c: "HbA1c",
  fasting_glucose: "Fasting Glucose",
  egfr: "eGFR",
  alt: "ALT",
  ast: "AST",
  alp: "ALP",
  ggt: "GGT",
  total_bilirubin: "Bilirubin Total",
  direct_bilirubin: "Bilirubin Direct",
  indirect_bilirubin: "Bilirubin Indirect",
  hemoglobin: "Hemoglobin",
  wbc: "WBC",
  platelets: "Platelets",
  esr: "ESR",
  uibc: "UIBC",
  tibc: "TIBC",
  transferrin_saturation: "Transferrin Saturation",
  total_cholesterol: "Total Cholesterol",
  triglycerides: "Triglycerides",
  ldl: "LDL",
  hdl: "HDL",
  vitamin_d: "Vitamin D",
  vitamin_b12: "Vitamin B12",
  creatinine: "Serum Creatinine",
  lipase: "Serum Lipase",
  amylase: "Serum Amylase",
  fsh: "FSH",
  lh: "LH",
  rheumatoid_factor: "Rheumatoid Factor",
  rbc_count: "Erythrocyte Count",
};

const KIND_CATEGORY_OVERRIDES: Record<string, ObservationGroupKey> = {
  rbc_count: "labs",
  hemoglobin: "labs",
  wbc: "labs",
  platelets: "labs",
  esr: "labs",
  uibc: "labs",
  tibc: "labs",
  transferrin_saturation: "labs",
  egfr: "labs",
  creatinine: "labs",
  fasting_glucose: "labs",
  hba1c: "labs",
  total_cholesterol: "labs",
  triglycerides: "labs",
  ldl: "labs",
  hdl: "labs",
  total_bilirubin: "labs",
  direct_bilirubin: "labs",
  indirect_bilirubin: "labs",
  alt: "labs",
  ast: "labs",
  alp: "labs",
  ggt: "labs",
  vitamin_d: "labs",
  vitamin_b12: "labs",
  lipase: "labs",
  amylase: "labs",
  fsh: "labs",
  lh: "labs",
  rheumatoid_factor: "labs",
  bp: "vitals",
  hr: "vitals",
  bmi: "vitals",
  height: "vitals",
  weight: "vitals",
  spo2: "vitals",
  pulse: "vitals",
};

const IMG_WORDS = [
  "xray",
  "xr",
  "cxr",
  "ct",
  "mri",
  "usg",
  "ultrasound",
  "echo",
  "imaging",
];

const RX_WORDS = [
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
  "medication",
];

const LAB_HINTS = [
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

const CONDITION_HINTS = [
  "diagnosis",
  "diagnoses",
  "condition",
  "conditions",
  "problem",
  "problems",
  "disease",
  "hx",
  "fhx",
  "family history",
  "family_history",
  "history",
  "chronic",
];

const VITAL_HINTS = [
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

const NOTE_HINTS = ["note", "notes", "symptom", "symptoms", "observation"];

const IMMUNIZATION_HINTS = ["vaccine", "immunization", "immunisations", "booster"];

const PROCEDURE_HINTS = ["procedure", "surgery", "operation"];

function lower(value: any) {
  return typeof value === "string" ? value.toLowerCase() : String(value ?? "").toLowerCase();
}

export function normalizeObservationKind(raw: string) {
  const base = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (["erythrocyte_count", "rbc", "rbc_count"].includes(base)) return "rbc_count";
  if (["total_chol", "cholesterol", "cholesterol_total"].includes(base)) {
    return "total_cholesterol";
  }
  if (["bilirubin", "tbil", "tbil_total"].includes(base)) return "total_bilirubin";
  if (["vit_b12", "b12"].includes(base)) return "vitamin_b12";
  if (["vitamin_d3", "25_oh_vitamin_d", "25-oh-vitamin-d"].includes(base)) {
    return "vitamin_d";
  }
  if (["serum_creatinine"].includes(base)) return "creatinine";
  if (["rf", "ra_factor"].includes(base)) return "rheumatoid_factor";
  return base;
}

export function startCaseObservation(value: string) {
  return value.replaceAll("_", " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

export function classifyObservation(
  rawKind: string,
  meta: Record<string, any> | null | undefined
): ObservationGroupKey {
  const kind = normalizeObservationKind(rawKind);
  const metaObj = meta ?? {};
  if (KIND_CATEGORY_OVERRIDES[kind]) return KIND_CATEGORY_OVERRIDES[kind];

  const catParts = [
    metaObj.category,
    metaObj.type,
    metaObj.group,
    metaObj.source_type,
  ]
    .filter((v) => v != null)
    .map(lower);

  const text = [
    kind,
    metaObj.category,
    metaObj.type,
    metaObj.group,
    metaObj.label,
    metaObj.name,
    metaObj.summary,
    metaObj.notes,
  ]
    .filter((v) => v != null)
    .map(lower)
    .join(" ");

  const modality = lower(metaObj.modality);

  const catHas = (...needles: string[]) =>
    catParts.some((c) => needles.some((needle) => c.includes(needle)));

  const textHas = (needles: string[]) =>
    needles.some((needle) => text.includes(needle));

  if (catHas("vital")) return "vitals";
  if (catHas("lab")) return "labs";
  if (catHas("imaging") || catHas("radiology")) return "imaging";
  if (catHas("medication", "medications", "prescription", "rx", "meds", "drug")) {
    return "medications";
  }
  if (
    catHas(
      "diagnosis",
      "diagnoses",
      "condition",
      "conditions",
      "problem",
      "problems",
      "history",
      "family_history",
      "fhx",
      "chronic"
    )
  ) {
    return "diagnoses";
  }
  if (catHas("procedure")) return "procedures";
  if (catHas("immunization", "vaccine")) return "immunizations";
  if (catHas("note", "symptom")) return "notes";

  const looksImaging =
    IMG_WORDS.some((word) => text.includes(word) || modality.includes(word)) &&
    (kind.includes("report") || text.includes("report"));
  if (looksImaging) return "imaging";

  if (textHas(RX_WORDS)) return "medications";
  if (textHas(VITAL_HINTS)) return "vitals";
  if (textHas(LAB_HINTS)) return "labs";
  if (textHas(CONDITION_HINTS)) return "diagnoses";
  if (textHas(IMMUNIZATION_HINTS)) return "immunizations";
  if (textHas(PROCEDURE_HINTS)) return "procedures";
  if (textHas(NOTE_HINTS)) return "notes";

  return "other";
}

