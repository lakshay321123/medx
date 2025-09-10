import { register } from "../registry";

export interface CGInput {
  sex: "male"|"female";
  age: number;
  weight_kg: number;
  scr_mg_dl: number;
  height_cm?: number;
  use_weight?: "actual" | "ideal" | "adjusted";
}
export function calcIBW(sex: "male"|"female", height_cm?: number) {
  if (!height_cm) return undefined;
  const height_in = height_cm / 2.54;
  const over5ft = Math.max(0, height_in - 60);
  const base = sex === "male" ? 50 : 45.5;
  return base + 2.3 * over5ft;
}
export function runCrCl_CG(i: CGInput) {
  const ibw = calcIBW(i.sex, i.height_cm);
  let wt = i.weight_kg;
  if (i.use_weight === "ideal" && ibw != null) wt = ibw;
  if (i.use_weight === "adjusted" && ibw != null) {
    wt = ibw + 0.4 * (i.weight_kg - ibw);
  }
  const base = ((140 - i.age) * wt) / (72 * i.scr_mg_dl);
  const crcl = i.sex === "female" ? base * 0.85 : base;
  return { crcl_ml_min: Number(crcl.toFixed(1)), ibw_kg: ibw != null ? Number(ibw.toFixed(1)) : undefined };
}

register({
  id: "creatinine_clearance_cg",
  label: "Creatinine clearance (Cockcroft–Gault)",
  inputs: [
    { key: "sex", required: true },
    { key: "age", required: true },
    { key: "weight_kg", required: true },
    { key: "scr_mg_dl", required: true },
    { key: "height_cm" },
    { key: "use_weight" },
  ],
  run: (ctx) => {
    const r = runCrCl_CG(ctx as any);
    const notes: string[] = [];
    if (r.ibw_kg != null) notes.push(`IBW ${r.ibw_kg} kg`);
    return { id: "creatinine_clearance_cg", label: "CrCl (Cockcroft–Gault)", value: r.crcl_ml_min, unit: "mL/min", notes, precision: 1 };
  },
});
