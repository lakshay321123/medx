export type BaseMode = "patient" | "doctor" | "aidoc";
export type Theme = "light" | "dark";

export interface ModeState {
  base: BaseMode;        // patient | doctor | aidoc
  therapy: boolean;      // only when base=patient
  research: boolean;     // allowed when base=patient or doctor
  theme: Theme;          // light | dark
}
