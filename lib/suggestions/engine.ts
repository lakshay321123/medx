import type { ModeState } from "@/lib/modes/types";
import {
  DEFAULT_PATIENT,
  DEFAULT_DOCTOR,
  DEFAULT_AIDOC,
  TRIGGER_WHAT_IS,
  TRIGGER_MED_FOR,
  TRIGGER_SIDE_EFFECTS,
  TRIGGER_TEST_FOR,
  TRIGGER_DOC_WORKUP,
} from "@/data/suggestions";

export function getDefaultSuggestions(mode: ModeState): string[] {
  if (mode.base === "doctor") return DEFAULT_DOCTOR;
  if (mode.base === "aidoc") return DEFAULT_AIDOC;
  return DEFAULT_PATIENT;
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
