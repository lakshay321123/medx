import type { ModeState } from "@/lib/modes/types";
import {
  THERAPY_SUGGESTIONS,
  WELLNESS_SUGGESTIONS,
  DOCTOR_SUGGESTIONS,
  WELLNESS_RESEARCH_SUGGESTIONS,
  DOCTOR_RESEARCH_SUGGESTIONS,
  DEFAULT_AIDOC,
  TRIGGER_WHAT_IS,
  TRIGGER_MED_FOR,
  TRIGGER_SIDE_EFFECTS,
  TRIGGER_TEST_FOR,
  TRIGGER_DOC_WORKUP,
} from "@/data/suggestions";

export function getDefaultSuggestions(mode: ModeState): string[] {
  if (mode.base === "doctor") {
    return mode.research ? DOCTOR_RESEARCH_SUGGESTIONS : DOCTOR_SUGGESTIONS;
  }
  if (mode.base === "aidoc") return DEFAULT_AIDOC;
  if (mode.therapy) return THERAPY_SUGGESTIONS;
  if (mode.research) return WELLNESS_RESEARCH_SUGGESTIONS;
  return WELLNESS_SUGGESTIONS;
}

export function getInlineSuggestions(query: string, mode: ModeState): string[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];

  if (mode.base === "doctor") {
    if (q.startsWith("workup") || q.includes("rule out")) return TRIGGER_DOC_WORKUP;
  }

  if (q.startsWith("what is")) return TRIGGER_WHAT_IS;
  if (q.startsWith("what is the medication for") || q.startsWith("medication for")) return TRIGGER_MED_FOR;
  if (q.includes("side effect")) return TRIGGER_SIDE_EFFECTS;
  if (q.startsWith("which test") || q.includes("test for")) return TRIGGER_TEST_FOR;

  const pool = getDefaultSuggestions(mode);
  return pool.filter(t => t.toLowerCase().includes(q)).slice(0, 8);
}
