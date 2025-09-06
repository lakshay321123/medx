import { z } from "zod";

// parse numeric strings like "8.1%" -> 8.1
const asNumber = z.preprocess((v) => {
  if (v == null) return v;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}, z.number().finite().optional());

export const Medication = z.object({
  name: z.string().min(1),
  rxnorm: z.string().min(1).optional(),
});

export const Lab = z.object({
  name: z.string().min(1),
  value: asNumber.nullable().optional(),
  unit: z.string().optional(),
  ref_low: asNumber.optional(),
  ref_high: asNumber.optional(),
  observed_at: z.string().datetime().optional(), // ISO timestamp
});

export const Entities = z.object({
  symptoms: z.array(z.string().min(1)).default([]),
  conditions: z.array(z.string().min(1)).default([]),
  medications: z.array(Medication).default([]),
  labs: z.array(Lab).default([]),
  allergies: z.array(z.string().min(1)).default([]),
});

export const RiskFlag = z.object({
  name: z.string().min(1),
  severity: z.enum(["low", "moderate", "high"]),
  rationale: z.string().optional(),
});

export const Citation = z.object({
  source: z.string().min(1),        // e.g., "WHO TB guideline 2023"
  url: z.string().url().optional(),
  quote: z.string().optional(),     // supporting sentence
});

export const MedXStructured = z.object({
  patient_summary: z.string().min(1),
  clinician_note: z.object({
    differentials: z.array(z.string()).default([]),
    next_steps: z.array(z.string()).default([]),
    caveats: z.array(z.string()).default([]),
  }).default({ differentials: [], next_steps: [], caveats: [] }),
  entities: Entities,
  risk_flags: z.array(RiskFlag).default([]),
  citations: z.array(Citation).default([]),
  confidence: z.enum(["low", "medium", "high"]).optional(), // Task 6 will compute
});

export type TMedXStructured = z.infer<typeof MedXStructured>;

// Research mode schemas
export const Ref = z.object({
  name: z.string().min(1),
  url: z.string().url().or(z.literal("" )).default(""),
  year: z.number().int().optional(),
  source: z.string().optional(),
  doi: z.string().optional()
});

const EvidenceBase = z.object({
  key_findings: z.array(z.string()).default([]),
  practice_points: z.array(z.string()).default([]),
  level_of_evidence: z.array(z.enum(["high","moderate","low"])).default([]),
  references: z.array(Ref).min(1)
});

export const EvidenceForPatient = EvidenceBase.extend({
  plain_summary: z.string().min(10)
});

export const EvidenceForDoctor = EvidenceBase.extend({
  clinical_summary: z.string().min(10),
  metrics: z.array(z.string()).default([])
});

export const PatientSchema = z.object({
  mode: z.literal("patient"),
  condition: z.string(),
  what_it_is: z.string(),
  home_care: z.array(z.string()).default([]),
  red_flags: z.array(z.string()).min(3),
  when_to_test: z.array(z.string()).default([]),
  localization: z.object({ country: z.literal("IN"), units: z.literal("metric") }),
  references: z.array(Ref).max(6).default([]),
  evidence: EvidenceForPatient.optional()
});

export const DoctorSchema = z.object({
  mode: z.literal("doctor"),
  condition: z.string(),
  what_it_is: z.string(),
  differential: z.array(z.string()).default([]),
  suggested_tests: z.array(z.string()).default([]),
  initial_management: z.array(z.string()).default([]),
  icd10_examples: z.array(z.string()).default([]),
  localization: z.object({ country: z.literal("IN"), units: z.literal("metric") }),
  references: z.array(Ref).max(8).default([]),
  evidence: EvidenceForDoctor.optional()
});

export const ResearchSchema = z.object({
  mode: z.literal("research"),
  condition: z.string(),
  what_it_is: z.string(),
  audience: z.enum(["patient","doctor"]).default("doctor"),
  question: z.string().min(3),
  pico: z.object({
    population: z.string().optional(),
    intervention: z.string().optional(),
    comparator: z.string().optional(),
    outcomes: z.array(z.string()).optional()
  }).default({}),
  key_findings: z.array(z.string()).default([]),
  practice_points: z.array(z.string()).default([]),
  level_of_evidence: z.array(z.enum(["high","moderate","low"])).default([]),
  references: z.array(Ref).min(1)
});
