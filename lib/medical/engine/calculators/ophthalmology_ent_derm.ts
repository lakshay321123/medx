import { register } from "../registry";

/* ================== Rare Specialties (Ophthalmology, ENT, Derm ext) ================== */

register({
  id: "iop_band",
  label: "Intraocular pressure band",
  tags: ["ophthalmology"],
  inputs: [{ key: "iop", required: true }],
  run: ({ iop }) => {
    let band = "normal";
    if (iop > 21) band = "elevated";
    else if (iop < 10) band = "low";
    return { id: "iop_band", label: "Intraocular pressure band", value: iop, unit: "mmHg", precision: 0, notes: [band] };
  }
});

register({
  id: "visual_acuity_decimal",
  label: "Visual acuity (Snellen → decimal)",
  tags: ["ophthalmology"],
  inputs: [{ key: "snellen_num", required: true }, { key: "snellen_den", required: true }],
  run: ({ snellen_num, snellen_den }) => {
    if (snellen_den <= 0) return null;
    const dec = snellen_num/snellen_den;
    return { id: "visual_acuity_decimal", label: "Visual acuity (Snellen → decimal)", value: dec, unit: "decimal", precision: 2, notes: [] };
  }
});

register({
  id: "hearing_loss_flag",
  label: "Hearing loss flag",
  tags: ["ent"],
  inputs: [{ key: "db_loss", required: true }],
  run: ({ db_loss }) => {
    let band = "normal";
    if (db_loss >= 40) band = "moderate-severe";
    else if (db_loss >= 20) band = "mild";
    return { id: "hearing_loss_flag", label: "Hearing loss flag", value: db_loss, unit: "dB", precision: 0, notes: [band] };
  }
});

register({
  id: "derm_severity_index",
  label: "Dermatology severity extension",
  tags: ["dermatology"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    let band = "mild";
    if (score >= 15) band = "severe";
    else if (score >= 8) band = "moderate";
    return { id: "derm_severity_index", label: "Dermatology severity extension", value: score, unit: "points", precision: 0, notes: [band] };
  }
});
