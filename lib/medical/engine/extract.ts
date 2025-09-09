git checkout -b fix/extractor
git apply -p0 <<'PATCH'
*** START PATCH
diff --git a/lib/medical/engine/extract.ts b/lib/medical/engine/extract.ts
new file mode 100644
--- /dev/null
+++ b/lib/medical/engine/extract.ts
@@ -0,0 +1,128 @@
+// lib/medical/engine/extract.ts
+// Superset extractor: electrolytes, gases, vitals, ECG, toxicology, flags.
+// Safe to use alongside deterministic calculators.
+
+export function extractAll(s: string): Record<string, any> {
+  const t = (s || "").toLowerCase();
+  const pickNum = (rx: RegExp) => {
+    const m = t.match(rx);
+    return m ? Number(m[1]) : undefined;
+  };
+  const has = (rx: RegExp) => rx.test(t);
+
+  const out: Record<string, any> = {
+    // Electrolytes / chemistry
+    Na: pickNum(/\bna[^0-9]*[:=]?\s*([0-9.]+)/),
+    K: pickNum(/\bk[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/),
+    Cl: pickNum(/\bcl[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/),
+    HCO3: pickNum(/\b(hco3|bicarb)[^0-9]*[:=]?\s*([0-9.]+)/),
+    Mg: pickNum(/\bmg[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/),
+    Ca: pickNum(/\bca[^a-z0-9]?[^0-9]*[:=]?\s*([0-9.]+)/),
+    glucose_mgdl: pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mg\/?dl/),
+    glucose_mmol: pickNum(/\b(glucose|fpg)[^0-9]*[:=]?\s*([0-9.]+)\s*mmol/),
+    BUN: pickNum(/\bbun[^0-9]*[:=]?\s*([0-9.]+)/),
+    creatinine: pickNum(/\bcreatinine[^0-9]*[:=]?\s*([0-9.]+)/),
+    albumin: pickNum(/\balbumin[^0-9]*[:=]?\s*([0-9.]+)/),
+    bilirubin: pickNum(/\bbili[^0-9]*[:=]?\s*([0-9.]+)/),
+    INR: pickNum(/\binr[^0-9]*[:=]?\s*([0-9.]+)/),
+
+    // Toxicology
+    ethanol_mgdl: pickNum(/\b(etoh|ethanol)[^0-9]*[:=]?\s*([0-9.]+)/),
+    measured_osm: pickNum(/\b(measured\s+)?(serum\s+)?osmol(?:ality|ality)[^0-9]*[:=]?\s*([0-9.]+)/),
+    pH: pickNum(/\bpH[^0-9]*[:=]?\s*([0-9.]+)/i),
+
+    // Gases / pulmonary
+    PaO2: pickNum(/\bpa?o2[^0-9]*[:=]?\s*([0-9.]+)/),
+    FiO2: pickNum(/\bfio2[^0-9]*[:=]?\s*([0-9.]+)/),
+    PaCO2: pickNum(/\bpaco2[^0-9]*[:=]?\s*([0-9.]+)/),
+    pCO2: pickNum(/\b(pco2|pco₂)[^0-9]*[:=]?\s*([0-9.]+)/),
+
+    // Vitals / ECG
+    SBP: pickNum(/\bsbp[^0-9]*[:=]?\s*([0-9.]+)/),
+    DBP: pickNum(/\bdbp[^0-9]*[:=]?\s*([0-9.]+)/),
+    RR: pickNum(/\brr[^0-9]*[:=]?\s*([0-9.]+)/),
+    HR: pickNum(/\b(heart\s*rate|hr)[^0-9]*[:=]?\s*([0-9.]+)/),
+    QTms: pickNum(/\bqt[^0-9]*[:=]?\s*([0-9]{3,4})\s*ms/),
+    GCS: pickNum(/\bgcs[^0-9]*[:=]?\s*([0-9]{1,2})/),
+
+    // Demographics
+    age: pickNum(/\bage[^0-9]*[:=]?\s*([0-9]{1,3})/),
+    weight_kg: pickNum(/\bweight[^0-9]*[:=]?\s*([0-9.]+)\s*kg/),
+  };
+
+  // Dual-key support for SBP/sbp (for calculators that expect lowercase)
+  out.sbp = out.SBP ?? pickNum(/\bsbp[^0-9]*[:=]?\s*([0-9.]+)/i);
+  if (out.SBP == null && out.sbp != null) out.SBP = out.sbp;
+
+  // Risk & history flags
+  out.hx_af = has(/\batrial\s*fibrillation\b|\bafib\b|\baf\b/);
+  out.hx_chf = has(/\bchf\b|\bheart\s*failure/);
+  out.hx_htn = has(/\bhypertension\b|\bhtn\b/);
+  out.hx_dm = has(/\bdiabetes\b|\bdm\b/);
+  out.hx_stroke_tia = has(/\bstroke\b|\btia\b/);
+  out.hx_vascular = has(/\bmi\b|\bischemic\b|\bpad\b|\bvascular\b/);
+  out.hx_bleed = has(/\bbleed\b|\bhemorrhage\b/);
+  out.renal_impair = has(/\bckd\b|\brenal\b/);
+  out.liver_impair = has(/\bcirrhosis\b|\bliver\b/);
+  out.alcohol = has(/\balcohol\b|\betoh\b/);
+  out.nsaid = has(/\bnsaid\b/);
+
+  // Cardiology (Phase 2 flags; harmless if unused)
+  out.hx_cad = has(/\bprior\s+mi\b|\bcad\b/);
+  out.hx_riskfactors = has(/\brisk\s*factors\b|\bdm\b|\bhtn\b|\bsmoker\b/);
+  out.aspirin_use = has(/\baspirin\b/);
+  out.recent_angina = has(/\bangina\b/);
+  out.st_deviation = has(/\bst\s*(depress|elev)/);
+  out.rales = has(/\brales\b/);
+  out.s3 = has(/\bs3\s*gallop\b/);
+  out.pulmonary_edema = has(/\bpulmonary\s+edema\b/);
+  out.shock = has(/\bshock\b/);
+
+  // Sex
+  if (/\bmale\b|\bman\b/.test(t)) out.sex = "male";
+  else if (/\bfemale\b|\bwoman\b/.test(t)) out.sex = "female";
+
+  // Liver adjuncts (for Child–Pugh)
+  if (/\bascites\b/.test(t)) {
+    out.ascites = /moderate|severe/.test(t) ? "moderate" : /mild/.test(t) ? "mild" : "present";
+  }
+  if (/\bencephalopathy\b/.test(t)) {
+    out.encephalopathy = /grade\s*2|moderate/.test(t) ? "moderate" : /grade\s*1|mild/.test(t) ? "mild" : "present";
+  }
+
+  // Normalizations
+  // glucose mmol/L -> mg/dL
+  if (out.glucose_mgdl == null && out.glucose_mmol != null) {
+    out.glucose_mgdl = out.glucose_mmol * 18;
+  }
+
+  return out;
+}
*** END PATCH
PATCH
