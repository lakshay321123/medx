// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type GBSInputs = {
  bun_mg_dl: number;
  hb_g_dl: number;
  sex: "male" | "female";
  sbp: number;
  pulse: number;
  melena?: boolean;
  syncope?: boolean;
  hepatic_disease?: boolean;
  cardiac_failure?: boolean;
};

function bun_mmol(bun_mg_dl: number): number {
  return bun_mg_dl * 0.357;
}

export function calc_glasgow_blatchford(i: GBSInputs): number {
  let s = 0;
  const bun = bun_mmol(i.bun_mg_dl);
  if (bun >= 6.5 && bun < 8) s += 2;
  else if (bun >= 8 && bun < 10) s += 3;
  else if (bun >= 10 && bun < 25) s += 4;
  else if (bun >= 25) s += 6;

  if (i.sbp >= 100 && i.sbp < 109) s += 1;
  else if (i.sbp >= 90 && i.sbp < 100) s += 2;
  else if (i.sbp < 90) s += 3;

  if (i.pulse >= 100) s += 1;

  if (i.sex === "male") {
    if (i.hb_g_dl >= 12 && i.hb_g_dl < 13) s += 1;
    else if (i.hb_g_dl >= 10 && i.hb_g_dl < 12) s += 3;
    else if (i.hb_g_dl < 10) s += 6;
  } else {
    if (i.hb_g_dl >= 10 && i.hb_g_dl < 12) s += 1;
    else if (i.hb_g_dl < 10) s += 6;
  }

  if (i.melena) s += 1;
  if (i.syncope) s += 2;
  if (i.hepatic_disease) s += 2;
  if (i.cardiac_failure) s += 2;

  return s;
}

const def = {
  id: "glasgow_blatchford",
  label: "Glasgow-Blatchford (UGIB)",
  inputs: [
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "hb_g_dl", label: "Hemoglobin (g/dL)", type: "number", min: 0 },
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}]},
    { id: "sbp", label: "SBP (mmHg)", type: "number", min: 0 },
    { id: "pulse", label: "Pulse (bpm)", type: "number", min: 0 },
    { id: "melena", label: "Melena", type: "boolean" },
    { id: "syncope", label: "Syncope", type: "boolean" },
    { id: "hepatic_disease", label: "Hepatic disease", type: "boolean" },
    { id: "cardiac_failure", label: "Cardiac failure", type: "boolean" }
  ],
  run: (args: GBSInputs) => {
    const v = calc_glasgow_blatchford(args);
    return { id: "glasgow_blatchford", label: "Glasgow-Blatchford (UGIB)", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
