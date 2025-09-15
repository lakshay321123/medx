// lib/triage.ts
// MedX — Triage Engine (Doctor/Doc mode)
// Orchestrates calculators + intents + LLM prompt shaping.

import { getIntentStyle, defaultDraftStyle, isDoctorCaseStyle } from "@/lib/intents";
import { looksCalculational, shouldBuildDocCalcPage, buildDocCalcPage, parseCase } from "@/lib/calcPage";

export type Mode = "patient" | "doctor" | "doc";

export type Bio = {
  name?: string; age?: number; sex?: string;
  weightKg?: number; heightCm?: number; mrn?: string;
};

export type TriageResult =
  | { kind: "doc"; markdown: string; summaryPrompt?: string }
  | { kind: "chat"; system: string; user: string; softCapTokens: number };

export function triage(mode: Mode, userText: string, bio: Bio = {}): TriageResult {
  const text = (userText || "").trim();
  const isDocMode = mode === "doctor" || mode === "doc";

  // Build the base drafting style
  const style = defaultDraftStyle(isDocMode ? "doctor" : "patient");
  const intentBlock = getIntentStyle(text, isDocMode ? "doctor" : "patient");

  // Calculational / case: prefer Doc page
  if (isDocMode && looksCalculational(text) && shouldBuildDocCalcPage(mode, text)) {
    const md = buildDocCalcPage(text, bio, "doctor");

    // Optional: produce a tight LLM summary seed from parsed values (no provider change)
    const p = parseCase(text);
    const seed = [
      "Summarize clinical state in three compact sections:",
      "1) Key problems and physiology, 2) Immediate actions, 3) What to re-check in 30–60 minutes.",
      "Keep to bullets, avoid repetition, and stay under 120 tokens.",
      "If metrics are present, reference them succinctly without re-deriving.",
    ].join("\n");

    return { kind: "doc", markdown: md, summaryPrompt: seed };
  }

  // Normal chat: shape with intent + style + soft cap
  const system = [
    style,
    intentBlock ? intentBlock : "",
    "Respect soft cap; if a sentence is incomplete, finish it even if it slightly exceeds the cap."
  ].filter(Boolean).join("\n\n");

  // Choose a soft cap based on mode and input size
  const baseCap = isDocMode ? 240 : 180;  // small by default
  const longInputBump = text.length > 800 ? 120 : 0;
  const softCapTokens = baseCap + longInputBump;

  return { kind: "chat", system, user: text, softCapTokens };
}

// ----------------------------------------------------------------------------
// Legacy symptom triage retained for backwards compatibility
// ----------------------------------------------------------------------------
const ENABLED = (process.env.SYMPTOM_TRIAGE_ENABLED || 'false').toLowerCase() === 'true';

export interface SymptomTriageInput {
  symptom: string;
  age?: number;
  durationDays?: number;
  flags?: string[];
}

export interface SymptomTriageResult {
  symptom: string;
  possible_causes: string[];
  self_care: string[];
  doctor_visit: string[];
  er_now: string[];
  assumptions?: string[];
}

export function symptomTriage(input: SymptomTriageInput): { triage: SymptomTriageResult } | null {
  if (!ENABLED) return null;
  const symptom = input.symptom.toLowerCase();
  const data: Record<string, Omit<SymptomTriageResult, 'symptom' | 'assumptions'>> = {
    fever: {
      possible_causes: ['Viral infection', 'Inflammatory conditions'],
      self_care: ['Hydration', 'Rest', 'Light clothing'],
      doctor_visit: ['Fever > 102°F for 3+ days', 'Fever with rash'],
      er_now: ['Confusion', 'Breathing difficulty'],
    },
    cough: {
      possible_causes: ['Common cold', 'Airway irritation'],
      self_care: ['Warm fluids', 'Honey (>1y)'],
      doctor_visit: ['Cough >2 weeks', 'Cough with fever >100.4°F'],
      er_now: ['Coughing blood', 'Severe shortness of breath'],
    },
    pain: {
      possible_causes: ['Muscle strain', 'Minor injury'],
      self_care: ['Rest', 'Over-the-counter pain reliever'],
      doctor_visit: ['Pain lasting >1 week', 'Pain with swelling'],
      er_now: ['Sudden severe pain', 'Pain after major injury'],
    },
  };
  const chosen = data[symptom] || {
    possible_causes: ['Various causes'],
    self_care: ['Rest', 'Hydration'],
    doctor_visit: ['Symptoms persistent or worsening'],
    er_now: ['Severe symptoms like chest pain or difficulty breathing'],
  };
  const assumptions: string[] = [];
  if (typeof input.age !== 'number') {
    assumptions.push('assuming adult');
  }
  const result: SymptomTriageResult = {
    symptom: capitalize(symptom),
    ...chosen,
    assumptions: assumptions.length ? assumptions : undefined,
  };
  if (result.er_now.length) {
    console.log('triage red-flag escalation', { symptom: result.symptom });
  }
  return { triage: result };
}

function capitalize(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

