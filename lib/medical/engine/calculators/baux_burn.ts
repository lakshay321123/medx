// Batch 14 calculator
export type BauxInputs = { age_years: number; tbsa_percent: number; inhalation_injury: boolean };

export function calc_baux(i: BauxInputs): { baux: number; revised_baux: number } {
  const baux = i.age_years + i.tbsa_percent;
  const revised = baux + (i.inhalation_injury ? 17 : 0);
  return { baux, revised_baux: revised };
}

const def = {
  id: "baux_burn",
  label: "Baux Burn Score (± inhalation)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "tbsa_percent", label: "TBSA burned (%)", type: "number", min: 0, max: 100 },
    { id: "inhalation_injury", label: "Inhalation injury", type: "boolean" }
  ],
  run: (args: BauxInputs) => {
    const r = calc_baux(args);
    const notes = [`Revised Baux ${r.revised_baux}`];
    return { id: "baux_burn", label: "Baux Score", value: r.baux, unit: "score", precision: 0, notes, extra: r };
  },
};

export default def;
