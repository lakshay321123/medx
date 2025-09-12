import { register } from "../registry";
type Sex = "male"|"female";
register({
  id: "egfr_ckdepi_2021",
  label: "eGFR (CKD-EPI 2021)",
  tags: ["renal"],
  inputs: [{ key:"Cr", required:true }, { key:"age", required:true }, { key:"sex", required:true }],
  run: ({ Cr, age, sex }: { Cr:number; age:number; sex:Sex }) => {
    if (Cr==null || age==null || !sex) return null;
    const k = sex==="female" ? 0.7 : 0.9;
    const a = sex==="female" ? -0.241 : -0.302;
    const alpha = Math.min(Cr/k, 1)**a;
    const beta  = Math.max(Cr/k, 1)**(-1.200);
    const sexFactor = sex==="female" ? 1.012 : 1.000;
    const egfr = 142 * alpha * beta * (0.9938 ** age) * sexFactor;
    return { id:"egfr_ckdepi_2021", label:"eGFR (CKD-EPI 2021)", value:+egfr.toFixed(0), unit:"mL/min/1.73m²", precision:0 };
  },
});
