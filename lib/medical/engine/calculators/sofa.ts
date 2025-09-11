// Batch 14 calculator
export type SOFAInputs = {
  pao2_fio2: number; // PaO2/FiO2 ratio
  platelets_10e9_l: number;
  bilirubin_mg_dl: number;
  map_mm_hg: number;
  vasopressors?: "none"|"dopamine_le_5"|"dopamine_5_15"|"dopamine_gt_15"|"epi_any"|"norepi_any";
  gcs: number;
  creatinine_mg_dl: number;
  urine_ml_day?: number;
};

function resp_score(pf: number): number {
  if (pf < 100) return 4;
  if (pf < 200) return 3;
  if (pf < 300) return 2;
  if (pf < 400) return 1;
  return 0;
}
function coag_score(plts: number): number {
  if (plts < 20) return 4;
  if (plts < 50) return 3;
  if (plts < 100) return 2;
  if (plts < 150) return 1;
  return 0;
}
function liver_score(bili: number): number {
  if (bili >= 12.0) return 4;
  if (bili >= 6.0) return 3;
  if (bili >= 2.0) return 2;
  if (bili >= 1.2) return 1;
  return 0;
}
function cardio_score(map: number, vp?: SOFAInputs["vasopressors"]): number {
  if (!vp || vp === "none") {
    if (map < 70) return 1;
    return 0;
  }
  if (vp === "dopamine_le_5") return 2;
  if (vp === "dopamine_5_15") return 3;
  if (vp === "dopamine_gt_15" || vp === "epi_any" || vp === "norepi_any") return 4;
  return 0;
}
function cns_score(gcs: number): number {
  if (gcs < 6) return 4;
  if (gcs < 10) return 3;
  if (gcs < 13) return 2;
  if (gcs < 15) return 1;
  return 0;
}
function renal_score(cr: number, urine?: number): number {
  if (cr >= 5.0 || (typeof urine === "number" && urine < 200)) return 4;
  if (cr >= 3.5 || (typeof urine === "number" && urine < 500)) return 3;
  if (cr >= 2.0) return 2;
  if (cr >= 1.2) return 1;
  return 0;
}

export function calc_sofa(i: SOFAInputs): { total: number; subscores: {resp:number;coag:number;liver:number;cardio:number;cns:number;renal:number} } {
  const resp = resp_score(i.pao2_fio2);
  const coag = coag_score(i.platelets_10e9_l);
  const liver = liver_score(i.bilirubin_mg_dl);
  const cardio = cardio_score(i.map_mm_hg, i.vasopressors);
  const cns = cns_score(i.gcs);
  const renal = renal_score(i.creatinine_mg_dl, i.urine_ml_day);
  const total = resp + coag + liver + cardio + cns + renal;
  return { total, subscores: { resp, coag, liver, cardio, cns, renal } };
}

const def = {
  id: "sofa",
  label: "SOFA (total)",
  inputs: [
    { id: "pao2_fio2", label: "PaO2/FiO2", type: "number", min: 0 },
    { id: "platelets_10e9_l", label: "Platelets (×10⁹/L)", type: "number", min: 0 },
    { id: "bilirubin_mg_dl", label: "Bilirubin (mg/dL)", type: "number", min: 0 },
    { id: "map_mm_hg", label: "MAP (mmHg)", type: "number", min: 0 },
    { id: "vasopressors", label: "Vasopressors", type: "select", options: [
      {label:"None", value:"none"},
      {label:"Dopamine ≤5 µg/kg/min", value:"dopamine_le_5"},
      {label:"Dopamine 5–15 µg/kg/min", value:"dopamine_5_15"},
      {label:"Dopamine >15 µg/kg/min", value:"dopamine_gt_15"},
      {label:"Epinephrine (any)", value:"epi_any"},
      {label:"Norepinephrine (any)", value:"norepi_any"}
    ]},
    { id: "gcs", label: "GCS", type: "number", min: 3, max: 15, step: 1 },
    { id: "creatinine_mg_dl", label: "Creatinine (mg/dL)", type: "number", min: 0 },
    { id: "urine_ml_day", label: "Urine output (mL/day)", type: "number", min: 0 }
  ],
  run: (args: SOFAInputs) => {
    const r = calc_sofa(args);
    const notes = [
      `Resp ${r.subscores.resp}`,
      `Coag ${r.subscores.coag}`,
      `Liver ${r.subscores.liver}`,
      `Cardio ${r.subscores.cardio}`,
      `CNS ${r.subscores.cns}`,
      `Renal ${r.subscores.renal}`
    ];
    return { id: "sofa", label: "SOFA", value: r.total, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
