import { register } from "../registry";

// Child-Pugh (simplified automatic scoring needs albumin, bilirubin, INR)
// We output a numeric helper when all 3 exist; detailed class left for UI/Phase-2.
register({
  id: "child_pugh_helper",
  label: "Child-Pugh components present",
  inputs: [
    { key: "albumin", required: true },
    { key: "bilirubin", required: true },
    { key: "INR", required: true },
  ],
  run: ({ albumin, bilirubin, INR }) => {
    if (albumin == null || bilirubin == null || INR == null) return null;
    return { id: "child_pugh_helper", label: "Child-Pugh inputs detected", value: 1, precision: 0, notes: ["Albumin, bilirubin, INR available"] };
  },
});

