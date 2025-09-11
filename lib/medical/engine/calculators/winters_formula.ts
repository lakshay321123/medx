// Winter's formula: expected PaCO2 for metabolic acidosis
// expected PaCO2 (mmHg) = 1.5 * HCO3 + 8  (± 2)
export type WintersInputs = { hco3_mmol_l: number };

export function calc_winters(i: WintersInputs): { expected_paco2_mm_hg: number; low: number; high: number } {
  const expected = 1.5 * i.hco3_mmol_l + 8;
  const low = expected - 2;
  const high = expected + 2;
  return { expected_paco2_mm_hg: Number(expected.toFixed(1)), low: Number(low.toFixed(1)), high: Number(high.toFixed(1)) };
}

// Example "result object" creator, if your engine uses notes.
export function winters_notes(r: {low:number; high:number}) {
  return [`Expected PaCO2 ${r.low.toFixed(1)}–${r.high.toFixed(1)} mmHg`];
}

export default calc_winters;
