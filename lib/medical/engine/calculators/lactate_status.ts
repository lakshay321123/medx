import { register } from "../registry";

register({
  id: "lactate_status",
  label: "Lactate",
  tags: ["acid-base", "sepsis"],
  inputs: [{ key: "Lactate", required: true }],
  run: ({ Lactate }) => {
    if (Lactate == null) return null;
    const notes: string[] = [];
    if (Lactate >= 4) notes.push("critical elevation (consider shock/sepsis/hypoperfusion)");
    else if (Lactate >= 2) notes.push("elevated");
    else notes.push("normal");
    return { id: "lactate_status", label: "Lactate", value: Number(Lactate.toFixed(1)), unit: "mmol/L", precision: 1, notes };
  },
});
