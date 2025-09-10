import { register } from "../registry";

/* ================== Pharmacology ================== */

register({
  id: "renal_dose_flag",
  label: "Renal dose adjustment flag",
  tags: ["pharmacology"],
  inputs: [{ key: "eGFR", required: true }],
  run: ({ eGFR }) => {
    const notes = [eGFR < 30 ? "adjust dosing required" : eGFR < 60 ? "review dosing" : "standard dosing"];
    return { id: "renal_dose_flag", label: "Renal dose adjustment flag", value: eGFR, unit: "mL/min/1.73m²", precision: 0, notes };
  }
});

register({
  id: "hepatic_dose_flag",
  label: "Hepatic dose adjustment flag",
  tags: ["pharmacology","hepatology"],
  inputs: [{ key: "child_pugh_class", required: true }], // A/B/C
  run: ({ child_pugh_class }) => {
    const c = (child_pugh_class||"").toString().toUpperCase();
    const notes = [c==="C" ? "avoid/adjust many drugs" : c==="B" ? "consider reduction" : "standard dosing"];
    return { id: "hepatic_dose_flag", label: "Hepatic dose adjustment flag", value: c, unit: "class", precision: 0, notes };
  }
});

register({
  id: "drug_level_band",
  label: "Drug level band (digoxin/lithium/gentamicin)",
  tags: ["pharmacology"],
  inputs: [{ key: "drug", required: true }, { key: "level", required: true }],
  run: ({ drug, level }) => {
    const d = (drug||"").toString().toLowerCase();
    let band = "therapeutic";
    let unit = "mg/L";
    if (d === "digoxin") {
      if (level > 2) band = "toxic"; else if (level < 0.5) band = "subtherapeutic";
      unit = "ng/mL";
    } else if (d === "lithium") {
      if (level > 1.5) band = "toxic"; else if (level < 0.6) band = "subtherapeutic";
    } else if (d === "gentamicin" || d==="tobramycin" || d==="amikacin") {
      if (level > 12) band = "toxic"; else if (level < 5) band = "subtherapeutic";
    } else {
      band = "unknown drug";
    }
    return { id: "drug_level_band", label: "Drug level band (digoxin/lithium/gentamicin)", value: level, unit, precision: 2, notes: [band] };
  }
});
