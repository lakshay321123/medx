import { FORMULAE } from "./registry";
import "./calculators";
import { safeNumber, toMgDlFromMmolGlucose } from "./units";

const num = /([0-9]+(?:\.[0-9]+)?)/;

export function extractAll(s: string): Record<string, any> {
  const t = (s || "").toLowerCase();
  const pickNum = (rx: RegExp) => {
    const m = t.match(rx);
    return m ? Number(m[1]) : undefined;
  };

  const out: Record<string, any> = {
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
    bilirubin: pickNum(/\bbili[^0-9]*[:=]?\s*([0-9.]+)/),
    INR: pickNum(/\binr[^0-9]*[:=]?\s*([0-9.]+)/),
    ethanol_mgdl: pickNum(/\b(etoh|ethanol)[^0-9]*[:=]?\s*([0-9.]+)/),
    measured_osm: pickNum(/\bmeasured\s*osmolality[^0-9]*[:=]?\s*([0-9.]+)/),
    pH: pickNum(/\bpH[^0-9]*[:=]?\s*([0-9.]+)/i),
    PaO2: pickNum(/\bpa?o2[^0-9]*[:=]?\s*([0-9.]+)/),
    FiO2: pickNum(/\bfio2[^0-9]*[:=]?\s*([0-9.]+)/),
    PaCO2: pickNum(/\bpaco2[^0-9]*[:=]?\s*([0-9.]+)/),
    SBP: pickNum(/\bsbp[^0-9]*[:=]?\s*([0-9.]+)/),
    DBP: pickNum(/\bdbp[^0-9]*[:=]?\s*([0-9.]+)/),
    RR: pickNum(/\brr[^0-9]*[:=]?\s*([0-9.]+)/),
    HR: pickNum(/\b(heart\s*rate|hr)[^0-9]*[:=]?\s*([0-9.]+)/),
    QTms: pickNum(/\bqt[^0-9]*[:=]?\s*([0-9]{3,4})\s*ms/),
    GCS: pickNum(/\bgcs[^0-9]*[:=]?\s*([0-9]{1,2})/),
    age: pickNum(/\bage[^0-9]*[:=]?\s*([0-9]{1,3})/),
    weight_kg: pickNum(/\bweight[^0-9]*[:=]?\s*([0-9.]+)\s*kg/),
  };

  const has = (w: RegExp) => w.test(t);
  out.hx_chf = has(/\bchf\b|\bheart\s*failure/);
  out.hx_htn = has(/\bhypertension\b|\bhtn\b/);
  out.hx_dm = has(/\bdiabetes\b|\bdm\b/);
  out.hx_stroke_tia = has(/\bstroke\b|\btia\b/);
  out.hx_vascular = has(/\bmi\b|\bischemic\b|\bpad\b|\bvascular\b/);
  out.hx_bleed = has(/\bbleed\b|\bhemorrhage\b/);
  out.renal_impair = has(/\bckd\b|\brenal\b/);
  out.liver_impair = has(/\bcirrhosis\b|\bliver\b/);
  out.alcohol = has(/\balcohol\b|\betoh\b/);
  out.nsaid = has(/\bnsaid\b/);

  if (/\bmale\b|\bman\b/.test(t)) out.sex = "male";
  else if (/\bfemale\b|\bwoman\b/.test(t)) out.sex = "female";

  if (/\bascites\b/.test(t)) {
    out.ascites = /moderate|severe/.test(t) ? "moderate" : /mild/.test(t) ? "mild" : "present";
  }
  if (/\bencephalopathy\b/.test(t)) {
    out.encephalopathy = /grade\s*2|moderate/.test(t) ? "moderate" : /grade\s*1|mild/.test(t) ? "mild" : "present";
  }

  // normalize glucose mmol -> mg/dL
  if (out.glucose_mgdl == null && out.glucose_mmol != null) {
    out.glucose_mgdl = toMgDlFromMmolGlucose(out.glucose_mmol);
  }

  return out;
}
