// NEWS2 calculator (Scale 1). Returns total score and risk band.
export type NEWS2Inputs = {
  rr: number;               // breaths/min
  spo2_percent: number;     // % (Scale 1 assumed)
  temp_c: number;           // °C
  sbp: number;              // mmHg
  hr: number;               // bpm
  consciousness: "alert" | "voice" | "pain" | "unresponsive" | "new_confusion";
  on_supplemental_o2?: boolean;
};

function score_rr(x:number){ if (x<=8) return 3; if (x<=11) return 1; if (x<=20) return 0; if (x<=24) return 2; return 3; }
function score_spo2(x:number){ if (x<=91) return 3; if (x<=93) return 2; if (x<=95) return 1; return 0; }
function score_temp(x:number){ if (x<=35.0) return 3; if (x<=36.0) return 1; if (x<=38.0) return 0; if (x<=39.0) return 1; return 2; }
function score_sbp(x:number){ if (x<=90) return 3; if (x<=100) return 2; if (x<=110) return 1; if (x<=219) return 0; return 3; }
function score_hr(x:number){ if (x<=40) return 3; if (x<=50) return 1; if (x<=90) return 0; if (x<=110) return 1; if (x<=130) return 2; return 3; }
function score_conscious(c:NEWS2Inputs["consciousness"]){ return c==="alert" ? 0 : 3; }

export function calc_news2(i: NEWS2Inputs): { score: number; risk: "low"|"medium"|"high" } {
  const s_rr = score_rr(i.rr);
  const s_spo2 = score_spo2(i.spo2_percent);
  const s_temp = score_temp(i.temp_c);
  const s_sbp = score_sbp(i.sbp);
  const s_hr = score_hr(i.hr);
  const s_con = score_conscious(i.consciousness);
  const o2 = i.on_supplemental_o2 ? 2 : 0;

  const subs = [s_rr, s_spo2, s_temp, s_sbp, s_hr, s_con];
  const any3 = subs.some(x => x === 3);
  const total = subs.reduce((a,b)=>a+b, 0) + o2;

  let risk: "low"|"medium"|"high" = "low";
  if (total >= 7) risk = "high";
  else if (total >= 5 || any3) risk = "medium"; // <-- fixed 'or' -> '||'

  return { score: total, risk };
}

export default calc_news2;
