// lib/medical/engine/calculators/vaso_norepi_equiv.ts
// Norepinephrine-equivalent dose (NEE) helper in µg/kg/min.
// Heuristic mapping commonly used in critical care literature; values vary by source.
// Use clinically with caution.

export interface VasoInput {
  norepi?: number | null;      // µg/kg/min
  epi?: number | null;         // µg/kg/min
  dopamine?: number | null;    // µg/kg/min
  phenylephrine?: number | null; // µg/kg/min
  vasopressin?: number | null; // units/min (commonly 0.03 units/min ≈ NEE 0.08–0.1)
  dobutamine?: number | null;  // µg/kg/min (inotropic; no direct vasoconstrictor equiv, set 0)
}

export interface VasoOutput {
  nee_total: number;
  parts: {
    norepi: number;
    epi: number;
    dopamine: number;
    phenylephrine: number;
    vasopressin: number;
  };
}

/** Default mapping: NEE = NE + EPI + DOPA/100 + PHENY/10 + VASO*2.5 */
export function norepiEquivalent(i: VasoInput): VasoOutput {
  const ne = i.norepi ?? 0;
  const ep = i.epi ?? 0;
  const dopa = (i.dopamine ?? 0) / 100;
  const phenyl = (i.phenylephrine ?? 0) / 10;
  const vaso = (i.vasopressin ?? 0) * 2.5;
  const nee = ne + ep + dopa + phenyl + vaso;
  const rounded = (x:number,p=3)=>Math.round(x*10**p)/10**p;
  return {
    nee_total: rounded(nee,3),
    parts: {
      norepi: rounded(ne,3),
      epi: rounded(ep,3),
      dopamine: rounded(dopa,3),
      phenylephrine: rounded(phenyl,3),
      vasopressin: rounded(vaso,3),
    }
  };
}
