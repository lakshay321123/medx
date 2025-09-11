export type MDFInputs = { pt_patient_sec: number; pt_control_sec: number; bilirubin_mg_dl: number };

export function calc_maddrey_df(i: MDFInputs): number {
  return 4.6 * (i.pt_patient_sec - i.pt_control_sec) + i.bilirubin_mg_dl;
}

const def = {
  id: "maddrey_df",
  label: "Maddrey Discriminant Function (alcoholic hepatitis)",
  inputs: [
    { id: "pt_patient_sec", label: "PT patient (sec)", type: "number", min: 0 },
    { id: "pt_control_sec", label: "PT control (sec)", type: "number", min: 0 },
    { id: "bilirubin_mg_dl", label: "Bilirubin (mg/dL)", type: "number", min: 0 }
  ],
  run: (args: MDFInputs) => {
    const v = calc_maddrey_df(args);
    const notes = [v >= 32 ? "severe (≥32)" : ""];
    return { id: "maddrey_df", label: "Maddrey DF", value: v, unit: "", precision: 1, notes: notes.filter(Boolean) };
  },
};

export default def;
