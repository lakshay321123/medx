import { register } from "../registry";

/* ================== Composite Risk Engines ================== */

register({
  id: "dka_severity_score",
  label: "DKA severity score (composite)",
  tags: ["endocrine","composite"],
  inputs: [
    { key: "glucose", required: true },
    { key: "ph", required: true },
    { key: "hco3", required: true },
    { key: "mental_status", required: true } // alert/drowsy/coma
  ],
  run: ({ glucose, ph, hco3, mental_status }) => {
    let severity = "mild";
    if (ph < 7.0 || hco3 < 10 || (mental_status||"").toLowerCase()==="coma") severity = "severe";
    else if (ph < 7.25 || hco3 < 15 || (mental_status||"").toLowerCase()==="drowsy") severity = "moderate";
    return { id: "dka_severity_score", label: "DKA severity score (composite)", value: glucose, unit: "mg/dL", precision: 0, notes: [severity] };
  }
});

register({
  id: "sepsis_bundle_flag",
  label: "Sepsis bundle flag",
  tags: ["infectious_disease","composite"],
  inputs: [
    { key: "qsofa", required: true },
    { key: "lactate", required: true }
  ],
  run: ({ qsofa, lactate }) => {
    const flag = qsofa >= 2 || lactate > 2;
    return { id: "sepsis_bundle_flag", label: "Sepsis bundle flag", value: flag ? 1 : 0, unit: "flag", precision: 0, notes: [flag ? "bundle indicated" : "not indicated"] };
  }
});
