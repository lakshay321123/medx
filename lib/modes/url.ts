import type { ModeState } from "./types";
import type { ReadonlyURLSearchParams } from "next/navigation";

export function toQuery(
  state: ModeState,
  current?: URLSearchParams | ReadonlyURLSearchParams,
): string {
  if (state.base === "aidoc")
    return "/?panel=chat&threadId=med-profile&context=profile";
  const p = new URLSearchParams(current ? current.toString() : undefined);
  p.set("panel", "chat");
  p.set("mode", state.base);
  if (state.therapy && state.base === "patient") p.set("therapy", "1");
  else p.delete("therapy");
  if (state.research && (state.base === "patient" || state.base === "doctor"))
    p.set("research", "1");
  else p.delete("research");
  if (
    p.get("threadId") === "med-profile" &&
    p.get("context") === "profile"
  ) {
    p.delete("threadId");
    p.delete("context");
  }
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
