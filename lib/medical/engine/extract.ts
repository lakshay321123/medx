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

  const out: Record<string, any> = {
    Na: pickNum(/\bna[^0-9]*[:=]?\s*([0-9.]+)/, t),
    K: pickNum(/\bk[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/, t),
    Cl: pickNum(/\bcl[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/, t),
    HCO3: pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/, t),
    Mg: pickNum(/\bmg[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/, t),
    Ca: pickNum(/\bca[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/, t),
    glucose_mgdl: pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mg\/?dl/, t),
    glucose_mmol: pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mmol/, t),
    BUN: pickNum(/\bbun[^0-9]*[:=]?\s*([0-9.]+)/, t),
    creatinine: pickNum(/\bcreatinine[^0-9]*[:=]?\s*([0-9.]+)/, t),
    albumin: pickNum(/\balbumin[^0-9]*[:=]?\s*([0-9.]+)/, t),
    bilirubin: pickNum(/\bbili[^0-9]*[:=]?\s*([0-9.]+)/, t),
    INR: pickNum(/\binr[^0-9]*[:=]?\s*([0-9.]+)/, t),
    ethanol_mgdl: pickNum(/\b(etoh|ethanol)[^0-9]*[:=]?\s*([0-9.]+)/, t),
    measured_osm: pickNum(/\bmeasured\s*osmolality[^0-9]*[:=]?\s*([0-9.]+)/, t),
    pH: pickNum(/\bpH[^0-9]*[:=]?\s*([0-9.]+)/i, t),
    PaO2: pickNum(/\bpa?o2[^0-9]*[:=]?\s*([0-9.]+)/, t),
    FiO2: pickNum(/\bfio2[^0-9]*[:=]?\s*([0-9.]+)/, t),
    PaCO2: pickNum(/\bpaco2[^0-9]*[:=]?\s*([0-9.]+)/, t),
    SBP: pickNum(/\bsbp[^0-9]*[:=]?\s*([0-9.]+)/, t),
    DBP: pickNum(/\bdbp[^0-9]*[:=]?\s*([0-9.]+)/, t),
    RR: pickNum(/\brr[^0-9]*[:=]?\s*([0-9.]+)/, t),
    HR: pickNum(/\b(heart\s*rate|hr)[^0-9]*[:=]?\s*([0-9.]+)/, t),
    QTms: pickNum(/\bqt[^0-9]*[:=]?\s*([0-9]{3,4})\s*ms/, t),
    GCS: pickNum(/\bgcs[^0-9]*[:=]?\s*([0-9]{1,2})/, t),
    age: pickNum(/\bage[^0-9]*[:=]?\s*([0-9]{1,3})/, t),
    weight_kg: pickNum(/\bweight[^0-9]*[:=]?\s*([0-9.]+)\s*kg/, t),
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
  if (out.Na == null)       out.Na       = pickNum(/\bna[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.K == null)        out.K        = pickNum(/\bk[^a-z0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.Cl == null)       out.Cl       = pickNum(/\bcl[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.HCO3 == null)     out.HCO3     = pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.albumin == null)  out.albumin  = pickNum(/\balb(?:umin)?[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.Ca == null)       out.Ca       = pickNum(/\bca[^0-9]*[:=]?\s*([0-9.]+)/, t);

  if (out.creatinine == null) out.creatinine = pickNum(/\bcreat(?:inine)?[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.BUN == null)        out.BUN        = pickNum(/\bbun[^0-9]*[:=]?\s*([0-9.]+)/, t);

  if (out.bilirubin == null) out.bilirubin = pickNum(/\bbili(?:rubin)?[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.INR == null)       out.INR       = pickNum(/\binr[^0-9]*[:=]?\s*([0-9.]+)/, t);

  if (out.glucose_mgdl == null) out.glucose_mgdl = pickNum(/\b(glu|glucose)[^0-9]*[:=]?\s*([0-9.]+)/, t);

  if (out.PaO2 == null)  out.PaO2  = pickNum(/\bpao2[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.PaCO2 == null) out.PaCO2 = pickNum(/\bpaco2[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.FiO2 == null)  out.FiO2  = pickNum(/\bfio2[^0-9]*[:=]?\s*([0-9.]+)/, t);

  if (out.QT == null) out.QT = pickNum(/\bqt[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.RR == null) out.RR = pickNum(/\brr[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.HR == null) out.HR = pickNum(/\bhr[^0-9]*[:=]?\s*([0-9.]+)/, t);

  if (out.SBP == null) out.SBP = pickNum(/\b(sbp|sys)t?[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.DBP == null) out.DBP = pickNum(/\b(dbp|dia)t?[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.RRr == null) out.RRr = pickNum(/\bresp[^0-9]*[:=]?\s*([0-9.]+)/, t);

  if (out.ethanol_mgdl == null) out.ethanol_mgdl = pickNum(/\b(etoh|ethanol)[^0-9]*[:=]?\s*([0-9.]+)/, t);

  // Repo compatibility: if you have measured_osm, mirror it to osm_meas expected by calcs
  if (out.osm_meas == null && (out.measured_osm != null)) out.osm_meas = out.measured_osm;
  // === [MEDX_CALC_INPUTS_END] ===

  // === [MEDX_CALC_URINE_START] ===
  if (out.urine_na == null)   out.urine_na   = pickNum(/\burine\s*na[^0-9]*[:=]?\s*([0-9.]+)/, s);
  if (out.urine_cr == null)   out.urine_cr   = pickNum(/\burine\s*creat(?:inine)?[^0-9]*[:=]?\s*([0-9.]+)/, s);
  if (out.urine_urea == null) out.urine_urea = pickNum(/\burine\s*urea[^0-9]*[:=]?\s*([0-9.]+)/, s);
  // === [MEDX_CALC_URINE_END] ===

  return out;
}
