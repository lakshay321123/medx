import type { ModeState } from "./types";

export function toQuery(state: ModeState): string {
  if (state.base === "aidoc") return "/?panel=ai-doc";
  const p = new URLSearchParams({ panel: "chat", mode: state.base });
  if (state.therapy) p.set("therapy", "1");
  if (state.research) p.set("research", "1");
  return `/?${p.toString()}`;
}

export function fromSearchParams(sp: URLSearchParams, theme: "light"|"dark"): ModeState {
  const panel = sp.get("panel");
  if (panel === "ai-doc") return { base: "aidoc", therapy: false, research: false, theme };
  const mode = (sp.get("mode") as "patient"|"doctor") || "patient";
  return {
    base: mode,
    therapy: sp.get("therapy") === "1" && mode === "patient",
    research: sp.get("research") === "1" && (mode === "patient" || mode === "doctor"),
    theme,
  };
}
