import type { Labs } from "./calculators";

const num = /([0-9]+(?:\.[0-9]+)?)/;

export function extractAll(s: string): Labs {
  const t = (s || "").toLowerCase();
  const pickNum = (rx: RegExp) => {
    const m = t.match(rx);
    return m ? Number(m[1]) : undefined;
  };

  const labs: Labs = {
    Na: pickNum(/\bna[^0-9]*[:=]?\s*([0-9.]+)/),
    K: pickNum(/\bk[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/),
    Cl: pickNum(/\bcl[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/),
    HCO3: pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/),
    Mg: pickNum(/\bmg[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/),
    Ca: pickNum(/\bca[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/),
    glucose_mgdl: pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mg\/?dl/),
    glucose_mmol: pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mmol/),
    BUN: pickNum(/\bbun[^0-9]*[:=]?\s*([0-9.]+)/),
    creatinine: pickNum(/\bcreatinine[^0-9]*[:=]?\s*([0-9.]+)/),
    albumin: pickNum(/\balbumin[^0-9]*[:=]?\s*([0-9.]+)/),

    QTms: pickNum(/\bqt[^0-9]*[:=]?\s*([0-9]{3,4})\s*ms/),
    HR: pickNum(/\b(heart\s*rate|hr)[^0-9]*[:=]?\s*([0-9]{2,3})/),

    age: pickNum(/\bage[^0-9]*[:=]?\s*([0-9]{1,3})/),
    sbp: pickNum(/\bsbp[^0-9]*[:=]?\s*([0-9]{2,3})/),
    dbp: pickNum(/\bdbp[^0-9]*[:=]?\s*([0-9]{2,3})/),
    rr: pickNum(/\brr[^0-9]*[:=]?\s*([0-9]{1,3})/),
    tempC: pickNum(/\btemp[^0-9]*[:=]?\s*([0-9]{2}(?:\.[0-9]+)?)\s*°?c/),
    spo2: pickNum(/\bspo2[^0-9]*[:=]?\s*([0-9]{2,3})/),
    fio2: pickNum(/\bfio2[^0-9]*[:=]?\s*([0-9]{1,3})/),
  };

  // flags (very light detection; extend later)
  const has = (w: RegExp) => w.test(t);
  labs.hx_af = has(/\batrial\s*fibrillation\b|\bafib\b|\baf\b/);
  labs.hx_htn = has(/\bhypertension\b|\bhtn\b/);
  labs.hx_dm = has(/\bdiabetes\b|\bdm\b/);
  labs.hx_stroke_tia = has(/\bstroke\b|\btia\b/);
  labs.hx_vascular = has(/\bmi\b|\bischemic\b|\bpad\b|\bvascular\b/);
  labs.hx_bleed = has(/\bbleed\b|\bhemorrhage\b/);
  labs.renal_impair = has(/\bckd\b|\brenal\b/);
  labs.liver_impair = has(/\bcirrhosis\b|\bliver\b/);
  labs.alcohol = has(/\balcohol\b|\betoh\b/);
  labs.nsaid = has(/\bnsaid\b/);

  // sex
  if (/\bmale\b|\bman\b/.test(t)) labs.sex = "male";
  else if (/\bfemale\b|\bwoman\b/.test(t)) labs.sex = "female";

  return labs;
}
