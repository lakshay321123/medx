export type RBSInputs = { age_years: number; tbsa_percent: number; inhalation_injury: boolean };

export function calc_revised_baux(i: RBSInputs): number {
  return i.age_years + i.tbsa_percent + (i.inhalation_injury ? 17 : 0);
}

const def = {
  id: "revised_baux",
  label: "Revised Baux Score (burn mortality)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "tbsa_percent", label: "TBSA burn (%)", type: "number", min: 0, max: 100 },
    { id: "inhalation_injury", label: "Inhalation injury", type: "boolean" }
  ],
  run: (args: RBSInputs) => {
    const v = calc_revised_baux(args);
    return { id: "revised_baux", label: "Revised Baux Score", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
