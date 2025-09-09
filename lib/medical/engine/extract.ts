import { FORMULAE } from "./registry";
import "./calculators";
import { safeNumber, toMgDlFromMmolGlucose } from "./units";

const num = /([0-9]+(?:\.[0-9]+)?)/;

// === [MEDX_CALC_HELPERS_START] ===
function pickNum(rx: RegExp, s: string): number | undefined {
  const m = s.match(rx);
  if (!m) return undefined;
  const raw = String(m[1] ?? m[0]).replace(/[^\d.+-]/g, "");
  const v = Number(raw);
  return Number.isFinite(v) ? v : undefined;
}
// === [MEDX_CALC_HELPERS_END] ===

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

  // === [MEDX_CALC_INPUTS_START] ===
  if (out.Na == null)       out.Na       = pickNum(/\bna[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.K == null)        out.K        = pickNum(/\bk[^a-z0-9]*[:=]?\s*([0-9.]+)/);
  if (out.Cl == null)       out.Cl       = pickNum(/\bcl[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.HCO3 == null)     out.HCO3     = pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.albumin == null)  out.albumin  = pickNum(/\balb(?:umin)?[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.Ca == null)       out.Ca       = pickNum(/\bca[^0-9]*[:=]?\s*([0-9.]+)/);

  if (out.creatinine == null) out.creatinine = pickNum(/\bcreat(?:inine)?[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.BUN == null)        out.BUN        = pickNum(/\bbun[^0-9]*[:=]?\s*([0-9.]+)/);

  if (out.bilirubin == null) out.bilirubin = pickNum(/\bbili(?:rubin)?[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.INR == null)       out.INR       = pickNum(/\binr[^0-9]*[:=]?\s*([0-9.]+)/);

  if (out.glucose_mgdl == null) out.glucose_mgdl = pickNum(/\b(glu|glucose)[^0-9]*[:=]?\s*([0-9.]+)/);

  if (out.PaO2 == null)  out.PaO2  = pickNum(/\bpao2[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.PaCO2 == null) out.PaCO2 = pickNum(/\bpaco2[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.FiO2 == null)  out.FiO2  = pickNum(/\bfio2[^0-9]*[:=]?\s*([0-9.]+)/);

  if (out.QT == null) out.QT = pickNum(/\bqt[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.RR == null) out.RR = pickNum(/\brr[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.HR == null) out.HR = pickNum(/\bhr[^0-9]*[:=]?\s*([0-9.]+)/);

  if (out.SBP == null) out.SBP = pickNum(/\b(sbp|sys)t?[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.DBP == null) out.DBP = pickNum(/\b(dbp|dia)t?[^0-9]*[:=]?\s*([0-9.]+)/);
  if (out.RRr == null) out.RRr = pickNum(/\bresp[^0-9]*[:=]?\s*([0-9.]+)/);

  if (out.ethanol_mgdl == null) out.ethanol_mgdl = pickNum(/\b(etoh|ethanol)[^0-9]*[:=]?\s*([0-9.]+)/);

  // Repo compatibility: if you have measured_osm, mirror it to osm_meas expected by calcs
  if (out.osm_meas == null && (out.measured_osm != null)) out.osm_meas = out.measured_osm;
  // === [MEDX_CALC_INPUTS_END] ===

  return out;
}
