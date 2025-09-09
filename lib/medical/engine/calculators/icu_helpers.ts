import { register } from "../registry";

// Mean arterial pressure
register({
  id: "map",
  label: "Mean arterial pressure",
  inputs: [{ key: "SBP", required: true }, { key: "DBP", required: true }],
  run: ({ SBP, DBP }) => {
    if (SBP == null || DBP == null) return null;
    const val = (SBP + 2 * DBP) / 3;
    const notes: string[] = [];
    if (val < 65) notes.push("MAP < 65 (low perfusion)");
    return { id: "map", label: "Mean arterial pressure", value: val, unit: "mmHg", precision: 0, notes };
  },
});

// Shock index
register({
  id: "shock_index",
  label: "Shock index",
  inputs: [{ key: "HR", required: true }, { key: "SBP", required: true }],
  run: ({ HR, SBP }) => {
    if (HR == null || SBP == null || SBP === 0) return null;
    const val = HR / SBP;
    const notes: string[] = [];
    if (val >= 0.9) notes.push("elevated (hemodynamic concern)");
    return { id: "shock_index", label: "Shock index", value: val, precision: 2, notes };
  },
});
