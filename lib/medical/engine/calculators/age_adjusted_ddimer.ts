// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type DdInputs = {
  age_years: number;
};

export function calc_age_adjusted_ddimer({ age_years }: DdInputs): number {
  if (age_years <= 50) return 500;
  return age_years * 10;
}

const def = {
  id: "age_adjusted_ddimer",
  label: "Age-adjusted D-dimer cutoff",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 }
  ],
  run: (args: DdInputs) => {
    const v = calc_age_adjusted_ddimer(args);
    return { id: "age_adjusted_ddimer", label: "Age-adjusted D-dimer", value: v, unit: "ng/mL FEU", precision: 0, notes: [] };
  },
};

export default def;
