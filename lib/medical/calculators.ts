export type Labs = {
  // core labs
  Na?: number; K?: number; Cl?: number; HCO3?: number;
  glucose_mgdl?: number; glucose_mmol?: number;
  Mg?: number; Ca?: number; BUN?: number; creatinine?: number; albumin?: number;
  // ECG
  QTms?: number; HR?: number;
  // vitals
  age?: number; sex?: "male" | "female";
  sbp?: number; dbp?: number; rr?: number; tempC?: number; spo2?: number; fio2?: number;
  // history flags for scores
  hx_af?: boolean; hx_htn?: boolean; hx_dm?: boolean; hx_stroke_tia?: boolean; hx_vascular?: boolean;
  hx_bleed?: boolean; labile_inr?: boolean; alcohol?: boolean; nsaid?: boolean;
  chf?: boolean; renal_impair?: boolean; liver_impair?: boolean;
};

// ---------- Helpers ----------
export const mgdlFromMmol = (mmol?: number) => (mmol != null ? mmol * 18 : undefined);
export const rrSeconds = (hr: number) => 60 / hr;

// ---------- Electrolytes / Acid-Base ----------
export function anionGap(l: Labs) {
  if (l.Na == null || l.Cl == null || l.HCO3 == null) return undefined;
  const k = l.K ?? 0;
  return (l.Na + k) - (l.Cl + l.HCO3);
}
export function correctedSodium(l: Labs, factor: 1.6 | 2.4 = 1.6) {
  const glu = l.glucose_mgdl ?? mgdlFromMmol(l.glucose_mmol);
  if (l.Na == null || glu == null) return undefined;
  return l.Na + factor * ((glu - 100) / 100);
}
export function effectiveOsmolality(l: Labs) {
  if (l.Na == null) return undefined;
  const glu = l.glucose_mgdl ?? mgdlFromMmol(l.glucose_mmol) ?? 0;
  const bun = l.BUN ?? 0;
  return 2 * l.Na + glu / 18 + bun / 2.8;
}
export function needsKBeforeInsulin(l: Labs): boolean;
export function needsKBeforeInsulin(K: number): boolean;
export function needsKBeforeInsulin(arg: Labs | number): boolean {
  if (typeof arg === "number") return arg < 3.3;
  return arg.K != null && arg.K < 3.3;
}

// ---------- ECG ----------
export function qtcFridericia(l: Labs) {
  if (l.QTms == null || l.HR == null) return undefined;
  const rr = rrSeconds(l.HR);
  return l.QTms / Math.cbrt(rr);
}
export function qtcBazett(l: Labs) {
  if (l.QTms == null || l.HR == null) return undefined;
  const rr = rrSeconds(l.HR);
  return l.QTms / Math.sqrt(rr);
}
export function qtcElectrolyteAdjusted(fridMs?: number, k?: number, mg?: number) {
  if (fridMs == null) return undefined;
  let add = 0;
  if (k != null && k < 3.5) add += 10;
  if (mg != null && mg < 1.7) add += 5;
  return fridMs + add;
}

// ---------- Renal / Liver ----------
export function egfrCkdEpi(l: Labs) {
  // Minimal CKD-EPI (creatinine-only) rougher variant; extend with race when/if needed.
  if (l.creatinine == null || l.age == null || !l.sex) return undefined;
  const Scr = l.creatinine;
  const k = l.sex === "female" ? 0.7 : 0.9;
  const a = l.sex === "female" ? -0.241 : -0.302;
  const min = Math.min(Scr / k, 1);
  const max = Math.max(Scr / k, 1);
  const sexCoef = l.sex === "female" ? 1.012 : 1;
  return 142 * Math.pow(min, a) * Math.pow(max, -1.200) * Math.pow(0.9938, l.age) * sexCoef;
}
export function meld(l: Labs) {
  // MELD: 3.78*ln(bili) + 11.2*ln(INR) + 9.57*ln(creat) + 6.43; MELD-Na optional
  // Placeholders unless INR/bilirubin provided in future; keep function for future extension.
  return undefined;
}

// ---------- Risk Scores ----------
export function chads2vasc(l: Labs) {
  // Needs AF status + flags; compute if available.
  if (!l.hx_af) return undefined;
  let score = 0;
  if (l.chf) score += 1;
  if (l.hx_htn) score += 1;
  if (l.age != null && l.age >= 75) score += 2;
  else if (l.age != null && l.age >= 65) score += 1;
  if (l.hx_dm) score += 1;
  if (l.hx_stroke_tia) score += 2;
  if (l.hx_vascular) score += 1;
  // sex category
  if (l.sex === "female") score += 1;
  return score;
}
export function hasBled(l: Labs) {
  // Minimal subset: HTN, renal/liver impairment, stroke, bleeding, labile INR, elderly (>65), drugs/alcohol
  let s = 0;
  if (l.hx_htn) s += 1;
  if (l.renal_impair) s += 1;
  if (l.liver_impair) s += 1;
  if (l.hx_stroke_tia) s += 1;
  if (l.hx_bleed) s += 1;
  if (l.age != null && l.age > 65) s += 1;
  if (l.labile_inr) s += 1;
  if (l.nsaid) s += 1;
  if (l.alcohol) s += 1;
  return s;
}

// ---------- Aggregator ----------
export function computeAll(l: Labs): string[] {
  const out: string[] = [];

  const ag = anionGap(l);
  if (ag != null) out.push(`Anion gap: ${ag.toFixed(1)} mmol/L`);

  const cNa16 = correctedSodium(l, 1.6);
  if (cNa16 != null) out.push(`Corrected Na (1.6): ${cNa16.toFixed(1)} mmol/L`);
  const effOsm = effectiveOsmolality(l);
  if (effOsm != null) out.push(`Effective osmolality: ${effOsm.toFixed(0)} mOsm/kg`);

  if (needsKBeforeInsulin(l)) out.push(`⚠️ K ${l.K} < 3.3 → replete K before insulin`);

  const frid = qtcFridericia(l);
  if (frid != null) out.push(`QTc (Fridericia): ${frid.toFixed(0)} ms`);
  const baz = qtcBazett(l);
  if (baz != null) out.push(`QTc (Bazett): ${baz.toFixed(0)} ms`);
  const adj = qtcElectrolyteAdjusted(frid, l.K, l.Mg);
  if (adj != null && frid != null && Math.round(adj) !== Math.round(frid))
    out.push(`QTc (Fridericia, adjusted for K/Mg): ${adj.toFixed(0)} ms`);

  const egfr = egfrCkdEpi(l);
  if (egfr != null) out.push(`eGFR (CKD-EPI): ${egfr.toFixed(0)} mL/min/1.73m²`);

  const chads = chads2vasc(l);
  if (chads != null) out.push(`CHA₂DS₂-VASc: ${chads}`);
  const hbled = hasBled(l);
  if (hbled != null) out.push(`HAS-BLED: ${hbled}`);

  return out;
}

// --- Backward compatibility helpers ---
export function computeAnionGap(vals: { Na: number; K?: number; Cl: number; HCO3: number }) {
  return anionGap(vals) as number;
}
export function correctSodiumForGlucose(Na: number, glucoseMgDl: number, factor: 1.6 | 2.4 = 1.6) {
  return correctedSodium({ Na, glucose_mgdl: glucoseMgDl }, factor) as number;
}
export function needsKBeforeInsulinLegacy(K: number) {
  return needsKBeforeInsulin(K);
}
