export type CfsInputs = { cfs: 1|2|3|4|5|6|7|8|9 };

export function cfs_label(s:CfsInputs["cfs"]):string {
  const map:{[k:number]:string} = {
    1:"Very Fit",
    2:"Well",
    3:"Managing Well",
    4:"Vulnerable",
    5:"Mildly Frail",
    6:"Moderately Frail",
    7:"Severely Frail",
    8:"Very Severely Frail",
    9:"Terminally Ill",
  };
  return map[s];
}

const def = {
  id: "clinical_frailty_scale",
  label: "Clinical Frailty Scale (CFS)",
  inputs: [{ id: "cfs", label: "CFS (1–9)", type: "number", min: 1, max: 9 }],
  run: (args: CfsInputs) => {
    return { id: "clinical_frailty_scale", label: "CFS", value: args.cfs, unit: "score", precision: 0, notes: [cfs_label(args.cfs)] };
  },
};
export default def;
