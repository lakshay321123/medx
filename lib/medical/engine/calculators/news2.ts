import { register } from "../registry";

function sRR(x:number){ if (x<=8) return 3; if (x<=11) return 1; if (x<=20) return 0; if (x<=24) return 2; return 3; }
function sSpO2(x:number){ if (x<=91) return 3; if (x<=93) return 2; if (x<=95) return 1; return 0; }
function sTemp(x:number){ if (x<=35.0) return 3; if (x<=36.0) return 1; if (x<=38.0) return 0; if (x<=39.0) return 1; return 2; }
function sSBP(x:number){ if (x<=90) return 3; if (x<=100) return 2; if (x<=110) return 1; if (x<=219) return 0; return 3; }
function sHR(x:number){ if (x<=40) return 3; if (x<=50) return 1; if (x<=90) return 0; if (x<=110) return 1; if (x<=130) return 2; return 3; }
function sCNS(s:string){ const v=s.toLowerCase(); return (v==="a"||v==="alert")?0:3; }

register({
  id: "news2",
  label: "NEWS2 (Scale 1)",
  tags: ["vitals","risk"],
  inputs: [
    { key: "RR", required: true },
    { key: "spo2_percent", required: true },
    { key: "on_o2", required: true },
    { key: "temp_c", required: true },
    { key: "SBP", required: true },
    { key: "HR", required: true },
    { key: "consciousness", required: true },
  ],
  run: ({ RR, spo2_percent, on_o2, temp_c, SBP, HR, consciousness }) => {
    if ([RR, spo2_percent, temp_c, SBP, HR].some(v => v==null) || consciousness==null || on_o2==null) return null;
    const rr = Number(RR), sp = Number(spo2_percent), tc = Number(temp_c), sbp = Number(SBP), hr = Number(HR);
    if (![rr,sp,tc,sbp,hr].every(Number.isFinite)) return null;
    const cns = String(consciousness);

    const rrS=sRR(rr), spS=sSpO2(sp), tS=sTemp(tc), bpS=sSBP(sbp), hrS=sHR(hr), cS=sCNS(cns);
    const subs = [rrS, spS, tS, bpS, hrS, cS];
    const o2 = on_o2 ? 2 : 0;
    const total = subs.reduce((a,b)=>a+b,0) + o2;
    const singleThrees = subs.filter(v=>v===3).length;
    const band = total>=7 ? "high" : (total>=5 || singleThrees>=1) ? "medium" : total>=1 ? "low" : "zero";

    const notes = [`risk: ${band}${on_o2 ? " (on O₂)" : ""}`];
    if (singleThrees>=1) notes.push(`single-parameter 3s: ${singleThrees}`);

    return { id:"news2", label:"NEWS2 (Scale 1)", value: total, precision:0, notes };
  },
});

