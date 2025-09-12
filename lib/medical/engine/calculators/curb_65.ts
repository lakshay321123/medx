import { register } from "../registry";

register({
  id: "curb_65",
  label: "CURB-65",
  tags: ["pneumonia","risk"],
  inputs: [
    { key: "confusion", required: true },
    { key: "BUN", required: true },       // mg/dL
    { key: "RR", required: true },
    { key: "SBP", required: true },
    { key: "DBP", required: true },
    { key: "age", required: true },
  ],
  run: ({ confusion, BUN, RR, SBP, DBP, age }) => {
    if ([BUN, RR, SBP, DBP, age].some(v=>v==null) || confusion==null) return null;
    let s = 0;
    const conf = (typeof confusion==="string") ? /^(yes|y|true|new|confused|v|p|u)$/i.test(confusion) : !!confusion;
    if (conf) s++;
    if (Number(BUN) >= 20) s++;                 // mg/dL
    if (Number(RR) >= 30) s++;
    if (Number(SBP) < 90 || Number(DBP) <= 60) s++;
    if (Number(age) >= 65) s++;
    const notes = [ s>=3 ? "risk: high" : s===2 ? "risk: moderate" : "risk: low" ];
    return { id:"curb_65", label:"CURB-65", value:s, precision:0, notes };
  },
});

