import { register } from "../registry";

// Placeholders to indicate inputs present; full scoring needs categorical flags.
// We expose "detected" so Doctor Mode can prompt for missing factors.

register({
  id: "chadsvasc_detected",
  label: "CHA₂DS₂-VASc (inputs needed)",
  inputs: [],
  run: () => ({ id: "chadsvasc_detected", label: "CHA₂DS₂-VASc (inputs needed)", value: 0, precision: 0, notes: ["Ask: age, sex, CHF, HTN, DM, stroke/TIA, vascular disease"] }),
});

register({
  id: "hasbled_detected",
  label: "HAS-BLED (inputs needed)",
  inputs: [],
  run: () => ({ id: "hasbled_detected", label: "HAS-BLED (inputs needed)", value: 0, precision: 0, notes: ["Ask: HTN, renal/liver fx, stroke, bleeding, INR lability, age, drugs/alcohol"] }),
});

