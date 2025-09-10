/**
 * BAP-65 (0–4) for AECOPD
 * B: BUN >=25 mg/dL
 * A: Altered mental status
 * P: Pulse >=110 bpm
 * 65: Age >=65
 */
export interface BAP65Input { bun_mg_dl: number; altered_mental_status: boolean; pulse_bpm: number; age: number; }
export interface BAP65Result { score: number; }
export function runBAP65(i: BAP65Input): BAP65Result {
  let s = 0;
  if (i.bun_mg_dl >= 25) s += 1;
  if (i.altered_mental_status) s += 1;
  if (i.pulse_bpm >= 110) s += 1;
  if (i.age >= 65) s += 1;
  return { score: s };
}
