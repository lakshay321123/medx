export type MrsInputs = { mrs: 0|1|2|3|4|5|6 };

export function label_mrs(s:MrsInputs["mrs"]):string {
  switch (s) {
    case 0: return "No symptoms";
    case 1: return "No significant disability";
    case 2: return "Slight disability";
    case 3: return "Moderate disability";
    case 4: return "Moderately severe disability";
    case 5: return "Severe disability";
    case 6: return "Death";
  }
}

const def = {
  id: "modified_rankin",
  label: "Modified Rankin Scale (mRS)",
  inputs: [{ id: "mrs", label: "mRS (0–6)", type: "number", min: 0, max: 6 }],
  run: (args: MrsInputs) => {
    const note = label_mrs(args.mrs);
    return { id: "modified_rankin", label: "mRS", value: args.mrs, unit: "score", precision: 0, notes: [note] };
  },
};
export default def;
