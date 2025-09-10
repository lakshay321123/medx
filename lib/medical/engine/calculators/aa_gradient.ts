/**
 * Alveolar-arterial O2 gradient:
 * PAO2 = FiO2*(PB - 47) - PaCO2/0.8   (PB default 760 mmHg, water vapor 47)
 * A-a = PAO2 - PaO2
 */
export interface AAGradInput {
  fio2: number; // 0..1
  pao2: number;
  paco2: number;
  barometric_mmHg?: number; // default 760
}
export interface AAGradResult { pao2_alveolar: number; a_a_gradient: number; }
export function runAAGradient(i: AAGradInput): AAGradResult {
  const pb = i.barometric_mmHg ?? 760;
  const pao2_alv = i.fio2 * (pb - 47) - (i.paco2 / 0.8);
  return { pao2_alveolar: pao2_alv, a_a_gradient: pao2_alv - i.pao2 };
}
