/**
 * BAP-65 score for AECOPD
 * Components (1 point each): BUN >= 25 mg/dL, Altered mental status, Pulse >= 109 bpm, Age >= 65 years.
 * Total 0–4. Higher is worse. Risk class: I (0), II (1), III (2), IV (3), V (4).
 */
export interface BAP65Input {
  bun_mg_dL?: number;
  altered_mental_status?: boolean;
  pulse_bpm?: number;
  age_years?: number;
}
export interface BAP65Output {
  points: number;
  class: "I"|"II"|"III"|"IV"|"V";
  flags: { bun:boolean; ams:boolean; pulse:boolean; age:boolean };
}
export function runBAP65(i: BAP65Input): BAP65Output {
  const bun = (i.bun_mg_dL ?? NaN) >= 25;
  const ams = !!i.altered_mental_status;
  const pulse = (i.pulse_bpm ?? NaN) >= 109;
  const age = (i.age_years ?? NaN) >= 65;
  const points = [bun,ams,pulse,age].reduce((a,b)=>a+(b?1:0),0);
  const cls = points===0?"I": points===1?"II": points===2?"III": points===3?"IV":"V";
  return { points, class: cls, flags: { bun, ams, pulse, age } };
}
