export type NEWS2Inputs = {
  rr: number;             // breaths/min
  spo2_percent: number;   // %
  temp_c: number;         // °C
  sbp: number;            // mmHg
  hr: number;             // bpm
  consciousness: "A"|"C"|"V"|"P"|"U";
  on_supplemental_o2?: boolean;
};

function score_rr(x:number){ if (x<=8) return 3; if (x<=11) return 1; if (x<=20) return 0; if (x<=24) return 2; return 3; }
function score_spo2(x:number){ if (x<=91) return 3; if (x<=93) return 2; if (x<=95) return 1; return 0; }
function score_temp(x:number){ if (x<=35.0) return 3; if (x<=36.0) return 1; if (x<=38.0) return 0; if (x<=39.0) return 1; return 2; }
function score_sbp(x:number){ if (x<=90) return 3; if (x<=100) return 2; if (x<=110) return 1; if (x<=219) return 0; return 3; }
function score_hr(x:number){ if (x<=40) return 3; if (x<=50) return 1; if (x<=90) return 0; if (x<=110) return 1; if (x<=130) return 2; return 3; }
function score_conscious(s:NEWS2Inputs["consciousness"]){ return s==="A" ? 0 : 3; }

export function calc_news2(i: NEWS2Inputs): { score: number; risk: "low"|"medium"|"high" } {
  const s = score_rr(i.rr) + score_spo2(i.spo2_percent) + score_temp(i.temp_c) + score_sbp(i.sbp) + score_hr(i.hr) + score_conscious(i.consciousness) + (i.on_supplemental_o2 ? 2 : 0);
  const any3 = [score_rr(i.rr), score_spo2(i.spo2_percent), score_temp(i.temp_c), score_sbp(i.sbp), score_hr(i.hr), score_conscious(i.consciousness)].some(x => x === 3);
  let risk: "low"|"medium"|"high" = "low";
  if (s >= 7) risk = "high";
  else if (s >= 5 || any3) risk = "medium";
  return { score: s, risk };
}

const def = {
  id: "news2",
  label: "NEWS2",
  inputs: [
    { id: "rr", label: "Respiratory rate (breaths/min)", type: "number", min: 0 },
    { id: "spo2_percent", label: "SpO₂ (%)", type: "number", min: 0, max: 100 },
    { id: "temp_c", label: "Temperature (°C)", type: "number", min: 25, max: 45 },
    { id: "sbp", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "hr", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "consciousness", label: "AVPU", type: "select", options: [{label:"Alert (A)", value:"A"},{label:"Voice (V)", value:"V"},{label:"Pain (P)", value:"P"},{label:"Unresponsive (U)", value:"U"},{label:"New confusion (C)", value:"C"}] },
    { id: "on_supplemental_o2", label: "On supplemental O₂", type: "boolean" }
  ],
  run: (args: NEWS2Inputs) => {
    const r = calc_news2(args);
    const notes = [r.risk];
    return { id: "news2", label: "NEWS2", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
