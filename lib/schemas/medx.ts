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
