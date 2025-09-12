import { register } from "../registry";

register({
  id: "psi_lite",
  label: "PSI-lite (screen)",
  tags: ["pneumonia","risk","screen"],
  inputs: [
    { key: "age", required: true },
    { key: "RR", required: true },
    { key: "SBP", required: true },
    { key: "temp_c", required: true },
    { key: "spo2_percent", required: true },
  ],
  run: ({ age, RR, SBP, temp_c, spo2_percent }) => {
    if ([age, RR, SBP, temp_c, spo2_percent].some(v=>v==null)) return null;
    let s=0;
    if (Number(age) >= 65) s++;
    if (Number(RR) >= 30) s++;
    if (Number(SBP) < 90) s++;
    const t = Number(temp_c);
    if (t < 35 || t >= 40) s++;
    if (Number(spo2_percent) <= 92) s++;
    const notes = [ s>=3 ? "risk: high (screen only)" : s===2 ? "risk: intermediate (screen only)" : "risk: lower (screen only)" ];
    return { id:"psi_lite", label:"PSI-lite (screen)", value:s, precision:0, notes };
  },
});

