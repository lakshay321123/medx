export type UIMode = "patient" | "doctor";
export type FeatureMode = "therapy" | "research" | "aidoc";
export interface ModeState {
  ui?: UIMode;                // patient | doctor
  therapy: boolean;           // only allowed if ui==='patient'
  research: boolean;          // allowed if ui in ['patient','doctor']
  aidoc: boolean;             // standalone; disables others
  dark: boolean;
}
