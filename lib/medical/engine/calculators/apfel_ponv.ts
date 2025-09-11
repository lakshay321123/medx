export type ApfelInputs = { female: boolean; non_smoker: boolean; history_ponv_motion: boolean; postoperative_opioids: boolean };

export function calc_apfel_ponv(i: ApfelInputs): number {
  let s = 0;
  s += i.female ? 1 : 0;
  s += i.non_smoker ? 1 : 0;
  s += i.history_ponv_motion ? 1 : 0;
  s += i.postoperative_opioids ? 1 : 0;
  return s;
}

const def = {
  id: "apfel_ponv",
  label: "Apfel Score (PONV)",
  inputs: [
    { id: "female", label: "Female", type: "boolean" },
    { id: "non_smoker", label: "Non-smoker", type: "boolean" },
    { id: "history_ponv_motion", label: "History of PONV or motion sickness", type: "boolean" },
    { id: "postoperative_opioids", label: "Postoperative opioids planned", type: "boolean" }
  ],
  run: (args: ApfelInputs) => {
    const v = calc_apfel_ponv(args);
    return { id: "apfel_ponv", label: "Apfel (PONV)", value: v, unit: "risk factors", precision: 0, notes: [] };
  },
};

export default def;
