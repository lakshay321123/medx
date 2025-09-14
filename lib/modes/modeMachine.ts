import type { ModeState } from "./types";

export type Action =
  | { type: "set/base"; base: "patient" | "doctor" | "aidoc" }
  | { type: "toggle/patient" }
  | { type: "toggle/doctor" }
  | { type: "toggle/therapy" }   // implies base=patient
  | { type: "toggle/research" }  // base must be patient/doctor; aidoc -> patient
  | { type: "toggle/aidoc" }     // exclusive; turns others off
  | { type: "toggle/theme" };

export function canonicalize(s: ModeState): ModeState {
  const out = { ...s };
  if (out.base === "aidoc") { out.therapy = false; out.research = false; }
  if (out.base === "doctor") { out.therapy = false; }
  if (out.therapy) { out.research = false; } // never allow tri-combo
  return out;
}

export function reduce(s: ModeState, a: Action): ModeState {
  let n = { ...s };
  switch (a.type) {
    case "toggle/patient":
      n.base = "patient";
      break;
    case "toggle/doctor":
      n.base = "doctor";
      break;
    case "toggle/therapy":
      n.base = "patient";
      n.therapy = !s.therapy;
      if (n.therapy) n.research = false;
      break;
    case "toggle/research":
      if (s.base === "aidoc") n.base = "patient";
      n.research = !s.research;
      if (n.research) { n.base = n.base === "doctor" ? "doctor" : "patient"; n.therapy = false; }
      break;
    case "toggle/aidoc":
      n.base = s.base === "aidoc" ? "patient" : "aidoc"; // component can remember last non-aidoc if desired
      n.therapy = false;
      n.research = false;
      break;
    case "set/base":
      n.base = a.base;
      break;
    case "toggle/theme":
      n.theme = s.theme === "dark" ? "light" : "dark";
      break;
  }
  return canonicalize(n);
}
