/**
 * Quick Pitt Bacteremia Score (qPitt)
 * Binary components at presentation (1 point each):
 * - Hypothermia: temperature < 36.0 °C
 * - Hypotension: SBP < 90 mmHg OR vasopressor use
 * - Respiratory failure: RR >= 25 /min OR on invasive mechanical ventilation
 * - Cardiac arrest: present
 * - Altered mental status: present
 * Total 0–5. qPitt >= 2 often flags high risk.
 */
export interface QPittInput {
  temp_c?: number;
  sbp_mmHg?: number;
  on_vasopressors?: boolean;
  rr_per_min?: number;
  invasive_mech_vent?: boolean;
  cardiac_arrest?: boolean;
  altered_mental_status?: boolean;
}
export interface QPittOutput {
  points: number;
  flags: {
    hypothermia: boolean;
    hypotension_or_vaso: boolean;
    resp_fail: boolean;
    cardiac_arrest: boolean;
    ams: boolean;
  };
  high_risk: boolean; // >=2
}
export function runQPitt(i:QPittInput): QPittOutput {
  const hypothermia = (i.temp_c ?? 37) < 36.0;
  const hypotension_or_vaso = (i.sbp_mmHg ?? 200) < 90 || !!i.on_vasopressors;
  const resp_fail = (i.rr_per_min ?? 0) >= 25 || !!i.invasive_mech_vent;
  const cardiac_arrest = !!i.cardiac_arrest;
  const ams = !!i.altered_mental_status;
  const points = [hypothermia, hypotension_or_vaso, resp_fail, cardiac_arrest, ams].reduce((a,b)=>a+(b?1:0),0);
  return { points, flags: { hypothermia, hypotension_or_vaso, resp_fail, cardiac_arrest, ams }, high_risk: points>=2 };
}
