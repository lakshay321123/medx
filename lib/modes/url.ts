import type { ModeState } from "./types";

export function toQuery(state: ModeState, current?: URLSearchParams): string {
  if (state.base === "aidoc")
    return "/?panel=chat&threadId=med-profile&context=profile";
  const p = current ? new URLSearchParams(current) : new URLSearchParams();
  p.set("panel", "chat");
  p.set("mode", state.base);
  if (state.therapy) p.set("therapy", "1"); else p.delete("therapy");
  if (state.research) p.set("research", "1"); else p.delete("research");
  return `/?${p.toString()}`;
}

export function fromSearchParams(
  sp: URLSearchParams,
  theme: "light" | "dark"
): ModeState {
  const panel = sp.get("panel");
  const threadId = sp.get("threadId");
  const context = sp.get("context");
  if (
    panel === "ai-doc" ||
    (panel === "chat" && threadId === "med-profile" && context === "profile")
  ) {
    return { base: "aidoc", therapy: false, research: false, theme };
  }
  const mode = (sp.get("mode") as "patient" | "doctor") || "patient";
  return {
    base: mode,
    therapy: sp.get("therapy") === "1" && mode === "patient",
    research: sp.get("research") === "1" &&
      (mode === "patient" || mode === "doctor"),
    theme,
  };
}
