/**
 * Henderson-Hasselbalch for pH:
 * pH = 6.1 + log10( HCO3 / (0.03 * PaCO2) )
 */
export interface HHInput { hco3: number; paco2: number; }
export interface HHResult { ph: number; }
export function runHendersonHasselbalch(i: HHInput): HHResult {
  const ph = 6.1 + Math.log10(i.hco3 / (0.03 * i.paco2));
  return { ph };
}
