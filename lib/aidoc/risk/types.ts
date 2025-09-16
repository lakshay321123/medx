export type PatientRow = {
  id: string;
  user_id: string;
  dob: string | null;
  sex: string | null;
  name?: string | null;
};

export type VitalRow = {
  patient_id: string;
  taken_at: string;
  sbp: number | null;
  dbp: number | null;
  hr: number | null;
  temp: number | null;
  temp_unit?: string | null;
  spo2: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
};

export type LabRow = {
  patient_id: string;
  taken_at: string;
  test_code: string;
  value: number | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
};

export type MedicationRow = {
  patient_id: string;
  name: string;
  dose: string | null;
  route: string | null;
  start_at: string | null;
  end_at: string | null;
  adherence_mark: string | null;
};

export type EncounterRow = {
  patient_id: string;
  type: string | null;
  start_at: string;
  dx_codes: string[] | null;
};

export type NoteRow = {
  patient_id: string;
  created_at: string;
  text: string;
  tags: string[] | null;
};

export type PatientDataset = {
  patient: PatientRow;
  vitals: VitalRow[];
  labs: LabRow[];
  medications: MedicationRow[];
  encounters: EncounterRow[];
  notes: NoteRow[];
};

export type MetricSample = {
  value: number;
  takenAt: string;
  source: "vital" | "lab" | "derived";
  unit?: string | null;
  refLow?: number | null;
  refHigh?: number | null;
};

export type WindowStats = {
  days: number;
  count: number;
  mean?: number;
  min?: number;
  max?: number;
  std?: number;
  slopePerDay?: number;
  outOfRangePct?: number;
  timeSinceLastNormalDays?: number | null;
  daysSinceLast?: number | null;
};

export type MetricFeatures = {
  latest?: MetricSample;
  windows: Record<string, WindowStats>;
};

export type LongitudinalFeatures = {
  generatedAt: string;
  metrics: Record<string, MetricFeatures>;
  medicationStats: {
    active: number;
    startedLast90: number;
    adherenceIssues: number;
  };
  encounterStats: {
    erVisits90: number;
    inpatient365: number;
    total365: number;
  };
  noteFlags: {
    tags: string[];
    lastNoteAt?: string;
  };
};

export type RiskBand = "Low" | "Moderate" | "High" | "Unknown";

export type DomainKey = "Cardiovascular" | "Metabolic" | "Renal";

export type DomainResult = {
  condition: DomainKey;
  group: "Cardio-Metabolic";
  riskScore: number; // 0-1
  riskLabel: RiskBand;
  topFactors: { name: string; detail: string }[];
  features: Record<string, any>;
  generatedAt: string;
  model: string;
};

export type SummaryBundle = {
  patient_summary_md: string;
  clinician_summary_md: string;
  summarizer_model: string;
};

export type SummarizerInput = {
  patient: PatientRow;
  features: LongitudinalFeatures;
  domains: DomainResult[];
};
