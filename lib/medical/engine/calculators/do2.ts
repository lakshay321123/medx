/**
 * Oxygen delivery (DO2, mL O2/min):
 * DO2 = CaO2 (mL/dL) * Cardiac Output (L/min) * 10
 */
export interface DO2Input { cao2_ml_dl: number; cardiac_output_l_min: number; }
export interface DO2Result { do2_ml_min: number; }
export function runDO2(i: DO2Input): DO2Result {
  return { do2_ml_min: i.cao2_ml_dl * i.cardiac_output_l_min * 10 };
}
