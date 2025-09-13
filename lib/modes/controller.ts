export type ModeState = { ui?: "patient"|"doctor"; therapy:boolean; research:boolean; aidoc:boolean; dark:boolean };

export function nextModes(prev: ModeState, action: { type: string; value?: any }) {
  const s = { ...prev }; let prompt: string | undefined;

  switch (action.type) {
    case "ui:set":
      s.ui = action.value;
      if (s.ui !== "patient") s.therapy = false;
      break;

    case "therapy:toggle":
      if (s.aidoc) { prompt = "AI Doc runs alone. Turn it off to use Therapy."; break; }
      if (s.ui !== "patient") { prompt = "Therapy works only with Patient mode."; s.therapy = false; break; }
      s.therapy = !s.therapy; break;

    case "research:toggle":
      if (s.aidoc) { prompt = "AI Doc runs alone. Turn it off to use Research."; break; }
      if (!s.ui) { prompt = "Choose Patient (simple) or Doctor (clinical) to use Research."; break; }
      s.research = !s.research; break;

    case "aidoc:set":
      s.aidoc = !!action.value;
      if (s.aidoc) { s.therapy = false; s.research = false; }
      break;

    case "dark:set":
      s.dark = !!action.value; break;
  }
  return { state: s, prompt };
}
