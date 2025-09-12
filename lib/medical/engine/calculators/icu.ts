import { register } from "../registry";

register({
  id: "qsofa_partial",
  label: "qSOFA (partial)",
  inputs: [
    { key: "RRr" },
    { key: "SBP" },
  ],
  run: ({ RRr, SBP }) => {
    let score = 0;
    if (RRr != null && RRr >= 22) score += 1;
    if (SBP != null && SBP <= 100) score += 1;
    return {
      id: "qsofa_partial",
      label: "qSOFA (partial)",
      value: score,
      precision: 0,
      notes: ["Mentation not auto-scored in Phase-1"],
    };
  },
});
