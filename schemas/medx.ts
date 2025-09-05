import { z } from "zod";

export const Ref = z.object({
  name: z.string(),
  url: z.string().url().or(z.literal("")).default(""),
  year: z.number().int().optional(),
  source: z.string().optional(),
  doi: z.string().optional(),
});

const Base = {
  condition: z.string(),
  what_it_is: z.string(),
  localization: z.object({ country: z.literal("IN"), units: z.literal("metric") })
};

const EvidenceBase = z.object({
  key_findings: z.array(z.string()).default([]),
  practice_points: z.array(z.string()).default([]),
  level_of_evidence: z.array(z.enum(["high","moderate","low"])).default([]),
  references: z.array(Ref).min(1)
});
export const EvidenceForPatient = EvidenceBase.extend({ plain_summary: z.string().min(10) });
export const EvidenceForDoctor  = EvidenceBase.extend({ clinical_summary: z.string().min(10), metrics: z.array(z.string()).default([]) });

export const PatientSchema = z.object({
  mode: z.literal("patient"),
  ...Base,
  home_care: z.array(z.string()).default([]),
  red_flags: z.array(z.string()).min(3),
  when_to_test: z.array(z.string()).default([]),
  references: z.array(Ref).max(6).default([]),
  evidence: EvidenceForPatient.optional()
});

export const DoctorSchema = z.object({
  mode: z.literal("doctor"),
  ...Base,
  differential: z.array(z.string()).default([]),
  suggested_tests: z.array(z.string()).default([]),
  initial_management: z.array(z.string()).default([]),
  icd10_examples: z.array(z.string()).default([]),
  references: z.array(Ref).max(8).default([]),
  evidence: EvidenceForDoctor.optional()
});

export const ResearchSchema = z.object({
  mode: z.literal("research"),
  audience: z.enum(["patient","doctor"]).default("doctor"),
  ...Base,
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

export const MedxResponseSchema = z.discriminatedUnion("mode", [
  PatientSchema, DoctorSchema, ResearchSchema
]);
export type MedxResponse = z.infer<typeof MedxResponseSchema>;

