import { AiDocIntent } from "./schema";
import type {
  PlannerProfile,
  PlannerMedication,
  PlannerCondition,
  PlannerNote,
  PlannerLabInput,
  PreparedAidocPayload,
} from "./planner";
import { prepareAidocPayload, buildNarrativeFallback } from "./planner";

export type StructuredLab = {
  name: string;
  value: number | string | null;
  unit?: string | null;
  marker: string;
  ideal?: string | null;
};

export type StructuredReport = {
  date: string;
  summary: string;
  labs: StructuredLab[];
};

export type StructuredPatient = {
  name: string;
  age: number | null;
  sex?: string | null;
  predispositions: string[];
  medications: string[];
  symptoms: string[];
};

export type StructuredAidocResponse = {
  kind: "reports";
  intent: AiDocIntent;
  patient: StructuredPatient | null;
  reports: StructuredReport[];
  comparisons: Record<string, string>;
  summary: string;
  nextSteps: string[];
};

export type StructuredBuildInput = {
  profile?: PlannerProfile | null;
  labs?: PlannerLabInput[];
  notes?: PlannerNote[];
  medications?: PlannerMedication[];
  conditions?: PlannerCondition[];
  message: string;
  intent?: AiDocIntent | null;
  focusMetric?: string | null;
  compareWindow?: { a: string; b: string } | null;
};

function buildFromPrepared(intent: AiDocIntent, prepared: PreparedAidocPayload): StructuredAidocResponse {
  const fallback = buildNarrativeFallback(prepared);
  return {
    kind: "reports",
    intent,
    patient: prepared.patient,
    reports: prepared.reports,
    comparisons: prepared.comparisons,
    summary: fallback.summary,
    nextSteps: fallback.nextSteps,
  };
}

export function buildStructuredAidocResponse(input: StructuredBuildInput): StructuredAidocResponse {
  const intent = input.intent ?? AiDocIntent.HealthSummary;
  const prepared = prepareAidocPayload({
    profile: input.profile ?? null,
    labs: input.labs ?? [],
    medications: input.medications ?? [],
    conditions: input.conditions ?? [],
    notes: input.notes ?? [],
    intent: intent,
    focusMetric: input.focusMetric ?? null,
    compareWindow: input.compareWindow ?? null,
  });
  return buildFromPrepared(intent, prepared);
}

export const SAMPLE_AIDOC_DATA = {
  profile: { id: "sample-profile", name: "Lakshay Mehra", age: 32 },
  labs: [
    {
      profileId: "sample-profile",
      name: "LDL",
      value: 182,
      unit: "mg/dL",
      takenAt: "2025-10-01",
    },
    {
      profileId: "sample-profile",
      name: "LDL",
      value: 160,
      unit: "mg/dL",
      takenAt: "2025-05-01",
    },
    {
      profileId: "sample-profile",
      name: "HbA1c",
      value: 6.2,
      unit: "%",
      takenAt: "2025-10-01",
    },
  ],
  notes: [
    {
      profileId: "sample-profile",
      body: "Fracture report: Right forearm fracture, radius shaft. Healed with immobilization.",
      createdAt: "2025-07-15",
    },
  ],
  medications: [{ profileId: "sample-profile", name: "Timolol" }],
  conditions: [{ profileId: "sample-profile", label: "Blood cancer", status: "active" }],
};
