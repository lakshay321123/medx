export type IBWInputs = { height_cm: number; sex: "male"|"female" };

export function calc_ideal_body_weight(i: IBWInputs): number {
  const inches = i.height_cm / 2.54;
  const over60 = inches - 60;
  const base = i.sex === "male" ? 50 : 45.5;
  return base + 2.3 * over60;
}

const def = {
  id: "ideal_body_weight",
  label: "Ideal Body Weight (Devine)",
  inputs: [
    { id: "height_cm", label: "Height (cm)", type: "number", min: 50, max: 250 },
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}] }
  ],
  run: (args: IBWInputs) => {
    const v = calc_ideal_body_weight(args);
    return { id: "ideal_body_weight", label: "IBW (Devine)", value: v, unit: "kg", precision: 1, notes: [] };
  },
};

export default def;
