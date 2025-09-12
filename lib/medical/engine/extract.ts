import "./calculators";

// Canonical keys we use everywhere
const ALIAS: Record<string, string> = {
  sodium: "Na", na_mmol_l: "Na", measured_na_mmol_l: "Na",
  potassium: "K", k_mmol_l: "K",
  chloride: "Cl", cl_mmol_l: "Cl",
  bicarbonate: "HCO3", hco3_mmol_l: "HCO3", tco2: "HCO3",
  albumin_g_dl: "albumin",

  glucose: "glucose_mgdl", glucose_mg_dl: "glucose_mgdl", glucose_mmol_l: "glucose_mmol",
  bun_mg_dl: "BUN", urea: "BUN",
  creatinine: "Cr", creatinine_mg_dl: "Cr",

  measured_osm: "Osm_measured", osm_meas: "Osm_measured",

  // Supplemental oxygen (for NEWS2)
  on_o2: "on_o2",
  supplemental_o2: "on_o2",
  o2_lpm: "on_o2",
  oxygen: "on_o2",
  O2: "on_o2",
  onOxygen: "on_o2",
  // Legacy/alternate vital keys
  RRr: "RR",
  SaO2: "spo2_percent",
  conscious_level: "consciousness",
  ACVPU: "consciousness",
  Temp_C: "temp_c",

  lactate_mmol_l: "Lactate",

  sbp: "SBP", dbp: "DBP", hr: "HR", rr: "RR",
  // SpO₂ canonicalization
  spo2: "spo2_percent", spO2: "spo2_percent", SpO2: "spo2_percent", spo2_percent: "spo2_percent",
  temp_c: "temp_c", temp_f: "temp_f",
  gcs: "GCS", consciousness: "consciousness",
  pco2_mmHg: "pCO2", paCO2: "pCO2"
};

function mapAliases(input: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    out[ALIAS[k] ?? k] = v;
  }
  return out;
}

function convertUnits(incoming: Record<string, any>) {
  const out = { ...incoming };
  // Glucose mmol/L -> mg/dL
  if (out.glucose_mmol != null && out.glucose_mgdl == null) {
    out.glucose_mgdl = out.glucose_mmol * 18;
  }
  // Temperature F -> C
  if (out.temp_f != null && out.temp_c == null) {
    out.temp_c = (out.temp_f - 32) * (5 / 9);
  }
  // pCO2 kPa -> mmHg (if someone passes it)
  if (out.pCO2_kpa != null && out.pCO2 == null) {
    out.pCO2 = out.pCO2_kpa * 7.50062;
  }

  // Normalize supplemental oxygen flag expected by NEWS2.
  // Accept booleans, truthy numerics (e.g., L/min), "yes"/"true" strings.
  if (out.on_o2 != null) {
    const v = out.on_o2;
    out.on_o2 =
      v === true ||
      v === 1 ||
      (typeof v === "number" && v > 0) ||
      (typeof v === "string" && /^(yes|true|y|on)$/i.test(v));
  } else if (out.FiO2 != null && typeof out.FiO2 === "number") {
    // If FiO2 is provided, treat >21% as supplemental oxygen.
    out.on_o2 = out.FiO2 > 1 ? out.FiO2 / 100 > 0.21 : out.FiO2 > 0.21;
  }

  return out;
}

function mirrorLegacyKeys(out: Record<string, any>) {
  // Keep SpO2 / spo2 for calculators that still require them
  if (out.spo2_percent != null) {
    if (out.SpO2 == null) out.SpO2 = out.spo2_percent;
    if (out.spo2 == null) out.spo2 = out.spo2_percent;
  }
  // (add more mirrors here if needed)
  return out;
}

// Call this once in your API/controller before computeAll()
export function canonicalizeInputs(raw: Record<string, any>) {
  const mapped = mapAliases(raw);
  const unitFixed = convertUnits(mapped);
  return mirrorLegacyKeys(unitFixed);
}

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
    Na: pickNum(/\b(?:na|sodium)\b[^0-9:=]*[:=]?\s*([0-9.]+)/i, t),
    K: pickNum(/\b(?:k|potassium)\b[^0-9:=]*[:=]?\s*([0-9.]+)/i, t),
    Cl: pickNum(/\b(?:chloride|cl)\b[^0-9:=]*[:=]?\s*([0-9.]+)/i, t),
    HCO3: pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/, t),
    Mg: pickNum(/\bmg[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/, t),
    Ca: pickNum(/\b(?:calcium|ca)\b[^0-9:=]*[:=]?\s*([0-9.]+)/i, t),
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

  // === [MEDX_CALC_INPUTS_START] ===
  if (out.Na == null)       out.Na       = pickNum(/\b(?:na|sodium)\b[^0-9:=]*[:=]?\s*([0-9.]+)/i, t);
  if (out.K == null)        out.K        = pickNum(/\b(?:k|potassium)\b[^0-9:=]*[:=]?\s*([0-9.]+)/i, t);
  if (out.Cl == null)       out.Cl       = pickNum(/\b(?:chloride|cl)\b[^0-9:=]*[:=]?\s*([0-9.]+)/i, t);
  if (out.HCO3 == null)     out.HCO3     = pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.albumin == null)  out.albumin  = pickNum(/\balb(?:umin)?[^0-9]*[:=]?\s*([0-9.]+)/, t);
  if (out.Ca == null)       out.Ca       = pickNum(/\b(?:calcium|ca)\b[^0-9:=]*[:=]?\s*([0-9.]+)/i, t);

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
  // === [MEDX_CALC_INPUTS_END] ===

  // === [MEDX_CALC_URINE_START] ===
  if (out.urine_na == null)   out.urine_na   = pickNum(/\burine\s*na[^0-9]*[:=]?\s*([0-9.]+)/, s);
  if (out.urine_cr == null)   out.urine_cr   = pickNum(/\burine\s*creat(?:inine)?[^0-9]*[:=]?\s*([0-9.]+)/, s);
  if (out.urine_urea == null) out.urine_urea = pickNum(/\burine\s*urea[^0-9]*[:=]?\s*([0-9.]+)/, s);
  // === [MEDX_CALC_URINE_END] ===
  // === [MEDX_CALC_EXTRA_INPUTS_START] ===
  if (out.pH == null) out.pH = pickNum(/\bpH[^0-9]*[:=]?\s*([0-9.]+)/i, s);
  if (out.lactate == null) out.lactate = pickNum(/\blactate[^0-9]*[:=]?\s*([0-9.]+)/i, s);
  if (out.beta_hydroxybutyrate == null) out.beta_hydroxybutyrate = pickNum(/\b(beta[-\s]?hydroxybutyrate|b[-\s]?ohb)[^0-9]*[:=]?\s*([0-9.]+)/i, s);
  if (out.serum_ketones == null) out.serum_ketones = pickNum(/\bserum\s*ketones?[^0-9]*[:=]?\s*([0-9.]+)/i, s);
  if (out.urine_ketones == null) out.urine_ketones = pickNum(/\burine\s*ketones?[^0-9]*[:=]?\s*([0-9.]+)/i, s);
  if (out.Hb == null) out.Hb = pickNum(/\b(hb|hemoglobin)[^0-9]*[:=]?\s*([0-9.]+)/i, s);
  if (out.platelets == null) out.platelets = pickNum(/\b(plt|platelets?)\b[^0-9]*[:=]?\s*([0-9.]+)/i, s);
  // === [MEDX_CALC_EXTRA_INPUTS_END] ===

  return out;
}
