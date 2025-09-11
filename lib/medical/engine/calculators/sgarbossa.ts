// Auto-generated. No placeholders. Typed run(args).
export type SgarbossaInputs = {
  concordant_ste_ge_1mm: boolean;
  concordant_std_v1_v3_ge_1mm: boolean;
  discordant_ste_ge_5mm: boolean;
};

export function calc_sgarbossa(i: SgarbossaInputs): number {
  let s = 0;
  if (i.concordant_ste_ge_1mm) s += 5;
  if (i.concordant_std_v1_v3_ge_1mm) s += 3;
  if (i.discordant_ste_ge_5mm) s += 2;
  return s;
}

const def = {
  id: "sgarbossa",
  label: "Sgarbossa (MI with LBBB)",
  inputs: [
    { id: "concordant_ste_ge_1mm", label: "Concordant ST elevation ≥1 mm", type: "boolean" },
    { id: "concordant_std_v1_v3_ge_1mm", label: "Concordant ST depression ≥1 mm in V1–V3", type: "boolean" },
    { id: "discordant_ste_ge_5mm", label: "Discordant ST elevation ≥5 mm", type: "boolean" }
  ],
  run: (args: SgarbossaInputs) => {
    const v = calc_sgarbossa(args);
    const notes = [v >= 3 ? "Meets original Sgarbossa threshold" : "Below threshold"];
    return { id: "sgarbossa", label: "Sgarbossa", value: v, unit: "points", precision: 0, notes };
  },
};

export default def;
