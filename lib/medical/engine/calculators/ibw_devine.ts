// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type IBWInputs = { sex: "male" | "female"; height_cm: number };

function inches_from_cm(cm: number): number { return cm / 2.54; }

export function calc_ibw_devine({ sex, height_cm }: IBWInputs): number {
  const inches = inches_from_cm(height_cm);
  const over60 = Math.max(inches - 60, 0);
  const base = sex === "male" ? 50 : 45.5;
  return base + 2.3 * over60;
}

const def = {
  id: "ibw_devine",
  label: "Ideal Body Weight (Devine)",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}]},
    { id: "height_cm", label: "Height (cm)", type: "number", min: 100, max: 250 }
  ],
  run: (args: IBWInputs) => {
    const v = calc_ibw_devine(args);
    return { id: "ibw_devine", label: "Ideal Body Weight (Devine)", value: v, unit: "kg", precision: 2, notes: [] };
  },
};

export default def;
