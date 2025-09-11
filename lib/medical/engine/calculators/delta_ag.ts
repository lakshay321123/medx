// Delta anion gap calculator (AG and delta-AG).
// AG = Na - (Cl + HCO3)
// delta-AG = (AG - 12) - (24 - HCO3)
// All inputs in mmol/L. Returns both AG and delta-AG.
export type DeltaAGInputs = {
  na_mmol_l: number;
  cl_mmol_l: number;
  hco3_mmol_l: number;
};

export function calc_delta_ag(i: DeltaAGInputs): { ag: number; delta_ag: number } {
  const ag = i.na_mmol_l - (i.cl_mmol_l + i.hco3_mmol_l);
  const delta_ag = (ag - 12) - (24 - i.hco3_mmol_l);
  return { ag, delta_ag }; // <-- fixed: returned delta_ag (not a misspelled variable)
}

export default calc_delta_ag;
