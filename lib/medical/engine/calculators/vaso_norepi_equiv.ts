
/**
 * Norepinephrine Equivalents (NEE) – Goradia et al. 2021 suggested formula.
 * All doses in mcg/kg/min, except vasopressin in units/min.
 * NE = norepinephrine + epinephrine + phenylephrine/10 + dopamine/100 + metaraminol/8 + vasopressin*2.5 + angiotensinII*10
 */
export type NEEInputs = {
  norepi?: number;           // mcg/kg/min
  epi?: number;              // mcg/kg/min
  phenylephrine?: number;    // mcg/kg/min
  dopamine?: number;         // mcg/kg/min
  metaraminol?: number;      // mcg/kg/min
  vasopressin_u_min?: number; // units/min
  angiotensinII?: number;    // mcg/kg/min
};

export function calcNEE(i: NEEInputs) {
  const v = (x?: number) => (typeof x === "number" && isFinite(x) ? x : 0);
  const ne = v(i.norepi) + v(i.epi) + v(i.phenylephrine)/10 + v(i.dopamine)/100 + v(i.metaraminol)/8 + v(i.vasopressin_u_min)*2.5 + v(i.angiotensinII)*10;
  return ne; // mcg/kg/min norepinephrine equivalents
}
