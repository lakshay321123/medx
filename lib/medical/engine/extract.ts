export type Context = Record<string, any>;

export function extractAll(s: string): Context {
  const t = (s || "").toLowerCase();
  const pickNum = (rx: RegExp) => {
    const m = t.match(rx);
    return m ? Number(m[1]) : undefined;
  };

  const ctx: Context = {};
  ctx.Na = ctx.Na ?? pickNum(/\bna[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.K = ctx.K ?? pickNum(/\bk[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.Cl = ctx.Cl ?? pickNum(/\bcl[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.HCO3 = ctx.HCO3 ?? pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.Mg = ctx.Mg ?? pickNum(/\bmg[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.Ca = ctx.Ca ?? pickNum(/\bca[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.BUN = ctx.BUN ?? pickNum(/\bbun[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.creatinine = ctx.creatinine ?? pickNum(/\bcreatinine[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.albumin = ctx.albumin ?? pickNum(/\balbumin[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.pCO2 = ctx.pCO2 ?? pickNum(/\b(pco2|pco₂)[^0-9]*[:=]?\s*([0-9.]+)/);
  ctx.glucose_mgdl = ctx.glucose_mgdl ?? pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mg\/?dl/);
  ctx.glucose_mmol = ctx.glucose_mmol ?? pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mmol/);

  ctx.QTms = ctx.QTms ?? pickNum(/\bqt[^0-9]*[:=]?\s*([0-9]{3,4})\s*ms/);
  ctx.HR = ctx.HR ?? pickNum(/\b(heart\s*rate|hr)[^0-9]*[:=]?\s*([0-9]{2,3})/);

  ctx.age = ctx.age ?? pickNum(/\bage[^0-9]*[:=]?\s*([0-9]{1,3})/);
  ctx.sbp = ctx.sbp ?? pickNum(/\bsbp[^0-9]*[:=]?\s*([0-9]{2,3})/);
  ctx.dbp = ctx.dbp ?? pickNum(/\bdbp[^0-9]*[:=]?\s*([0-9]{2,3})/);
  ctx.rr = ctx.rr ?? pickNum(/\brr[^0-9]*[:=]?\s*([0-9]{1,3})/);
  ctx.tempC = ctx.tempC ?? pickNum(/\btemp[^0-9]*[:=]?\s*([0-9]{2}(?:\.[0-9]+)?)\s*°?c/);
  ctx.spo2 = ctx.spo2 ?? pickNum(/\bspo2[^0-9]*[:=]?\s*([0-9]{2,3})/);
  ctx.fio2 = ctx.fio2 ?? pickNum(/\bfio2[^0-9]*[:=]?\s*([0-9]{1,3})/);

  const has = (w: RegExp) => w.test(t);
  ctx.hx_af = ctx.hx_af ?? has(/\batrial\s*fibrillation\b|\bafib\b|\baf\b/);
  ctx.hx_htn = ctx.hx_htn ?? has(/\bhypertension\b|\bhtn\b/);
  ctx.hx_dm = ctx.hx_dm ?? has(/\bdiabetes\b|\bdm\b/);
  ctx.hx_stroke_tia = ctx.hx_stroke_tia ?? has(/\bstroke\b|\btia\b/);
  ctx.hx_vascular = ctx.hx_vascular ?? has(/\bmi\b|\bischemic\b|\bpad\b|\bvascular\b/);
  ctx.hx_bleed = ctx.hx_bleed ?? has(/\bbleed\b|\bhemorrhage\b/);
  ctx.renal_impair = ctx.renal_impair ?? has(/\bckd\b|\brenal\b/);
  ctx.liver_impair = ctx.liver_impair ?? has(/\bcirrhosis\b|\bliver\b/);
  ctx.alcohol = ctx.alcohol ?? has(/\balcohol\b|\betoh\b/);
  ctx.nsaid = ctx.nsaid ?? has(/\bnsaid\b/);

  if (ctx.sex == null) {
    if (/\bmale\b|\bman\b/.test(t)) ctx.sex = "male";
    else if (/\bfemale\b|\bwoman\b/.test(t)) ctx.sex = "female";
  }

  return ctx;
}
