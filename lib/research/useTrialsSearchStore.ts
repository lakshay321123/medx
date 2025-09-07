import { create } from "zustand";

type Phase = 1 | 2 | 3 | 4;
type Status = "Recruiting" | "Completed" | "Active, not recruiting" | "Enrolling by invitation";
type CountryISO2 = "US" | "IN" | "GB" | "JP" | "EU" | "WW";

type State = {
  q: string;
  phases: Phase[];
  status: Status | "Any";
  countries: CountryISO2[];
  genes: string[];
  set: (p: Partial<State>) => void;
};

export const useTrialsSearchStore = create<State>((set) => ({
  q: "",
  phases: [],
  status: "Any",
  countries: [],
  genes: [],
  set: (p) => set(p),
}));
