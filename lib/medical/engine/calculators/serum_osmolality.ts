// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type SerumOsmInputs = {
  sodium_mmol_l: number;
  glucose_mg_dl?: number;
  bun_mg_dl?: number;
  ethanol_mg_dl?: number;
};

export function calc_serum_osmolality(i: SerumOsmInputs): number {
  const glucose = i.glucose_mg_dl ?? 0;
  const bun = i.bun_mg_dl ?? 0;
  const ethanol = i.ethanol_mg_dl ?? 0;
  return 2 * i.sodium_mmol_l + glucose / 18 + bun / 2.8 + ethanol / 3.7;
}

const def = {
  id: "serum_osmolality",
  label: "Serum Osmolality (calculated)",
  inputs: [
    { id: "sodium_mmol_l", label: "Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 },
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "ethanol_mg_dl", label: "Ethanol (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: SerumOsmInputs) => {
    const v = calc_serum_osmolality(args);
    return { id: "serum_osmolality", label: "Serum Osmolality", value: v, unit: "mOsm/kg", precision: 1, notes: [] };
  },
};

export default def;
