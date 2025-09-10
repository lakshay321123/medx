
import { register } from "../registry";

export type NEWS2Inputs = {
  RR: number, SpO2: number, onOxygen: boolean, Temp_C: number,
  SBP: number, HR: number, ACVPU: "A"|"C"|"V"|"P"|"U"
};

function scoreRR(rr:number){
  if (!isFinite(rr) || rr<=0) return null as any;
  if (rr<=8) return 3;
  if (rr<=11) return 1;
  if (rr<=20) return 0;
  if (rr<=24) return 2;
  return 3;
}
function scoreSpO2(s:number){
  if (!isFinite(s) || s<=0) return null as any;
  if (s<=91) return 3;
  if (s<=93) return 2;
  if (s<=95) return 1;
  return 0; // >=96
}
function scoreTemp(t:number){
  if (!isFinite(t)) return null as any;
  if (t<35) return 3;
  if (t<36) return 1;
  if (t<=38) return 0;
  if (t<39.1) return 1;
  return 2;
}
function scoreSBP(x:number){
  if (!isFinite(x)) return null as any;
  if (x<=90) return 3;
  if (x<=100) return 2;
  if (x<=110) return 1;
  if (x<=219) return 0;
  return 3;
}
function scoreHR(x:number){
  if (!isFinite(x)) return null as any;
  if (x<=40) return 3;
  if (x<=50) return 1;
  if (x<=90) return 0;
  if (x<=110) return 1;
  if (x<=130) return 2;
  return 3;
}
function scoreACVPU(s:"A"|"C"|"V"|"P"|"U"){ return s==="A" ? 0 : 3; }

export function runNEWS2(i: NEWS2Inputs){
  if (!i) return null;
  const rr = scoreRR(i.RR), spo = scoreSpO2(i.SpO2), tmp = scoreTemp(i.Temp_C);
  const sbp = scoreSBP(i.SBP), hr = scoreHR(i.HR), av = scoreACVPU(i.ACVPU);
  if ([rr,spo,tmp,sbp,hr,av].some(v => v==null)) return null;
  let total = rr + spo + tmp + sbp + hr + av;
  if (i.onOxygen) total += 2;
  return { score: total, trigger: total>=5 ? "urgent response" : total>=1 ? "monitor" : "low" };
}

register({
  id: "news2",
  label: "NEWS2 (early warning)",
  inputs: [
    {key:"RR",required:true},{key:"SpO2",required:true},{key:"onOxygen",required:true},
    {key:"Temp_C",required:true},{key:"SBP",required:true},{key:"HR",required:true},
    {key:"ACVPU",required:true}
  ],
  run: runNEWS2 as any,
});
