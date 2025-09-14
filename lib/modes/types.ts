export type BaseMode = "patient" | "doctor" | "aidoc";
export type Theme = "light" | "dark";

export interface ModeState {
  base: BaseMode;
  therapy: boolean;
  research: boolean;
  theme: Theme;
}
