import type { ModeState } from "./types";

export function nextModes(prev: ModeState, action: { type: string; value?: any }): { state: ModeState; prompt?: string } {
  let s = { ...prev };
  let prompt: string | undefined;

  switch (action.type) {
    case "ui:set":
      s.ui = action.value;
      if (s.ui !== "patient") s.therapy = false;
      break;

    case "therapy:toggle":
      if (s.aidoc) { prompt = "AI Doc runs by itself. Turn it off for Therapy."; break; }
      if (s.ui !== "patient") { prompt = "Therapy works only with Patient mode."; s.therapy = false; break; }
      s.therapy = !s.therapy;
      break;

    case "research:toggle":
      if (s.aidoc) { prompt = "AI Doc runs by itself. Turn it off for Research."; break; }
      if (!s.ui) { prompt = "Pick Patient or Doctor mode first."; break; }
      s.research = !s.research;
      break;

    case "aidoc:toggle":
      s.aidoc = !s.aidoc;
      if (s.aidoc) { s.therapy = false; s.research = false; }
      break;

    case "dark:toggle":
      s.dark = !s.dark; break;
  }

  return { state: s, prompt };
}
