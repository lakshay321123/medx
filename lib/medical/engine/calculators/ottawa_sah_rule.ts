/**
 * Ottawa Subarachnoid Hemorrhage Rule
 * High risk if any of the following are present:
 * - Age >= 40
 * - Neck pain or stiffness
 * - Witnessed loss of consciousness
 * - Onset during exertion
 * - Thunderclap onset (instantly peaking pain)
 * - Limited neck flexion on examination
 */
export interface OttawaSAHInput {
  age: number;
  neck_pain_or_stiffness: boolean;
  witnessed_loc: boolean;
  onset_during_exertion: boolean;
  thunderclap_onset: boolean;
  limited_neck_flexion: boolean;
}
export interface OttawaSAHResult { high_risk: boolean; }
export function runOttawaSAH(i: OttawaSAHInput): OttawaSAHResult {
  const high = (i.age >= 40) || i.neck_pain_or_stiffness || i.witnessed_loc || i.onset_during_exertion || i.thunderclap_onset || i.limited_neck_flexion;
  return { high_risk: high };
}
