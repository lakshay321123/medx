import type { ModeState } from "./types";

export function nextModes(prev: ModeState, action: { type: string; value?: any }): { state: ModeState; prompt?: string } {
  let s = { ...prev };
  let prompt: string | undefined;

  switch (action.type) {
    case "ui:set":
      s.ui = action.value; // "patient" | "doctor"
      if (s.ui !== "patient") s.therapy = false;            // a) therapy only with patient
      if (!s.ui) { s.research = false; }                    // guard
      if (s.aidoc) { /* aidoc overrides below */ }
      break;
    case "therapy:toggle":
      if (s.aidoc) { prompt = "AI Doc is standalone. Turn it off to enable Therapy."; break; }
      if (s.ui !== "patient") { s.therapy = false; prompt = "Therapy Mode works only with Patient Mode."; break; }
      s.therapy = !s.therapy;
      break;
    case "research:toggle":
      if (s.aidoc) { prompt = "AI Doc is standalone. Turn it off to enable Research."; break; }
      if (!s.ui) { prompt = "Choose Patient (simple) or Doctor (clinical) to use Research."; break; }
      s.research = !s.research; // c) allowed with patient/doctor
      break;
    case "aidoc:toggle":
      s.aidoc = !s.aidoc; 
      if (s.aidoc) { s.therapy = false; s.research = false; /* standalone */ }
      break;
    case "dark:toggle":
      s.dark = !s.dark; break;
  }
  return { state: s, prompt };
}
