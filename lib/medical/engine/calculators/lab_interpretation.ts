import { register } from "../registry";

/**
 * These calculators do not recompute physiology; they attach categorical notes
 * so the hidden prelude is self-interpreting. They never overwrite other calcs.
 */

// ---- Sodium status ----
register({
  id: "sodium_status",
  label: "Sodium",
  inputs: [{ key: "Na", required: true }],
  run: ({ Na }) => {
    if (Na == null) return null;
    const notes: string[] = [];
    if (Na < 120) notes.push("severe hyponatremia");
    else if (Na < 130) notes.push("moderate hyponatremia");
    else if (Na < 135) notes.push("mild hyponatremia");
    else if (Na > 145) notes.push("hypernatremia");
    else notes.push("normal");
    return { id: "sodium_status", label: "Sodium", value: Na, unit: "mmol/L", precision: 0, notes };
  },
});

// ---- Potassium status ----
register({
  id: "potassium_status",
  label: "Potassium",
  inputs: [{ key: "K", required: true }],
  run: ({ K }) => {
    if (K == null) return null;
    const notes: string[] = [];
    if (K < 3.0) notes.push("severe hypokalemia");
    else if (K < 3.5) notes.push("mild hypokalemia");
    else if (K > 6.0) notes.push("severe hyperkalemia (urgent)");
    else if (K > 5.5) notes.push("hyperkalemia");
    else notes.push("normal");
    return { id: "potassium_status", label: "Potassium", value: K, unit: "mmol/L", precision: 1, notes };
  },
});

// ---- Chloride status ----
register({
  id: "chloride_status",
  label: "Chloride",
  inputs: [{ key: "Cl", required: true }],
  run: ({ Cl }) => {
    if (Cl == null) return null;
    const notes: string[] = [];
    if (Cl < 98) notes.push("hypochloremia");
    else if (Cl > 106) notes.push("hyperchloremia");
    else notes.push("normal");
    return { id: "chloride_status", label: "Chloride", value: Cl, unit: "mmol/L", precision: 0, notes };
  },
});

// ---- Corrected Calcium (albumin) + status ----
// Corrected Ca (mg/dL) = measured Ca + 0.8 * (4.0 - albumin)
register({
  id: "corrected_calcium_status",
  label: "Corrected calcium",
  inputs: [{ key: "Ca", required: true }, { key: "albumin", required: true }],
  run: ({ Ca, albumin }) => {
    if (Ca == null || albumin == null) return null;
    const corrected = Ca + 0.8 * (4 - albumin);
    const notes: string[] = [];
    if (corrected < 7.5) notes.push("significant hypocalcemia");
    else if (corrected < 8.5) notes.push("mild hypocalcemia");
    else if (corrected > 10.5) notes.push("hypercalcemia");
    else notes.push("normal");
    // Explicitly override raw calcium interpretation
    notes.push("corrected value overrides raw calcium");
    return { id: "corrected_calcium_status", label: "Corrected calcium", value: corrected, unit: "mg/dL", precision: 1, notes };
  },
});

// ---- INR status ----
register({
  id: "inr_status",
  label: "INR",
  inputs: [{ key: "INR", required: true }],
  run: ({ INR }) => {
    if (INR == null) return null;
    const notes: string[] = [];
    if (INR > 3) notes.push("markedly elevated");
    else if (INR > 1.5) notes.push("elevated");
    else notes.push("normal");
    return { id: "inr_status", label: "INR", value: INR, precision: 2, notes };
  },
});

// ---- Bilirubin status ----
register({
  id: "bilirubin_status",
  label: "Bilirubin",
  inputs: [{ key: "bilirubin", required: true }],
  run: ({ bilirubin }) => {
    if (bilirubin == null) return null;
    const notes: string[] = [];
    if (bilirubin >= 3) notes.push("markedly elevated");
    else if (bilirubin >= 2) notes.push("elevated");
    else if (bilirubin > 1.2) notes.push("slightly elevated");
    else notes.push("normal");
    return { id: "bilirubin_status", label: "Bilirubin", value: bilirubin, unit: "mg/dL", precision: 1, notes };
  },
});

/** Albumin status — hypoalbuminemia flag */
register({
  id: "albumin_status",
  label: "Albumin",
  inputs: [{ key: "albumin", required: true }],
  run: ({ albumin }) => {
    if (albumin == null) return null;
    const notes: string[] = [];
    if (albumin < 2.5) notes.push("marked hypoalbuminemia");
    else if (albumin < 3.5) notes.push("hypoalbuminemia");
    else notes.push("normal");
    return { id: "albumin_status", label: "Albumin", value: albumin, unit: "g/dL", precision: 1, notes };
  },
});

/** Bicarbonate status — acidosis/alkalosis flag */
register({
  id: "bicarbonate_status",
  label: "Bicarbonate (HCO₃⁻)",
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    if (HCO3 == null) return null;
    const notes: string[] = [];
    if (HCO3 < 10) notes.push("severe metabolic acidosis");
    else if (HCO3 < 18) notes.push("metabolic acidosis");
    else if (HCO3 > 28) notes.push("metabolic alkalosis");
    else notes.push("normal");
    return { id: "bicarbonate_status", label: "Bicarbonate (HCO₃⁻)", value: HCO3, unit: "mmol/L", precision: 0, notes };
  },
});

/** Renal summary — BUN/Cr qualitative impairment cue (does NOT replace eGFR calcs) */
register({
  id: "renal_bun_cr_summary",
  label: "Renal (BUN/Cr)",
  inputs: [{ key: "BUN", required: true }, { key: "creatinine", required: true }],
  run: ({ BUN, creatinine }) => {
    if (BUN == null || creatinine == null) return null;
    const notes: string[] = [];
    if (creatinine >= 3 || BUN >= 80) notes.push("significant azotemia / renal impairment");
    else if (creatinine >= 2 || BUN >= 40) notes.push("moderate azotemia / renal impairment");
    else if (creatinine >= 1.3 || BUN >= 25) notes.push("mild renal impairment");
    else notes.push("no azotemia by BUN/Cr");
    // Show combined for clinician context
    const value = Number.isFinite(BUN / Math.max(0.1, creatinine)) ? BUN / Math.max(0.1, creatinine) : 0;
    return { id: "renal_bun_cr_summary", label: "Renal (BUN/Cr)", value, notes };
  },
});

/**
 * Acid–base summary: integrates HCO₃⁻ and anion gap into a plain-language status.
 * Simplified Phase-2 logic: detects metabolic acidosis (high AG vs normal AG).
 */
register({
  id: "acid_base_summary",
  label: "Acid–base status",
  inputs: [
    { key: "HCO3", required: true },
    { key: "anion_gap" }, // use if available
    { key: "anion_gap_corrected" },
    { key: "winters" } // expected PaCO2 from Winter’s formula
  ],
  run: ({ HCO3, anion_gap, anion_gap_corrected, winters }) => {
    if (HCO3 == null) return null;
    const notes: string[] = [];
    let label = "Acid–base status";

    // Use corrected AG if available, else raw AG
    const ag = anion_gap_corrected ?? anion_gap;

    if (HCO3 < 18) {
      if (ag != null && ag > 16) {
        notes.push("high anion gap metabolic acidosis");
      } else {
        notes.push("normal anion gap metabolic acidosis");
      }
      if (typeof winters === "number" && Number.isFinite(winters)) {
        notes.push(`with respiratory compensation (expected PaCO₂ ≈ ${Math.round(winters)})`);
      }
    } else if (HCO3 > 28) {
      notes.push("metabolic alkalosis");
    } else {
      notes.push("no primary metabolic disorder detected");
    }

    return { id: "acid_base_summary", label, value: HCO3, unit: "mmol/L", precision: 0, notes };
  },
});

/** Sepsis risk summary (qSOFA partial + PF ratio) */
register({
  id: "sepsis_risk_summary",
  label: "Sepsis risk",
  inputs: [{ key: "qsofa_partial" }, { key: "pf_ratio" }, { key: "SBP" }, { key: "RRr" }, { key: "lactate" }],
  run: ({ qsofa_partial, pf_ratio, SBP, RRr, lactate }) => {
    const notes: string[] = [];
    let risk: "high" | "intermediate" | "low" | "indeterminate" = "indeterminate";

    // Primary: qSOFA partial if available (mentation not auto-scored in Phase-1)
    if (typeof qsofa_partial === "number") {
      if (qsofa_partial >= 2) { risk = "high"; notes.push("qSOFA ≥2 (partial)"); }
      else if (qsofa_partial === 1) { risk = "intermediate"; notes.push("qSOFA = 1 (partial)"); }
      else { risk = "low"; notes.push("qSOFA = 0 (partial)"); }
    }

    // Secondary: hemodynamics/respiratory
    if (typeof pf_ratio === "number") {
      if (pf_ratio < 200) notes.push("moderate–severe hypoxemia");
      if (pf_ratio < 100) notes.push("very severe hypoxemia");
    }
    if (typeof SBP === "number" && SBP <= 100) notes.push("SBP ≤100");
    if (typeof RRr === "number" && RRr >= 22) notes.push("RR ≥22");
    if (typeof lactate === "number") {
      if (lactate >= 4) notes.push(`lactate ${lactate}`);
      else if (lactate >= 2) notes.push(`lactate ${lactate}`);
    }

    // Deterministic escalation to HIGH if any hard trigger present
    const hardHigh =
      (typeof qsofa_partial === "number" && qsofa_partial >= 2) ||
      (typeof lactate === "number" && lactate >= 4) ||
      (typeof pf_ratio === "number" && pf_ratio < 100);
    if (hardHigh) risk = "high";
    else if (risk === "indeterminate") risk = "intermediate"; // default if signals present but not definitive

    return { id: "sepsis_risk_summary", label: "Sepsis risk", value: risk, notes };
  },
});

/** Endocrine hyperglycemic crisis summary (DKA / HHS) */
register({
  id: "endocrine_keto_hyperglycemia",
  label: "Endocrine crisis",
  inputs: [
    { key: "glucose_mgdl" },
    { key: "HCO3" },
    { key: "anion_gap" },
    { key: "anion_gap_corrected" },
    { key: "pH" },
    { key: "beta_hydroxybutyrate" },
    { key: "serum_ketones" },
    { key: "urine_ketones" }
  ],
  run: (inp) => {
    const g = inp.glucose_mgdl ?? NaN;
    const bicarb = inp.HCO3 ?? NaN;
    const ag = inp.anion_gap_corrected ?? inp.anion_gap ?? NaN;
    const pH = inp.pH ?? NaN;
    const ket = [inp.beta_hydroxybutyrate, inp.serum_ketones, inp.urine_ketones].find(v => typeof v === "number" && v > 0);

    const notes: string[] = [];
    let label = "no crisis";
    if (Number.isFinite(g) && g >= 600 && !ket && (Number.isFinite(bicarb) ? bicarb > 18 : true)) {
      label = "probable HHS";
      notes.push("glucose ≥600 mg/dL; ketosis absent/unclear");
    } else if (
      Number.isFinite(g) && g >= 250 &&
      (ket || (Number.isFinite(ag) && ag > 16)) &&
      ((Number.isFinite(bicarb) && bicarb < 18) || (Number.isFinite(pH) && pH < 7.30))
    ) {
      if (Number.isFinite(bicarb) && bicarb < 10) notes.push("DKA — severe");
      else if (Number.isFinite(bicarb) && bicarb < 15) notes.push("DKA — moderate");
      else notes.push("DKA — mild");
      label = "DKA";
    }

    return { id: "endocrine_keto_hyperglycemia", label: "Endocrine crisis", value: label, notes };
  },
});

/** Lactate status */
register({
  id: "lactate_status",
  label: "Lactate",
  inputs: [{ key: "lactate" }],
  run: ({ lactate }) => {
    if (lactate == null) return null;
    const notes: string[] = [];
    if (lactate >= 4) notes.push("markedly elevated");
    else if (lactate >= 2) notes.push("elevated");
    else notes.push("normal");
    return { id: "lactate_status", label: "Lactate", value: lactate, unit: "mmol/L", precision: 1, notes };
  },
});

/** Hematology summary (Hb and Platelets) */
register({
  id: "hematology_summary",
  label: "Hematology",
  inputs: [{ key: "Hb" }, { key: "platelets" }],
  run: ({ Hb, platelets }) => {
    if (Hb == null && platelets == null) return null;
    const notes: string[] = [];
    if (typeof Hb === "number") {
      if (Hb < 7) notes.push("severe anemia");
      else if (Hb < 10) notes.push("moderate anemia");
      else if (Hb < 12) notes.push("mild anemia");
      else notes.push("Hb normal");
    }
    if (typeof platelets === "number") {
      if (platelets < 50) notes.push("severe thrombocytopenia");
      else if (platelets < 100) notes.push("moderate thrombocytopenia");
      else if (platelets < 150) notes.push("mild thrombocytopenia");
      else notes.push("platelets normal");
    }
    const val = [typeof Hb === "number" ? `Hb ${Hb}` : null, typeof platelets === "number" ? `Plt ${platelets}` : null].filter(Boolean).join(", ");
    return { id: "hematology_summary", label: "Hematology", value: val, notes };
  },
});

/** Renal syndrome summary (BUN/Cr/eGFR) */
register({
  id: "renal_syndrome_summary",
  label: "Renal syndrome",
  inputs: [{ key: "BUN", required: true }, { key: "creatinine", required: true }],
  run: ({ BUN, creatinine }) => {
    if (BUN == null || creatinine == null) return null;
    const notes: string[] = [];
    if (creatinine >= 3 || BUN >= 80) notes.push("severe renal impairment / likely AKI or advanced CKD");
    else if (creatinine >= 2 || BUN >= 40) notes.push("moderate renal impairment");
    else if (creatinine >= 1.3 || BUN >= 25) notes.push("mild renal impairment");
    else notes.push("normal renal function by BUN/Cr");
    return { id: "renal_syndrome_summary", label: "Renal syndrome", value: `${BUN}/${creatinine}`, notes };
  },
});

/** Hepatic syndrome summary (MELD-Na + Child-Pugh) */
register({
  id: "hepatic_syndrome_summary",
  label: "Hepatic syndrome",
  inputs: [{ key: "meld_na" }, { key: "child_pugh_helper" }, { key: "bilirubin" }, { key: "albumin" }, { key: "INR" }],
  run: ({ meld_na, child_pugh_helper }) => {
    const notes: string[] = [];
    if (meld_na != null) {
      if (meld_na >= 30) notes.push(`MELD-Na ${meld_na} — very advanced liver disease`);
      else if (meld_na >= 20) notes.push(`MELD-Na ${meld_na} — advanced liver dysfunction`);
      else if (meld_na >= 10) notes.push(`MELD-Na ${meld_na} — moderate dysfunction`);
      else notes.push(`MELD-Na ${meld_na} — mild dysfunction`);
    }
    if (child_pugh_helper != null) {
      notes.push("Child–Pugh inputs detected (albumin, bilirubin, INR) — use class for staging");
    }
    return { id: "hepatic_syndrome_summary", label: "Hepatic syndrome", value: "", notes };
  },
});

/** Circulatory syndrome summary (MAP + Shock Index) */
register({
  id: "circulation_summary",
  label: "Circulation",
  inputs: [{ key: "SBP" }, { key: "DBP" }, { key: "HR" }],
  run: ({ SBP, DBP, HR }) => {
    if (SBP == null || DBP == null || HR == null) return null;
    const map = (SBP + 2 * DBP) / 3;
    const shockIdx = HR / Math.max(SBP, 1);
    const notes: string[] = [];
    if (map < 65 && shockIdx >= 0.9) notes.push("hypotensive shock (MAP <65 with elevated Shock Index)");
    else if (map < 65) notes.push("hypotension with low perfusion (MAP <65)");
    else if (shockIdx >= 0.9) notes.push("circulatory stress (elevated Shock Index)");
    else notes.push("hemodynamically stable");
    return { id: "circulation_summary", label: "Circulation", value: `MAP ${map.toFixed(0)}, SI ${shockIdx.toFixed(2)}`, notes };
  },
});
// ===================== MED-FULL-PENDING (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

// ---------------- Acid–Base (advanced) ----------------

/** Delta gap (ΔAG − ΔHCO3) */
register({
  id: "delta_gap",
  label: "Delta gap",
  tags: ["acid-base"],
  inputs: [
    { key: "anion_gap", required: true },
    { key: "HCO3", required: true },
  ],
  run: ({ anion_gap, HCO3 }) => {
    if (anion_gap == null || HCO3 == null) return null;
    const dAG = anion_gap - 12;
    const dHCO3 = 24 - HCO3;
    const delta = dAG - dHCO3;
    const notes: string[] = [];
    if (Math.abs(delta) >= 4) notes.push("mixed metabolic disorder likely (Δ mismatch ≥4)");
    else notes.push("no strong evidence of additional metabolic process");
    return { id: "delta_gap", label: "Delta gap", value: delta, unit: "mmol/L", precision: 0, notes };
  },
});

/** Delta ratio = (AG - 12)/(24 - HCO3) (AG metabolic acidosis only) */
register({
  id: "delta_ratio",
  label: "Delta ratio",
  tags: ["acid-base"],
  inputs: [
    { key: "anion_gap", required: true },
    { key: "HCO3", required: true },
  ],
  run: ({ anion_gap, HCO3 }) => {
    if (anion_gap == null || HCO3 == null) return null;
    const num = anion_gap - 12;
    const den = 24 - HCO3;
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    const ratio = num / den;
    const notes: string[] = [];
    if (ratio < 0.4) notes.push("concurrent non-AG metabolic acidosis likely");
    else if (ratio > 2) notes.push("concurrent metabolic alkalosis or chronic respiratory acidosis likely");
    else notes.push("consistent with isolated high AG metabolic acidosis");
    return { id: "delta_ratio", label: "Delta ratio", value: ratio, unit: "unitless", precision: 2, notes };
  },
});

/** Expected PaCO2 in metabolic alkalosis */
register({
  id: "metabolic_alkalosis_expected_paco2",
  label: "Expected PaCO₂ (metabolic alkalosis)",
  tags: ["acid-base", "pulmonary"],
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    if (HCO3 == null) return null;
    const exp = 0.7 * (HCO3 - 24) + 40; // ±5
    return { id: "metabolic_alkalosis_expected_paco2", label: "Expected PaCO₂ (metabolic alkalosis)", value: exp, unit: "mmHg", precision: 0, notes: ["±5 mmHg"] };
  },
});

/** Expected HCO3 in acute respiratory acidosis */
register({
  id: "acute_resp_acidosis_hco3",
  label: "Expected HCO₃⁻ (acute respiratory acidosis)",
  tags: ["acid-base"],
  inputs: [{ key: "PaCO2", required: true }],
  run: ({ PaCO2 }) => {
    if (PaCO2 == null) return null;
    const exp = 24 + 0.1 * (PaCO2 - 40);
    return { id: "acute_resp_acidosis_hco3", label: "Expected HCO₃⁻ (acute respiratory acidosis)", value: exp, unit: "mmol/L", precision: 1, notes: [] };
  },
});

/** Expected HCO3 in chronic respiratory acidosis */
register({
  id: "chronic_resp_acidosis_hco3",
  label: "Expected HCO₃⁻ (chronic respiratory acidosis)",
  tags: ["acid-base"],
  inputs: [{ key: "PaCO2", required: true }],
  run: ({ PaCO2 }) => {
    if (PaCO2 == null) return null;
    const exp = 24 + 0.35 * (PaCO2 - 40);
    return { id: "chronic_resp_acidosis_hco3", label: "Expected HCO₃⁻ (chronic respiratory acidosis)", value: exp, unit: "mmol/L", precision: 1, notes: [] };
  },
});

/** Expected HCO3 in acute respiratory alkalosis */
register({
  id: "acute_resp_alkalosis_hco3",
  label: "Expected HCO₃⁻ (acute respiratory alkalosis)",
  tags: ["acid-base"],
  inputs: [{ key: "PaCO2", required: true }],
  run: ({ PaCO2 }) => {
    if (PaCO2 == null) return null;
    const exp = 24 - 0.2 * (40 - PaCO2);
    return { id: "acute_resp_alkalosis_hco3", label: "Expected HCO₃⁻ (acute respiratory alkalosis)", value: exp, unit: "mmol/L", precision: 1, notes: [] };
  },
});

/** Expected HCO3 in chronic respiratory alkalosis */
register({
  id: "chronic_resp_alkalosis_hco3",
  label: "Expected HCO₃⁻ (chronic respiratory alkalosis)",
  tags: ["acid-base"],
  inputs: [{ key: "PaCO2", required: true }],
  run: ({ PaCO2 }) => {
    if (PaCO2 == null) return null;
    const exp = 24 - 0.4 * (40 - PaCO2);
    return { id: "chronic_resp_alkalosis_hco3", label: "Expected HCO₃⁻ (chronic respiratory alkalosis)", value: exp, unit: "mmol/L", precision: 1, notes: [] };
  },
});

/** Bicarbonate deficit (metabolic acidosis) */
register({
  id: "bicarbonate_deficit",
  label: "Bicarbonate deficit",
  tags: ["acid-base"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "desired_HCO3", required: true },
    { key: "current_HCO3", required: true },
    { key: "distribution", required: false }, // default 0.5 L/kg
  ],
  run: ({ weight_kg, desired_HCO3, current_HCO3, distribution }) => {
    if ([weight_kg, desired_HCO3, current_HCO3].some(v => v == null)) return null;
    const dist = Number.isFinite(distribution) ? distribution : 0.5;
    const deficit = dist * weight_kg * (desired_HCO3 - current_HCO3);
    return { id: "bicarbonate_deficit", label: "Bicarbonate deficit", value: deficit, unit: "mEq", precision: 0, notes: ["estimation; not a dosing directive"] };
  },
});

// ---------------- Electrolytes & Water ----------------

/** Trans-tubular K gradient (TTKG) */
register({
  id: "ttkg",
  label: "Trans-tubular K gradient",
  tags: ["electrolytes", "renal"],
  inputs: [
    { key: "urine_K", required: true },
    { key: "serum_K", required: true },
    { key: "urine_osm", required: true },
    { key: "serum_osm", required: true },
    { key: "urine_Na" }, // optional for validity check
  ],
  run: ({ urine_K, serum_K, urine_osm, serum_osm, urine_Na }) => {
    if ([urine_K, serum_K, urine_osm, serum_osm].some(v => v == null)) return null;
    if (urine_osm <= 0) return null;
    const ttkg = (urine_K / serum_K) * (serum_osm / urine_osm);
    const notes: string[] = [];
    if (urine_osm < 300 || (urine_Na != null && urine_Na < 25)) notes.push("TTKG validity limited (Uosm<300 or UNa<25)");
    if (ttkg < 3) notes.push("low distal K secretion");
    else if (ttkg > 7) notes.push("high distal K secretion");
    else notes.push("intermediate");
    return { id: "ttkg", label: "Trans-tubular K gradient", value: ttkg, unit: "unitless", precision: 1, notes };
  },
});

/** Free water deficit (hypernatremia) */
register({
  id: "free_water_deficit",
  label: "Free water deficit",
  tags: ["electrolytes"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "sex", required: true },         // "M" | "F"
    { key: "Na", required: true },
    { key: "goal_Na", required: true },
  ],
  run: ({ weight_kg, sex, Na, goal_Na }) => {
    if ([weight_kg, sex, Na, goal_Na].some(v => v == null)) return null;
    const TBW = (sex === "F" ? 0.5 : 0.6) * weight_kg;
    const deficit = TBW * (Na / goal_Na - 1);
    return { id: "free_water_deficit", label: "Free water deficit", value: deficit, unit: "L", precision: 1, notes: ["estimation only"] };
  },
});

/** Sodium deficit (symptomatic hyponatremia) */
register({
  id: "sodium_deficit",
  label: "Sodium deficit",
  tags: ["electrolytes"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "Na", required: true },
    { key: "goal_Na", required: true },
    { key: "distribution" }, // default 0.6
  ],
  run: ({ weight_kg, Na, goal_Na, distribution }) => {
    if ([weight_kg, Na, goal_Na].some(v => v == null)) return null;
    const dist = Number.isFinite(distribution) ? distribution : 0.6;
    const deficit = dist * weight_kg * (goal_Na - Na);
    return { id: "sodium_deficit", label: "Sodium deficit", value: deficit, unit: "mEq", precision: 0, notes: ["estimation only"] };
  },
});

/** Magnesium correction flag (low Mg + low K) */
register({
  id: "magnesium_correction_note",
  label: "Magnesium/K interplay",
  tags: ["electrolytes"],
  inputs: [
    { key: "Mg", required: true },
    { key: "K", required: true },
  ],
  run: ({ Mg, K }) => {
    if ([Mg, K].some(v => v == null)) return null;
    const notes: string[] = [];
    if (Mg < 1.6 && K < 3.5) notes.push("replete magnesium to facilitate potassium correction");
    else notes.push("no Mg–K flag");
    return { id: "magnesium_correction_note", label: "Magnesium/K interplay", value: 0, unit: "note", precision: 0, notes };
  },
});

// ---------------- Renal ----------------

/** KDIGO AKI stage (creatinine + urine output) */
register({
  id: "kdigo_aki",
  label: "KDIGO AKI stage",
  tags: ["renal", "icu_scores"],
  inputs: [
    { key: "creatinine", required: true },
    { key: "baseline_creatinine" },
    { key: "creatinine_increase_48h" },
    { key: "urine_output_ml_per_kg_per_hr" },
    { key: "oliguria_hours" },
    { key: "anuria_hours" },
    { key: "dialysis" }, // boolean
  ],
  run: (x) => {
    const notes: string[] = [];
    let stage = 0;
    const Cr = x.creatinine;
    if (Cr == null) return null;
    const Crb = x.baseline_creatinine;
    const d48 = x.creatinine_increase_48h;
    const UO = x.urine_output_ml_per_kg_per_hr;
    const olH = x.oliguria_hours;
    const anH = x.anuria_hours;
    const dialysis = x.dialysis === true;

    if (dialysis) { stage = 3; notes.push("renal replacement therapy"); }
    if (Crb != null && Crb > 0) {
      const ratio = Cr / Crb;
      if (ratio >= 3) { stage = Math.max(stage, 3); notes.push("Cr ≥3× baseline"); }
      else if (ratio >= 2) { stage = Math.max(stage, 2); notes.push("Cr ≥2× baseline"); }
      else if (ratio >= 1.5) { stage = Math.max(stage, 1); notes.push("Cr ≥1.5× baseline"); }
    }
    if (d48 != null && d48 >= 0.3) { stage = Math.max(stage, 1); notes.push("Cr rise ≥0.3 mg/dL (48h)"); }
    if (Crb != null && Cr >= 4 && (Cr - Crb) >= 0.3) { stage = Math.max(stage, 3); notes.push("Cr ≥4.0 mg/dL with acute rise"); }

    if (typeof UO === "number" && typeof olH === "number") {
      if (UO < 0.5 && olH >= 12) { stage = Math.max(stage, 2); notes.push("UO <0.5 mL/kg/h ≥12h"); }
      else if (UO < 0.5 && olH >= 6) { stage = Math.max(stage, 1); notes.push("UO <0.5 mL/kg/h 6–12h"); }
    }
    if (typeof UO === "number" && typeof anH === "number") {
      if (UO < 0.3 && anH >= 24) { stage = Math.max(stage, 3); notes.push("UO <0.3 mL/kg/h ≥24h"); }
      if (anH >= 12) { stage = Math.max(stage, 3); notes.push("anuria ≥12h"); }
    }

    return { id: "kdigo_aki", label: "KDIGO AKI stage", value: stage, unit: "stage", precision: 0, notes: notes.length ? notes : ["insufficient criteria"] };
  },
});

/** Cockcroft–Gault creatinine clearance (mL/min) */
register({
  id: "creatinine_clearance",
  label: "Creatinine clearance (Cockcroft–Gault)",
  tags: ["renal"],
  inputs: [
    { key: "age", required: true },
    { key: "weight_kg", required: true },
    { key: "sex", required: true },         // "M" | "F"
    { key: "creatinine", required: true },  // mg/dL
  ],
  run: ({ age, weight_kg, sex, creatinine }) => {
    if ([age, weight_kg, sex, creatinine].some(v => v == null)) return null;
    if (creatinine <= 0) return null;
    let crcl = ((140 - age) * weight_kg) / (72 * creatinine);
    if (sex === "F") crcl *= 0.85;
    return { id: "creatinine_clearance", label: "Creatinine clearance (Cockcroft–Gault)", value: crcl, unit: "mL/min", precision: 0, notes: [] };
  },
});

/** eGFR (CKD-EPI 2021, creatinine-only) */
register({
  id: "egfr_ckdepi_2021",
  label: "eGFR (CKD-EPI 2021)",
  tags: ["renal"],
  inputs: [
    { key: "creatinine", required: true }, // mg/dL
    { key: "age", required: true },
    { key: "sex", required: true },        // "M" | "F"
  ],
  run: ({ creatinine, age, sex }) => {
    if ([creatinine, age, sex].some(v => v == null)) return null;
    const Scr = creatinine;
    const k = sex === "F" ? 0.7 : 0.9;
    const a = sex === "F" ? -0.241 : -0.302;
    const minScrK = Math.min(Scr / k, 1);
    const maxScrK = Math.max(Scr / k, 1);
    const egfr = 142 * Math.pow(minScrK, a) * Math.pow(maxScrK, -1.200) * Math.pow(0.9938, age) * (sex === "F" ? 1.012 : 1.0);
    const notes: string[] = [];
    if (egfr >= 90) notes.push("G1 (normal/high)");
    else if (egfr >= 60) notes.push("G2 (mildly decreased)");
    else if (egfr >= 45) notes.push("G3a");
    else if (egfr >= 30) notes.push("G3b");
    else if (egfr >= 15) notes.push("G4");
    else notes.push("G5 (kidney failure)");
    return { id: "egfr_ckdepi_2021", label: "eGFR (CKD-EPI 2021)", value: egfr, unit: "mL/min/1.73m²", precision: 0, notes };
  },
});

// ---------------- Hepatology ----------------

/** Maddrey’s Discriminant Function */
register({
  id: "maddrey_df",
  label: "Maddrey’s DF",
  tags: ["hepatology"],
  inputs: [
    { key: "protime", required: true },
    { key: "control_protime", required: true },
    { key: "bilirubin", required: true },
  ],
  run: ({ protime, control_protime, bilirubin }) => {
    if ([protime, control_protime, bilirubin].some(v => v == null)) return null;
    const df = 4.6 * (protime - control_protime) + bilirubin;
    const notes: string[] = [];
    if (df >= 32) notes.push("severe alcoholic hepatitis (DF ≥32)");
    else notes.push("below severe threshold (DF <32)");
    return { id: "maddrey_df", label: "Maddrey’s DF", value: df, unit: "score", precision: 0, notes };
  },
});

/** MELD-Na (2016) */
register({
  id: "meld_na",
  label: "MELD-Na",
  tags: ["hepatology"],
  inputs: [
    { key: "bilirubin", required: true },
    { key: "INR", required: true },
    { key: "creatinine", required: true },
    { key: "Na", required: true },
    { key: "dialysis" },
  ],
  run: ({ bilirubin, INR, creatinine, Na, dialysis }) => {
    if ([bilirubin, INR, creatinine, Na].some(v => v == null)) return null;
    const ln = Math.log;
    const cr = Math.max(1.0, Math.min(4.0, dialysis ? 4.0 : creatinine));
    const bili = Math.max(1.0, bilirubin);
    const inr = Math.max(1.0, INR);
    const sodium = Math.max(125, Math.min(137, Na));
    const MELD = 0.957 * ln(cr) + 0.378 * ln(bili) + 1.120 * ln(inr) + 0.643;
    const meldNa = MELD + 1.32 * (137 - sodium) - (0.033 * MELD * (137 - sodium));
    const score = Math.round(Math.max(6, Math.min(40, meldNa)));
    const notes: string[] = [];
    if (score >= 30) notes.push("very high risk (≥30)");
    else if (score >= 20) notes.push("high risk (20–29)");
    else if (score >= 10) notes.push("moderate risk (10–19)");
    else notes.push("lower risk band (<10)");
    return { id: "meld_na", label: "MELD-Na", value: score, unit: "score", precision: 0, notes };
  },
});

/** Child–Pugh class */
register({
  id: "child_pugh",
  label: "Child–Pugh",
  tags: ["hepatology"],
  inputs: [
    { key: "bilirubin", required: true },           // mg/dL
    { key: "albumin", required: true },             // g/dL
    { key: "INR", required: true },
    { key: "ascites", required: true },             // "none" | "mild/moderate" | "severe/refractory"
    { key: "encephalopathy", required: true },      // "none" | "grade I–II" | "grade III–IV"
  ],
  run: ({ bilirubin, albumin, INR, ascites, encephalopathy }) => {
    if ([bilirubin, albumin, INR, ascites, encephalopathy].some(v => v == null)) return null;
    const scoreBili = bilirubin < 2 ? 1 : bilirubin <= 3 ? 2 : 3;
    const scoreAlb = albumin > 3.5 ? 1 : albumin >= 2.8 ? 2 : 3;
    const scoreINR = INR < 1.7 ? 1 : INR <= 2.3 ? 2 : 3;
    const scoreAsc = ascites === "none" ? 1 : (ascites === "mild/moderate" ? 2 : 3);
    const scoreEnce = encephalopathy === "none" ? 1 : (encephalopathy === "grade I–II" ? 2 : 3);
    const total = scoreBili + scoreAlb + scoreINR + scoreAsc + scoreEnce;
    const notes: string[] = [];
    const cls = total <= 6 ? "A" : total <= 9 ? "B" : "C";
    notes.push(`Class ${cls}`);
    return { id: "child_pugh", label: "Child–Pugh", value: total, unit: "points", precision: 0, notes };
  },
});

// ---------------- Hematology ----------------

/** Absolute neutrophil count (ANC) */
register({
  id: "anc",
  label: "Absolute neutrophil count",
  tags: ["hematology"],
  inputs: [
    { key: "WBC", required: true },            // 10^9/L or 10^3/µL (treated numerically)
    { key: "neutrophil_pct", required: true }, // %
    { key: "bands_pct" },                      // %
  ],
  run: ({ WBC, neutrophil_pct, bands_pct }) => {
    if ([WBC, neutrophil_pct].some(v => v == null)) return null;
    const anc = WBC * ((neutrophil_pct + (bands_pct ?? 0)) / 100);
    const notes: string[] = [];
    if (anc < 0.5) notes.push("severe neutropenia (<0.5)");
    else if (anc < 1.0) notes.push("moderate neutropenia (<1.0)");
    else if (anc < 1.5) notes.push("mild neutropenia (<1.5)");
    else notes.push("within reference");
    return { id: "anc", label: "Absolute neutrophil count", value: anc, unit: "10^9/L", precision: 2, notes };
  },
});

/** Corrected reticulocyte count */
register({
  id: "corrected_retic",
  label: "Corrected reticulocyte count",
  tags: ["hematology"],
  inputs: [
    { key: "retic_pct", required: true },
    { key: "hct", required: true },
    { key: "normal_hct" }, // default 45
  ],
  run: ({ retic_pct, hct, normal_hct }) => {
    if ([retic_pct, hct].some(v => v == null)) return null;
    const nh = Number.isFinite(normal_hct) ? normal_hct : 45;
    const corrected = retic_pct * (hct / nh);
    return { id: "corrected_retic", label: "Corrected reticulocyte count", value: corrected, unit: "%", precision: 2, notes: [] };
  },
});

// ---------------- Risk Scores ----------------

/** Wells score (PE) */
register({
  id: "wells_pe",
  label: "Wells score (PE)",
  tags: ["risk", "pulmonary"],
  inputs: [
    { key: "dvt_signs", required: true },           // boolean
    { key: "pe_most_likely", required: true },      // boolean
    { key: "hr_gt_100", required: true },           // boolean
    { key: "immobilization", required: true },      // boolean (recent surgery/immob)
    { key: "previous_dvt_pe", required: true },     // boolean
    { key: "hemoptysis", required: true },          // boolean
    { key: "cancer", required: true },              // boolean
  ],
  run: (x) => {
    const pts =
      (x.dvt_signs ? 3 : 0) +
      (x.pe_most_likely ? 3 : 0) +
      (x.hr_gt_100 ? 1.5 : 0) +
      (x.immobilization ? 1.5 : 0) +
      (x.previous_dvt_pe ? 1.5 : 0) +
      (x.hemoptysis ? 1 : 0) +
      (x.cancer ? 1 : 0);
    const notes: string[] = [];
    if (pts <= 1) notes.push("low probability");
    else if (pts <= 6) notes.push("moderate probability");
    else notes.push("high probability");
    return { id: "wells_pe", label: "Wells score (PE)", value: pts, unit: "points", precision: 1, notes };
  },
});

/** Alvarado score (appendicitis) */
register({
  id: "alvarado",
  label: "Alvarado score",
  tags: ["risk", "surgery"],
  inputs: [
    { key: "migration", required: true },     // boolean
    { key: "RLQ", required: true },           // boolean
    { key: "anorexia", required: true },      // boolean
    { key: "nausea", required: true },        // boolean
    { key: "rebound", required: true },       // boolean
    { key: "fever", required: true },         // boolean
    { key: "leukocytosis", required: true },  // boolean
    { key: "left_shift", required: true },    // boolean
  ],
  run: (x) => {
    const pts =
      (x.migration ? 1 : 0) + (x.RLQ ? 2 : 0) + (x.anorexia ? 1 : 0) + (x.nausea ? 1 : 0) +
      (x.rebound ? 1 : 0) + (x.fever ? 1 : 0) + (x.leukocytosis ? 2 : 0) + (x.left_shift ? 1 : 0);
    const notes: string[] = [];
    if (pts >= 7) notes.push("probable appendicitis (≥7)");
    else if (pts >= 5) notes.push("compatible (5–6)");
    else notes.push("less likely (<5)");
    return { id: "alvarado", label: "Alvarado score", value: pts, unit: "points", precision: 0, notes };
  },
});

/** Padua VTE risk (medical inpatients) */
register({
  id: "padua_vte",
  label: "Padua VTE risk",
  tags: ["risk", "medicine"],
  inputs: [
    { key: "active_cancer", required: true },
    { key: "previous_VTE", required: true },
    { key: "reduced_mobility", required: true },
    { key: "thrombophilia", required: true },
    { key: "trauma_surgery", required: true },
    { key: "age_ge_70", required: true },
    { key: "heart_failure_or_MI", required: true },
    { key: "stroke", required: true },
    { key: "acute_infection_or_rheum", required: true },
    { key: "obesity_bmi_ge_30", required: true },
    { key: "ongoing_hormonal_tx", required: true },
  ],
  run: (x) => {
    const pts =
      (x.active_cancer ? 3 : 0) +
      (x.previous_VTE ? 3 : 0) +
      (x.reduced_mobility ? 3 : 0) +
      (x.thrombophilia ? 3 : 0) +
      (x.trauma_surgery ? 2 : 0) +
      (x.age_ge_70 ? 1 : 0) +
      (x.heart_failure_or_MI ? 1 : 0) +
      (x.stroke ? 1 : 0) +
      (x.acute_infection_or_rheum ? 1 : 0) +
      (x.obesity_bmi_ge_30 ? 1 : 0) +
      (x.ongoing_hormonal_tx ? 1 : 0);
    const notes: string[] = [];
    if (pts >= 4) notes.push("high risk (≥4)");
    else notes.push("lower risk (<4)");
    return { id: "padua_vte", label: "Padua VTE risk", value: pts, unit: "points", precision: 0, notes };
  },
});

/** TIMI (NSTEMI/UA) */
register({
  id: "timi_nstemi",
  label: "TIMI risk (NSTEMI/UA)",
  tags: ["risk", "cardiology"],
  inputs: [
    { key: "age_ge_65", required: true },
    { key: "ge_3_risk_factors", required: true },
    { key: "known_cad_ge_50", required: true },
    { key: "aspirin_recent_7d", required: true },
    { key: "severe_angina_24h", required: true },
    { key: "st_deviation", required: true },
    { key: "positive_markers", required: true },
  ],
  run: (x) => {
    const pts =
      (x.age_ge_65 ? 1 : 0) +
      (x.ge_3_risk_factors ? 1 : 0) +
      (x.known_cad_ge_50 ? 1 : 0) +
      (x.aspirin_recent_7d ? 1 : 0) +
      (x.severe_angina_24h ? 1 : 0) +
      (x.st_deviation ? 1 : 0) +
      (x.positive_markers ? 1 : 0);
    return { id: "timi_nstemi", label: "TIMI risk (NSTEMI/UA)", value: pts, unit: "points", precision: 0, notes: [] };
  },
});

/** GRACE (simplified placeholder: sum of provided points table) */
register({
  id: "grace_simplified",
  label: "GRACE (simplified)",
  tags: ["risk", "cardiology"],
  inputs: [
    // Expect pre-binned/pointed inputs from upstream mapper (keep engine simple)
    { key: "grace_points", required: true }, // numeric total from mapping layer
  ],
  run: ({ grace_points }) => {
    if (grace_points == null) return null;
    const notes: string[] = [];
    if (grace_points >= 140) notes.push("high risk");
    else if (grace_points >= 109) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "grace_simplified", label: "GRACE (simplified)", value: grace_points, unit: "points", precision: 0, notes };
  },
});

/** CHA2DS2-VASc */
register({
  id: "cha2ds2_vasc",
  label: "CHA₂DS₂-VASc",
  tags: ["risk", "cardiology"],
  inputs: [
    { key: "CHF", required: true },
    { key: "HTN", required: true },
    { key: "Age_ge_75", required: true },
    { key: "DM", required: true },
    { key: "Stroke_TIA", required: true },
    { key: "vascular", required: true },
    { key: "Age_65_to_74", required: true },
    { key: "sex_f", required: true },
  ],
  run: (x) => {
    const pts =
      (x.CHF ? 1 : 0) +
      (x.HTN ? 1 : 0) +
      (x.Age_ge_75 ? 2 : 0) +
      (x.DM ? 1 : 0) +
      (x.Stroke_TIA ? 2 : 0) +
      (x.vascular ? 1 : 0) +
      (x.Age_65_to_74 ? 1 : 0) +
      (x.sex_f ? 1 : 0);
    const notes: string[] = [];
    if (pts >= 2) notes.push("elevated stroke risk");
    else notes.push("lower stroke risk");
    return { id: "cha2ds2_vasc", label: "CHA₂DS₂-VASc", value: pts, unit: "points", precision: 0, notes };
  },
});

/** HAS-BLED */
register({
  id: "has_bled",
  label: "HAS-BLED",
  tags: ["risk", "cardiology"],
  inputs: [
    { key: "HTN", required: true },
    { key: "abnormal_renal_liver", required: true }, // any abnormality
    { key: "stroke", required: true },
    { key: "bleeding_history", required: true },
    { key: "labile_inr", required: true },
    { key: "elderly_ge_65", required: true },
    { key: "drugs_alcohol", required: true }, // either
  ],
  run: (x) => {
    const pts =
      (x.HTN ? 1 : 0) +
      (x.abnormal_renal_liver ? 1 : 0) +
      (x.stroke ? 1 : 0) +
      (x.bleeding_history ? 1 : 0) +
      (x.labile_inr ? 1 : 0) +
      (x.elderly_ge_65 ? 1 : 0) +
      (x.drugs_alcohol ? 1 : 0);
    const notes: string[] = [];
    if (pts >= 3) notes.push("high bleeding risk (≥3)");
    else notes.push("lower bleeding risk");
    return { id: "has_bled", label: "HAS-BLED", value: pts, unit: "points", precision: 0, notes };
  },
});

// ---------------- General / Body Size ----------------

/** BMI (kg/m²) */
register({
  id: "bmi",
  label: "Body mass index",
  tags: ["general"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "height_m" },
    { key: "height_cm" },
  ],
  run: ({ weight_kg, height_m, height_cm }) => {
    if (weight_kg == null) return null;
    let hm = height_m;
    if (hm == null && height_cm != null) hm = height_cm / 100;
    if (hm == null || hm <= 0) return null;
    const bmi = weight_kg / (hm * hm);
    const notes: string[] = [];
    if (bmi < 18.5) notes.push("underweight");
    else if (bmi < 25) notes.push("normal");
    else if (bmi < 30) notes.push("overweight");
    else notes.push("obesity");
    return { id: "bmi", label: "Body mass index", value: bmi, unit: "kg/m^2", precision: 1, notes };
  },
});

/** Body surface area (Mosteller) */
register({
  id: "bsa_mosteller",
  label: "Body surface area (Mosteller)",
  tags: ["general"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "height_cm", required: true },
  ],
  run: ({ weight_kg, height_cm }) => {
    if ([weight_kg, height_cm].some(v => v == null)) return null;
    const bsa = Math.sqrt((height_cm * weight_kg) / 3600);
    return { id: "bsa_mosteller", label: "Body surface area (Mosteller)", value: bsa, unit: "m^2", precision: 2, notes: [] };
  },
});

// ---------------- Burns & Pediatrics ----------------

/** Parkland burn formula (24h) */
register({
  id: "parkland",
  label: "Parkland burn formula",
  tags: ["critical_care"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "TBSA_burn_pct", required: true },
  ],
  run: ({ weight_kg, TBSA_burn_pct }) => {
    if ([weight_kg, TBSA_burn_pct].some(v => v == null)) return null;
    const total = 4 * weight_kg * TBSA_burn_pct; // mL in 24h
    const first8h = total / 2;
    return { id: "parkland", label: "Parkland burn formula", value: total, unit: "mL (24h)", precision: 0, notes: [`first 8h: ${Math.round(first8h)} mL`] };
  },
});

/** Pediatric maintenance fluids (4-2-1 rule) */
register({
  id: "peds_421_rule",
  label: "Pediatric maintenance fluids (4-2-1)",
  tags: ["pediatrics"],
  inputs: [{ key: "weight_kg", required: true }],
  run: ({ weight_kg }) => {
    if (weight_kg == null) return null;
    const first10 = Math.min(weight_kg, 10) * 4;
    const second10 = Math.max(Math.min(weight_kg - 10, 10), 0) * 2;
    const rest = Math.max(weight_kg - 20, 0) * 1;
    const hourly = first10 + second10 + rest;
    return { id: "peds_421_rule", label: "Pediatric maintenance fluids (4-2-1)", value: hourly, unit: "mL/h", precision: 0, notes: [] };
  },
});

// ===================== MED-EXT1 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* ---------- ICU: SOFA Subscores (simple mappings) ---------- */
/** SOFA Respiratory (uses PF ratio and ventilation boolean) */
register({
  id: "sofa_resp",
  label: "SOFA respiratory",
  tags: ["icu_scores", "pulmonary"],
  inputs: [
    { key: "pf_ratio", required: true },           // mmHg
    { key: "on_vent", required: false },           // boolean (optional)
  ],
  run: ({ pf_ratio, on_vent }) => {
    if (pf_ratio == null) return null;
    let points = 0;
    if (pf_ratio < 100 && on_vent) points = 4;
    else if (pf_ratio < 200 && on_vent) points = 3;
    else if (pf_ratio < 300) points = 2;
    else if (pf_ratio < 400) points = 1;
    return { id: "sofa_resp", label: "SOFA respiratory", value: points, unit: "points", precision: 0, notes: [] };
  },
});

/** SOFA Coagulation (platelets) */
register({
  id: "sofa_coag",
  label: "SOFA coagulation",
  tags: ["icu_scores", "hematology"],
  inputs: [{ key: "platelets", required: true }], // x10^3/µL
  run: ({ platelets }) => {
    if (platelets == null) return null;
    let p = 0;
    if (platelets < 20) p = 4;
    else if (platelets < 50) p = 3;
    else if (platelets < 100) p = 2;
    else if (platelets < 150) p = 1;
    return { id: "sofa_coag", label: "SOFA coagulation", value: p, unit: "points", precision: 0, notes: [] };
  },
});

/** SOFA Liver (bilirubin) */
register({
  id: "sofa_liver",
  label: "SOFA liver",
  tags: ["icu_scores", "hepatology"],
  inputs: [{ key: "bilirubin", required: true }], // mg/dL
  run: ({ bilirubin }) => {
    if (bilirubin == null) return null;
    let p = 0;
    if (bilirubin >= 12.0) p = 4;
    else if (bilirubin >= 6.0) p = 3;
    else if (bilirubin >= 2.0) p = 2;
    else if (bilirubin >= 1.2) p = 1;
    return { id: "sofa_liver", label: "SOFA liver", value: p, unit: "points", precision: 0, notes: [] };
  },
});

/** SOFA Cardiovascular (simplified: MAP & vasopressor category) */
register({
  id: "sofa_cardio",
  label: "SOFA cardiovascular",
  tags: ["icu_scores", "hemodynamics"],
  inputs: [
    { key: "map_calc" },                        // mmHg
    { key: "pressor_support" },                 // "none" | "dopamine_low" | "dopamine_mod_high" | "epi_low" | "epi_high" | "norepi_low" | "norepi_high"
  ],
  run: ({ map_calc, pressor_support }) => {
    let p = 0;
    if (pressor_support === "epi_high" || pressor_support === "norepi_high" || pressor_support === "dopamine_mod_high") p = 4;
    else if (pressor_support === "epi_low" || pressor_support === "norepi_low") p = 3;
    else if (pressor_support === "dopamine_low") p = 2;
    else if (typeof map_calc === "number" && map_calc < 70) p = 1;
    return { id: "sofa_cardio", label: "SOFA cardiovascular", value: p, unit: "points", precision: 0, notes: [] };
  },
});

/** SOFA CNS (GCS) */
register({
  id: "sofa_cns",
  label: "SOFA CNS",
  tags: ["icu_scores", "neurology"],
  inputs: [{ key: "gcs", required: true }],
  run: ({ gcs }) => {
    if (gcs == null) return null;
    let p = 0;
    if (gcs < 6) p = 4;
    else if (gcs < 10) p = 3;
    else if (gcs < 13) p = 2;
    else if (gcs < 15) p = 1;
    return { id: "sofa_cns", label: "SOFA CNS", value: p, unit: "points", precision: 0, notes: [] };
  },
});

/** SOFA Renal (creatinine or urine output) */
register({
  id: "sofa_renal",
  label: "SOFA renal",
  tags: ["icu_scores", "renal"],
  inputs: [
    { key: "creatinine" },                      // mg/dL
    { key: "urine_output_ml_per_day" },         // mL/day
  ],
  run: ({ creatinine, urine_output_ml_per_day }) => {
    let p = 0;
    if (typeof creatinine === "number") {
      if (creatinine >= 5.0) p = Math.max(p, 4);
      else if (creatinine >= 3.5) p = Math.max(p, 3);
      else if (creatinine >= 2.0) p = Math.max(p, 2);
      else if (creatinine >= 1.2) p = Math.max(p, 1);
    }
    if (typeof urine_output_ml_per_day === "number") {
      if (urine_output_ml_per_day < 200) p = Math.max(p, 4);
      else if (urine_output_ml_per_day < 500) p = Math.max(p, 3);
    }
    return { id: "sofa_renal", label: "SOFA renal", value: p, unit: "points", precision: 0, notes: [] };
  },
});

/* ---------- ED/Medicine Rules ---------- */
/** CURB-65 (pneumonia severity) */
register({
  id: "curb65",
  label: "CURB-65",
  tags: ["risk", "pulmonary", "infectious_disease"],
  inputs: [
    { key: "confusion", required: true },      // boolean
    { key: "BUN", required: true },            // mg/dL (≥20 approximates urea >7 mmol/L)
    { key: "RRr", required: true },            // breaths/min
    { key: "SBP", required: true },            // mmHg
    { key: "DBP", required: true },            // mmHg
    { key: "age", required: true },            // years
  ],
  run: ({ confusion, BUN, RRr, SBP, DBP, age }) => {
    const pts =
      (confusion ? 1 : 0) +
      ((BUN ?? 0) >= 20 ? 1 : 0) +
      ((RRr ?? 0) >= 30 ? 1 : 0) +
      ((SBP ?? 999) < 90 || (DBP ?? 999) <= 60 ? 1 : 0) +
      ((age ?? 0) >= 65 ? 1 : 0);
    const notes: string[] = [];
    if (pts >= 3) notes.push("severe risk (≥3)");
    else if (pts === 2) notes.push("moderate risk");
    else notes.push("low risk");
    return { id: "curb65", label: "CURB-65", value: pts, unit: "points", precision: 0, notes };
  },
});

/** PERC rule (PE rule-out in low-risk patients) */
register({
  id: "perc_pe",
  label: "PERC (PE rule-out)",
  tags: ["risk", "pulmonary"],
  inputs: [
    { key: "age_lt_50", required: true },
    { key: "hr_lt_100", required: true },
    { key: "saO2_ge_95", required: true },
    { key: "no_hemoptysis", required: true },
    { key: "no_estrogen", required: true },
    { key: "no_recent_surgery_trauma", required: true },
    { key: "no_unilateral_leg_swelling", required: true },
    { key: "no_prior_dvt_pe", required: true },
  ],
  run: (x) => {
    const allNeg = x.age_lt_50 && x.hr_lt_100 && x.saO2_ge_95 && x.no_hemoptysis &&
                   x.no_estrogen && x.no_recent_surgery_trauma && x.no_unilateral_leg_swelling && x.no_prior_dvt_pe;
    const notes: string[] = [];
    notes.push(allNeg ? "PERC negative (in low-risk context may rule out PE)" : "PERC positive");
    return { id: "perc_pe", label: "PERC (PE rule-out)", value: allNeg ? 0 : 1, unit: "flag", precision: 0, notes };
  },
});

/** Centor/McIsaac (strep pharyngitis) — McIsaac adjustment via age_band */
register({
  id: "centor_mcisaac",
  label: "Centor/McIsaac",
  tags: ["risk", "infectious_disease"],
  inputs: [
    { key: "tonsillar_exudate", required: true }, // boolean
    { key: "tender_anterior_nodes", required: true },
    { key: "fever_history", required: true },
    { key: "cough_absent", required: true },
    { key: "age_band", required: true },          // "3-14" | "15-44" | ">=45"
  ],
  run: (x) => {
    let pts = (x.tonsillar_exudate?1:0) + (x.tender_anterior_nodes?1:0) + (x.fever_history?1:0) + (x.cough_absent?1:0);
    if (x.age_band === "3-14") pts += 1;
    else if (x.age_band === ">=45") pts -= 1;
    const notes: string[] = [];
    if (pts >= 4) notes.push("high probability (consider testing)");
    else if (pts >= 2) notes.push("intermediate (test if available)");
    else notes.push("low probability");
    return { id: "centor_mcisaac", label: "Centor/McIsaac", value: pts, unit: "points", precision: 0, notes };
  },
});

/** Ranson criteria (acute pancreatitis) — Admission */
register({
  id: "ranson_admission",
  label: "Ranson (admission)",
  tags: ["risk", "gastroenterology"],
  inputs: [
    { key: "age", required: true },                 // >55
    { key: "WBC", required: true },                 // >16 (x10^3/µL)
    { key: "glucose", required: true },             // >200 mg/dL
    { key: "LDH", required: true },                 // >350 IU/L
    { key: "AST", required: true },                 // >250 IU/L
  ],
  run: ({ age, WBC, glucose, LDH, AST }) => {
    const pts = (age>55?1:0) + (WBC>16?1:0) + (glucose>200?1:0) + (LDH>350?1:0) + (AST>250?1:0);
    const notes: string[] = [];
    notes.push(`${pts} criteria at admission`);
    return { id: "ranson_admission", label: "Ranson (admission)", value: pts, unit: "points", precision: 0, notes };
  },
});

/** Ranson criteria (48h) — require pre-computed deltas from upstream if available */
register({
  id: "ranson_48h",
  label: "Ranson (48h)",
  tags: ["risk", "gastroenterology"],
  inputs: [
    { key: "hct_drop_pct", required: true },        // % drop in Hct (>10)
    { key: "bun_increase_mgdl", required: true },   // rise (>5)
    { key: "calcium", required: true },             // <8
    { key: "PaO2", required: true },                // <60
    { key: "base_deficit", required: true },        // >4
    { key: "fluid_sequestration_L", required: true } // >6
  ],
  run: (x) => {
    const pts = (x.hct_drop_pct>10?1:0) + (x.bun_increase_mgdl>5?1:0) + (x.calcium<8?1:0) + (x.PaO2<60?1:0) + (x.base_deficit>4?1:0) + (x.fluid_sequestration_L>6?1:0);
    const notes: string[] = [];
    notes.push(`${pts} criteria at 48h`);
    return { id: "ranson_48h", label: "Ranson (48h)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- ECG: QTc (Bazett & Fridericia) ---------- */
register({
  id: "qtc_bazett",
  label: "QTc (Bazett)",
  tags: ["cardiology"],
  inputs: [
    { key: "QT_ms", required: true },               // ms
    { key: "RR_interval_s", required: true },       // seconds
  ],
  run: ({ QT_ms, RR_interval_s }) => {
    if ([QT_ms, RR_interval_s].some(v => v == null) || RR_interval_s <= 0) return null;
    const qtc = QT_ms / Math.sqrt(RR_interval_s);
    const notes: string[] = [];
    if (qtc > 500) notes.push("markedly prolonged");
    else if (qtc > 470) notes.push("prolonged");
    else notes.push("normal/indeterminate by Bazett");
    return { id: "qtc_bazett", label: "QTc (Bazett)", value: qtc, unit: "ms", precision: 0, notes };
  },
});

register({
  id: "qtc_fridericia",
  label: "QTc (Fridericia)",
  tags: ["cardiology"],
  inputs: [
    { key: "QT_ms", required: true },               // ms
    { key: "RR_interval_s", required: true },       // seconds
  ],
  run: ({ QT_ms, RR_interval_s }) => {
    if ([QT_ms, RR_interval_s].some(v => v == null) || RR_interval_s <= 0) return null;
    const qtc = QT_ms / Math.cbrt(RR_interval_s);
    const notes: string[] = [];
    if (qtc > 500) notes.push("markedly prolonged");
    else if (qtc > 470) notes.push("prolonged");
    else notes.push("normal/indeterminate by Fridericia");
    return { id: "qtc_fridericia", label: "QTc (Fridericia)", value: qtc, unit: "ms", precision: 0, notes };
  },
});

/* ---------- Urine chemistry ---------- */
/** Urine anion gap (UAG = UNa + UK − UCl) */
register({
  id: "urine_anion_gap",
  label: "Urine anion gap",
  tags: ["renal", "electrolytes"],
  inputs: [
    { key: "urine_Na", required: true },
    { key: "urine_K", required: true },
    { key: "urine_Cl", required: true },
  ],
  run: ({ urine_Na, urine_K, urine_Cl }) => {
    if ([urine_Na, urine_K, urine_Cl].some(v => v == null)) return null;
    const uag = urine_Na + urine_K - urine_Cl;
    const notes: string[] = [];
    if (uag < 0) notes.push("negative UAG (suggests ↑ urinary NH4⁺; e.g., diarrhea for NAGMA)");
    else notes.push("positive/neutral UAG (reduced NH4⁺; consider RTA)");
    return { id: "urine_anion_gap", label: "Urine anion gap", value: uag, unit: "mmol/L", precision: 0, notes };
  },
});

// ===================== MED-EXT2 (APPEND-ONLY) =====================

/* ---------- Wells DVT (leg DVT pre-test probability) ---------- */
/* Classic 9-item model; low 0 or less, moderate 1–2, high ≥3 */
register({
  id: "wells_dvt",
  label: "Wells DVT",
  tags: ["risk", "vascular"],
  inputs: [
    { key: "active_cancer", required: true },            // +1
    { key: "paralysis_or_immobilization", required: true }, // +1
    { key: "recent_bedridden_or_surgery", required: true }, // +1
    { key: "tenderness_deep_veins", required: true },    // +1
    { key: "entire_leg_swollen", required: true },       // +1
    { key: "calf_swelling_gt_3cm", required: true },     // +1
    { key: "pitting_edema_symptomatic_leg", required: true }, // +1
    { key: "collateral_superficial_veins", required: true },  // +1
    { key: "alternative_dx_more_likely", required: true },    // −2
  ],
  run: (x) => {
    let pts = 0;
    pts += x.active_cancer ? 1 : 0;
    pts += x.paralysis_or_immobilization ? 1 : 0;
    pts += x.recent_bedridden_or_surgery ? 1 : 0;
    pts += x.tenderness_deep_veins ? 1 : 0;
    pts += x.entire_leg_swollen ? 1 : 0;
    pts += x.calf_swelling_gt_3cm ? 1 : 0;
    pts += x.pitting_edema_symptomatic_leg ? 1 : 0;
    pts += x.collateral_superficial_veins ? 1 : 0;
    pts += x.alternative_dx_more_likely ? -2 : 0;

    const notes:string[] = [];
    if (pts >= 3) notes.push("high probability (≥3)");
    else if (pts >= 1) notes.push("moderate probability (1–2)");
    else notes.push("low probability (≤0)");
    return { id: "wells_dvt", label: "Wells DVT", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- PSI-lite (very small surrogate for Pneumonia Severity Index) ----------
   This intentionally uses a tiny subset that correlates with risk bands.
   Inputs map to 0–9 points; ≥5 = high, 3–4 = intermediate, 0–2 = low.
*/
register({
  id: "psi_lite",
  label: "PSI-lite (surrogate)",
  tags: ["risk", "pulmonary", "infectious_disease"],
  inputs: [
    { key: "age", required: true },                  // ≥65 +2
    { key: "SBP", required: true },                  // <90 +2
    { key: "RRr", required: true },                  // ≥30 +2
    { key: "BUN", required: true },                  // ≥20 +2
    { key: "SaO2", required: true },                 // <90% +1
    { key: "confusion", required: true },            // +2
  ],
  run: ({ age, SBP, RRr, BUN, SaO2, confusion }) => {
    let pts = 0;
    if ((age ?? 0) >= 65) pts += 2;
    if ((SBP ?? 999) < 90) pts += 2;
    if ((RRr ?? 0) >= 30) pts += 2;
    if ((BUN ?? 0) >= 20) pts += 2;
    if ((SaO2 ?? 100) < 90) pts += 1;
    if (confusion) pts += 2;

    const notes:string[] = [];
    if (pts >= 5) notes.push("high risk (surrogate of PSI IV–V)");
    else if (pts >= 3) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "psi_lite", label: "PSI-lite (surrogate)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- NUTRIC (modified; no IL-6) ----------
   Items: age, APACHE II, SOFA, comorbidities, days from hospital to ICU, low intake/weight loss (optional boolean marker)
   0–9 points. ≥5 = high nutritional risk.
*/
register({
  id: "nutric_modified",
  label: "NUTRIC (modified)",
  tags: ["icu_scores", "nutrition"],
  inputs: [
    { key: "age", required: true },                       // 50–<75:1, ≥75:2
    { key: "apache2", required: true },                   // 15–19:0, 20–27:1, 28–32:2, ≥33:3
    { key: "sofa_total", required: true },                // 0–5:0, 6–9:1, 10–14:2 ≥15:3
    { key: "comorbidities_ge_1", required: true },        // +1
    { key: "days_from_hosp_to_icu", required: true },     // 0:0, 1–2:1, ≥3:2
    { key: "low_intake_or_weight_loss" },                 // optional +1
  ],
  run: (x) => {
    let pts = 0;
    // Age
    if (x.age >= 75) pts += 2; else if (x.age >= 50) pts += 1;
    // APACHE II
    const ap = x.apache2;
    if (ap >= 33) pts += 3; else if (ap >= 28) pts += 2; else if (ap >= 20) pts += 1;
    // SOFA
    const sf = x.sofa_total;
    if (sf >= 15) pts += 3; else if (sf >= 10) pts += 2; else if (sf >= 6) pts += 1;
    // Comorbidities
    if (x.comorbidities_ge_1) pts += 1;
    // Days to ICU
    const d = x.days_from_hosp_to_icu;
    if (d >= 3) pts += 2; else if (d >= 1) pts += 1;
    // Optional intake/weight loss marker
    if (x.low_intake_or_weight_loss) pts += 1;

    const notes:string[] = [];
    if (pts >= 5) notes.push("high nutritional risk (≥5)");
    else notes.push("lower nutritional risk");
    return { id: "nutric_modified", label: "NUTRIC (modified)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- Sgarbossa (STEMI in LBBB) ----------
   Concordant STE ≥1mm = 5; Concordant STD V1–V3 ≥1mm = 3; Excessively discordant STE ≥5mm = 2
   ≥3 strongly suggests MI.
*/
register({
  id: "sgarbossa",
  label: "Sgarbossa criteria",
  tags: ["cardiology", "ecg"],
  inputs: [
    { key: "concordant_ST_elevation_ge_1mm", required: true }, // boolean
    { key: "concordant_ST_depression_V1toV3_ge_1mm", required: true }, // boolean
    { key: "discordant_ST_elevation_ge_5mm", required: true }, // boolean
  ],
  run: (x) => {
    const pts =
      (x.concordant_ST_elevation_ge_1mm ? 5 : 0) +
      (x.concordant_ST_depression_V1toV3_ge_1mm ? 3 : 0) +
      (x.discordant_ST_elevation_ge_5mm ? 2 : 0);
    const notes:string[] = [];
    if (pts >= 3) notes.push("positive Sgarbossa (suggests MI in LBBB)");
    else notes.push("negative/indeterminate");
    return { id: "sgarbossa", label: "Sgarbossa criteria", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- qCSI (quick COVID-19 Severity Index) ----------
   Uses respiratory rate, oxygen saturation, and O2 flow to score 0–12.
   This is a simplified mapping for triage context.
*/
register({
  id: "qcsi",
  label: "qCSI (simplified)",
  tags: ["pulmonary", "infectious_disease"],
  inputs: [
    { key: "RRr", required: true },         // breaths/min
    { key: "SaO2", required: true },        // %
    { key: "oxygen_flow_L_min", required: true }, // L/min via NC
  ],
  run: ({ RRr, SaO2, oxygen_flow_L_min }) => {
    // RR points
    let rrp = 0;
    if (RRr >= 28) rrp = 2;
    else if (RRr >= 23) rrp = 1;

    // SaO2 points
    let sp = 0;
    if (SaO2 < 88) sp = 5;
    else if (SaO2 < 92) sp = 2;
    else if (SaO2 < 95) sp = 1;

    // O2 flow points
    let op = 0;
    if (oxygen_flow_L_min >= 4) op = 5;
    else if (oxygen_flow_L_min >= 2) op = 2;
    else if (oxygen_flow_L_min > 0) op = 1;

    const pts = rrp + sp + op;
    const notes:string[] = [];
    if (pts >= 9) notes.push("high risk");
    else if (pts >= 4) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "qcsi", label: "qCSI (simplified)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- GOLD COPD stage by FEV1 %pred ---------- */
register({
  id: "gold_copd_stage",
  label: "GOLD COPD stage (spirometry)",
  tags: ["pulmonary"],
  inputs: [
    { key: "fev1_percent_predicted", required: true }, // %
    { key: "post_bronchodilator", required: false },   // boolean, optional
  ],
  run: ({ fev1_percent_predicted, post_bronchodilator }) => {
    if (fev1_percent_predicted == null) return null;
    const f = fev1_percent_predicted;
    let stage = "Unspecified";
    if (f >= 80) stage = "GOLD 1 (mild)";
    else if (f >= 50) stage = "GOLD 2 (moderate)";
    else if (f >= 30) stage = "GOLD 3 (severe)";
    else stage = "GOLD 4 (very severe)";
    const notes:string[] = [];
    if (post_bronchodilator === false) notes.push("use post-bronchodilator values for staging");
    return { id: "gold_copd_stage", label: "GOLD COPD stage (spirometry)", value: f, unit: "% predicted", precision: 0, notes: [stage, ...notes] };
  },
});

/* ---------- ABCD2 (TIA early stroke risk) ---------- */
register({
  id: "abcd2",
  label: "ABCD2 (TIA risk)",
  tags: ["neurology", "risk"],
  inputs: [
    { key: "age_ge_60", required: true },         // +1
    { key: "bp_ge_140_90", required: true },      // +1
    { key: "unilateral_weakness", required: true }, // +2
    { key: "speech_disturb_no_weakness", required: true }, // +1
    { key: "duration_ge_60min", required: true }, // +2
    { key: "duration_10to59min", required: true }, // +1
    { key: "diabetes", required: true },          // +1
  ],
  run: (x) => {
    let pts = 0;
    pts += x.age_ge_60 ? 1 : 0;
    pts += x.bp_ge_140_90 ? 1 : 0;
    pts += x.unilateral_weakness ? 2 : 0;
    pts += (!x.unilateral_weakness && x.speech_disturb_no_weakness) ? 1 : 0;
    pts += x.duration_ge_60min ? 2 : (x.duration_10to59min ? 1 : 0);
    pts += x.diabetes ? 1 : 0;
    const notes:string[] = [];
    if (pts >= 6) notes.push("high risk (≥6)");
    else if (pts >= 4) notes.push("moderate risk (4–5)");
    else notes.push("low risk (≤3)");
    return { id: "abcd2", label: "ABCD2 (TIA risk)", value: pts, unit: "points", precision: 0, notes };
  },
});


// ===================== MED-EXT4 (APPEND-ONLY) =====================
// Additional calculator registrations appended for MED-EXT4.

/* ---------- Glasgow-Blatchford Score (GBS – full) ----------
   Bands approximate the classic tool.
   Notes: This is a programmatic mapping; clinical use requires local policy.
*/
register({
  id: "gbs_full",
  label: "Glasgow-Blatchford (full)",
  tags: ["gastroenterology", "risk"],
  inputs: [
    { key: "BUN", required: true },             // mg/dL
    { key: "hemoglobin", required: true },      // g/dL
    { key: "sex", required: true },             // "M" | "F"
    { key: "SBP", required: true },             // mmHg
    { key: "HR", required: true },              // bpm
    { key: "melena", required: true },          // boolean
    { key: "syncope", required: true },         // boolean
    { key: "hepatic_disease", required: true }, // boolean
    { key: "cardiac_failure", required: true }, // boolean
  ],
  run: (x) => {
    let pts = 0;
    // BUN (mg/dL) → coarse mapping of mmol/L bands
    pts += x.BUN >= 28 ? 6 : x.BUN >= 22 ? 4 : x.BUN >= 18 ? 2 : x.BUN >= 15 ? 1 : 0;
    // Hb (sex-specific)
    if (x.sex === "M") pts += x.hemoglobin < 10 ? 6 : x.hemoglobin < 12 ? 3 : x.hemoglobin < 13 ? 1 : 0;
    else               pts += x.hemoglobin < 10 ? 6 : x.hemoglobin < 11 ? 3 : x.hemoglobin < 12 ? 1 : 0;
    // SBP
    pts += x.SBP < 90 ? 3 : x.SBP < 100 ? 2 : x.SBP < 110 ? 1 : 0;
    // HR
    pts += x.HR >= 100 ? 1 : 0;
    // Clinical features
    pts += x.melena ? 1 : 0;
    pts += x.syncope ? 2 : 0;
    pts += x.hepatic_disease ? 2 : 0;
    pts += x.cardiac_failure ? 2 : 0;

    const notes: string[] = [];
    if (pts === 0) notes.push("very low risk; consider outpatient if stable");
    else if (pts <= 3) notes.push("low–intermediate risk");
    else notes.push("intermediate–high risk");
    return { id: "gbs_full", label: "Glasgow-Blatchford (full)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- Rockall (pre-endoscopy) ----------
   Age, shock (SBP/HR), comorbidity.
*/
register({
  id: "rockall_pre",
  label: "Rockall (pre-endoscopy)",
  tags: ["gastroenterology", "risk"],
  inputs: [
    { key: "age", required: true },               // years
    { key: "SBP", required: true },               // mmHg
    { key: "HR", required: true },                // bpm
    { key: "comorbidity_band", required: true },  // "none" | "moderate" | "severe"
  ],
  run: ({ age, SBP, HR, comorbidity_band }) => {
    // Age
    const pAge = age >= 80 ? 2 : age >= 60 ? 1 : 0;
    // Shock category
    let pShock = 0;
    const tachy = HR >= 100;
    if (SBP < 100) pShock = 2; else if (tachy) pShock = 1;
    // Comorbidity
    const pCom = comorbidity_band === "severe" ? 2 : comorbidity_band === "moderate" ? 1 : 0;

    const total = pAge + pShock + pCom;
    const notes: string[] = [];
    if (total >= 4) notes.push("higher pre-endoscopy risk");
    else notes.push("lower pre-endoscopy risk");
    return { id: "rockall_pre", label: "Rockall (pre-endoscopy)", value: total, unit: "points", precision: 0, notes };
  },
});

/* ---------- Rockall (post-endoscopy) ----------
   Adds diagnosis category and stigmata of recent hemorrhage.
*/
register({
  id: "rockall_post",
  label: "Rockall (post-endoscopy)",
  tags: ["gastroenterology", "risk"],
  inputs: [
    { key: "rockall_pre", required: true },              // from above (points 0–7)
    { key: "diagnosis_band", required: true },           // "malignancy" | "nonmalignant_UGIB" | "mallory_weiss"
    { key: "stigmata_band", required: true },            // "none" | "blood_or_visible_vessel_or_clot" | "adherent_clot"
  ],
  run: ({ rockall_pre, diagnosis_band, stigmata_band }) => {
    if (rockall_pre == null) return null;
    const base = rockall_pre;

    const pDx = diagnosis_band === "malignancy" ? 2 :
                diagnosis_band === "nonmalignant_UGIB" ? 1 : 0;

    const pStig = stigmata_band === "blood_or_visible_vessel_or_clot" ? 2 :
                  stigmata_band === "adherent_clot" ? 1 : 0;

    const total = base + pDx + pStig;
    const notes: string[] = [];
    if (total >= 6) notes.push("high post-endoscopy risk");
    else if (total >= 3) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "rockall_post", label: "Rockall (post-endoscopy)", value: total, unit: "points", precision: 0, notes };
  },
});

/* ---------- HEART Pathway ----------
   Uses HEART score + serial troponin flag (negative at 0/3h) for early discharge eligibility.
   Inputs require the existing 'heart_score' value plus 'troponin_negative_serials' boolean.
*/
register({
  id: "heart_pathway",
  label: "HEART Pathway",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "heart_score", required: true },           // numeric total from existing calculator
    { key: "troponin_negative_serials", required: true }, // boolean (0/3h both negative)
  ],
  run: ({ heart_score, troponin_negative_serials }) => {
    if (heart_score == null) return null;
    const lowHeart = heart_score <= 3;
    const eligible = lowHeart && !!troponin_negative_serials;
    const notes: string[] = [];
    notes.push(eligible ? "low risk; eligible for early discharge pathway (per HEART Pathway)" :
                          "not eligible for early discharge pathway");
    return { id: "heart_pathway", label: "HEART Pathway", value: eligible ? 1 : 0, unit: "flag", precision: 0, notes: [`HEART=${heart_score}`, troponin_negative_serials ? "serial troponins negative" : "serial troponins not negative"] };
  },
});

/* ---------- NEXUS C-spine ----------
   All 5 criteria must be negative (none present) to clear without imaging.
*/
register({
  id: "nexus_cspine",
  label: "NEXUS C-spine",
  tags: ["trauma", "risk"],
  inputs: [
    { key: "midline_cspine_tenderness", required: true }, // boolean
    { key: "focal_neuro_deficit", required: true },       // boolean
    { key: "altered_mental_status", required: true },     // boolean
    { key: "intoxication", required: true },              // boolean
    { key: "distracting_injury", required: true },        // boolean
  ],
  run: (x) => {
    const anyPositive = x.midline_cspine_tenderness || x.focal_neuro_deficit || x.altered_mental_status || x.intoxication || x.distracting_injury;
    const notes: string[] = [];
    notes.push(anyPositive ? "NEXUS positive → imaging recommended" : "NEXUS negative → may clear clinically");
    return { id: "nexus_cspine", label: "NEXUS C-spine", value: anyPositive ? 1 : 0, unit: "flag", precision: 0, notes };
  },
});

/* ---------- Canadian CT Head Rule (CCHR) ----------
   Adult minor head injury; high-risk & medium-risk features.
   This is a programmatic mapping; local imaging policy applies.
*/
register({
  id: "cchr",
  label: "Canadian CT Head Rule",
  tags: ["trauma", "risk", "neurology"],
  inputs: [
    // High-risk
    { key: "gcs_lt_15_at_2h", required: true },
    { key: "open_or_depressed_skull_fracture", required: true },
    { key: "signs_of_basilar_skull_fracture", required: true }, // raccoon eyes, battle's sign, CSF leak, hemotympanum
    { key: "vomiting_ge_2", required: true },
    { key: "age_ge_65", required: true },
    // Medium-risk
    { key: "amnesia_ge_30min", required: true },
    { key: "dangerous_mechanism", required: true }, // pedestrian struck, ejected, fall >3ft/5 stairs
  ],
  run: (x) => {
    const high = x.gcs_lt_15_at_2h || x.open_or_depressed_skull_fracture || x.signs_of_basilar_skull_fracture || x.vomiting_ge_2 || x.age_ge_65;
    const medium = x.amnesia_ge_30min || x.dangerous_mechanism;
    const notes: string[] = [];
    if (high) notes.push("CT indicated (high-risk CCHR feature)");
    else if (medium) notes.push("CT recommended (medium-risk CCHR feature)");
    else notes.push("CT not routinely indicated by CCHR");
    return { id: "cchr", label: "Canadian CT Head Rule", value: high ? 2 : medium ? 1 : 0, unit: "tier", precision: 0, notes };
  },
});

/* ---------- Wells DVT + D-dimer gate ----------
   Wraps existing wells_dvt score with age-adjusted D-dimer logic.
   If Wells low (≤0) or moderate (1–2) AND age-adjusted D-dimer negative → DVT ruled out.
   Age-adjusted threshold (FEU ng/mL): age*10 if age ≥50; else 500.
*/
register({
  id: "wells_dvt_ddimer_gate",
  label: "Wells DVT + D-dimer gate",
  tags: ["vascular", "risk"],
  inputs: [
    { key: "wells_dvt", required: true },      // numeric from existing calc
    { key: "age", required: true },            // years
    { key: "ddimer_feu_ng_ml", required: true } // ng/mL FEU
  ],
  run: ({ wells_dvt, age, ddimer_feu_ng_ml }) => {
    if ([wells_dvt, age, ddimer_feu_ng_ml].some(v => v == null)) return null;
    const threshold = age >= 50 ? age * 10 : 500;
    const dd_neg = ddimer_feu_ng_ml < threshold;
    const wellsLowOrMod = wells_dvt <= 2; // ≤0 low, 1–2 moderate
    const ruledOut = wellsLowOrMod && dd_neg;
    const notes: string[] = [];
    notes.push(`age-adjusted threshold: ${Math.round(threshold)} ng/mL`);
    notes.push(dd_neg ? "D-dimer negative (age-adjusted)" : "D-dimer positive (age-adjusted)");
    notes.push(wellsLowOrMod ? "pretest low/moderate" : "pretest high");
    notes.push(ruledOut ? "DVT ruled out without imaging (gate satisfied)" : "Imaging/ultrasound indicated (gate not satisfied)");
    return { id: "wells_dvt_ddimer_gate", label: "Wells DVT + D-dimer gate", value: ruledOut ? 1 : 0, unit: "flag", precision: 0, notes };
  },
});
// ===================== MED-EXT3 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* ---------- qSOFA (full) ---------- */
register({
  id: "qsofa_full",
  label: "qSOFA (full)",
  tags: ["icu_scores", "sepsis"],
  inputs: [
    { key: "SBP", required: true },                 // ≤100 → +1
    { key: "RRr", required: true },                 // ≥22 → +1
    { key: "altered_mentation", required: true },   // boolean → +1
  ],
  run: ({ SBP, RRr, altered_mentation }) => {
    const pts =
      ((SBP ?? 999) <= 100 ? 1 : 0) +
      ((RRr ?? 0) >= 22 ? 1 : 0) +
      (altered_mentation ? 1 : 0);
    const notes: string[] = [];
    if (pts >= 2) notes.push("high risk (qSOFA ≥2)");
    else notes.push("lower risk (qSOFA 0–1)");
    return { id: "qsofa_full", label: "qSOFA (full)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- NEWS2 (Scale 1; add 2 points if on O2) ----------
   RR, SpO2 (Scale 1), Temp, SBP, HR, Consciousness (AVPU), supplemental O2.
*/
register({
  id: "news2",
  label: "NEWS2",
  tags: ["early_warning", "icu_scores"],
  inputs: [
    { key: "RRr", required: true },             // breaths/min
    { key: "SaO2", required: true },            // %
    { key: "on_o2", required: true },           // boolean
    { key: "temp_c", required: true },          // °C
    { key: "SBP", required: true },             // mmHg
    { key: "HR", required: true },              // bpm
    { key: "conscious_level", required: true }, // "A" | "V" | "P" | "U"
  ],
  run: ({ RRr, SaO2, on_o2, temp_c, SBP, HR, conscious_level }) => {
    const pRR = RRr <= 8 ? 3 : RRr <= 11 ? 1 : RRr <= 20 ? 0 : RRr <= 24 ? 2 : 3;
    const pO2 = SaO2 < 86 ? 3 : SaO2 <= 90 ? 2 : SaO2 <= 92 ? 1 : SaO2 <= 94 ? 1 : SaO2 <= 96 ? 0 : 0;
    const pT  = temp_c < 35 ? 3 : temp_c <= 36 ? 1 : temp_c <= 38 ? 0 : temp_c <= 39 ? 1 : 2;
    const pBP = SBP <= 90 ? 3 : SBP <= 100 ? 2 : SBP <= 110 ? 1 : SBP <= 219 ? 0 : 3;
    const pHR = HR <= 40 ? 3 : HR <= 50 ? 1 : HR <= 90 ? 0 : HR <= 110 ? 1 : HR <= 130 ? 2 : 3;
    const pC  = (conscious_level && conscious_level !== "A") ? 3 : 0;
    const addO2 = on_o2 ? 2 : 0;
    const total = pRR + pO2 + pT + pBP + pHR + pC + addO2;
    const notes: string[] = [];
    if (total >= 7) notes.push("high risk (≥7)");
    else if (total >= 5) notes.push("urgent review (5–6)");
    else if (total >= 1) notes.push("low–moderate (1–4)");
    else notes.push("low (0)");
    return { id: "news2", label: "NEWS2", value: total, unit: "points", precision: 0, notes };
  },
});

/* ---------- HEART score (chest pain) ----------
   Inputs are binned/categorical to avoid free-text NLP:
   history_score: 0/1/2 (slightly/moderately/highly suspicious)
   ecg_score: 0/1/2 (normal/nonspecific/ST-deviation)
   age_band: "≤45" | "46–64" | "≥65"  → 0/1/2
   risk_factors_count: 0 | 1–2 | ≥3_or_known_CAD → 0/1/2 (provide as enum)
   troponin_band: "normal" | "1-3x" | ">3x" → 0/1/2
*/
register({
  id: "heart_score",
  label: "HEART score",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "history_score", required: true },              // 0|1|2
    { key: "ecg_score", required: true },                  // 0|1|2
    { key: "age_band", required: true },                   // "≤45"|"46–64"|"≥65"
    { key: "risk_factor_band", required: true },           // "0"|"1-2"|"≥3_or_known_CAD"
    { key: "troponin_band", required: true },              // "normal"|"1-3x"|">3x"
  ],
  run: ({ history_score, ecg_score, age_band, risk_factor_band, troponin_band }) => {
    const a = (age_band === "≥65" ? 2 : age_band === "46–64" ? 1 : 0);
    const r = (risk_factor_band === "≥3_or_known_CAD" ? 2 : risk_factor_band === "1-2" ? 1 : 0);
    const t = (troponin_band === ">3x" ? 2 : troponin_band === "1-3x" ? 1 : 0);
    const total = (history_score ?? 0) + (ecg_score ?? 0) + a + r + t;
    const notes: string[] = [];
    if (total >= 7) notes.push("high risk (≥7)");
    else if (total >= 4) notes.push("intermediate risk (4–6)");
    else notes.push("low risk (0–3)");
    return { id: "heart_score", label: "HEART score", value: total, unit: "points", precision: 0, notes };
  },
});

/* ---------- Glasgow-Blatchford Score (GBS-lite surrogate) ----------
   Simplified triage surrogate (not a replacement for full GBS).
   BUN, Hb (sex-banded), SBP, HR, melena, syncope, hepatic disease, cardiac failure.
*/
register({
  id: "gbs_lite",
  label: "Glasgow-Blatchford (lite)",
  tags: ["gastroenterology", "risk"],
  inputs: [
    { key: "BUN", required: true },                        // mg/dL
    { key: "hemoglobin", required: true },                 // g/dL
    { key: "sex", required: true },                        // "M"|"F"
    { key: "SBP", required: true },                        // mmHg
    { key: "HR", required: true },                         // bpm
    { key: "melena", required: true },                     // boolean
    { key: "syncope", required: true },                    // boolean
    { key: "hepatic_disease", required: true },            // boolean
    { key: "cardiac_failure", required: true },            // boolean
  ],
  run: (x) => {
    let pts = 0;
    // Coarse BUN bands
    pts += x.BUN >= 28 ? 3 : x.BUN >= 22 ? 2 : x.BUN >= 18 ? 1 : 0;
    // Hb (sex-specific)
    if (x.sex === "M") pts += x.hemoglobin < 10 ? 3 : x.hemoglobin < 12 ? 1 : 0;
    else               pts += x.hemoglobin < 10 ? 3 : x.hemoglobin < 11 ? 1 : 0;
    // SBP
    pts += x.SBP < 90 ? 3 : x.SBP < 100 ? 2 : x.SBP < 110 ? 1 : 0;
    // HR tachy
    pts += x.HR >= 100 ? 1 : 0;
    // Clinical features
    pts += x.melena ? 1 : 0;
    pts += x.syncope ? 2 : 0;
    pts += x.hepatic_disease ? 2 : 0;
    pts += x.cardiac_failure ? 2 : 0;

    const notes: string[] = [];
    if (pts === 0) notes.push("very low risk; consider outpatient if stable");
    else if (pts <= 3) notes.push("low–intermediate risk");
    else notes.push("intermediate–high risk");
    return { id: "gbs_lite", label: "Glasgow-Blatchford (lite)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- Hestia criteria (PE outpatient eligibility) ----------
   If ANY criterion is true → NOT eligible (flag = 1).
*/
register({
  id: "hestia_pe",
  label: "Hestia criteria (PE outpatient)",
  tags: ["pulmonary", "risk"],
  inputs: [
    { key: "hemodynamic_instability", required: true },
    { key: "need_thrombolysis_or_embolectomy", required: true },
    { key: "active_bleeding_or_high_risk", required: true },
    { key: "severe_renal_or_liver_failure", required: true },
    { key: "pregnancy", required: true },
    { key: "social_care_inadequate", required: true },
    { key: "need_opioids_iv", required: true },
    { key: "oxygen_required_gt_24h", required: true },
    { key: "contraindication_anticoag", required: true },
  ],
  run: (x) => {
    const positives = Object.entries(x).filter(([_, v]) => !!v).map(([k]) => k);
    const ineligible = positives.length > 0;
    const notes: string[] = [];
    notes.push(ineligible ? "NOT eligible for outpatient PE management" : "Eligible for outpatient pathway (if low risk otherwise)");
    if (ineligible) notes.push(`Triggers: ${positives.join(", ")}`);
    return { id: "hestia_pe", label: "Hestia criteria (PE outpatient)", value: ineligible ? 1 : 0, unit: "flag", precision: 0, notes };
  },
});

/* ---------- BODE index (COPD) ----------
   BMI (kg/m²) → 0 if >21 else 1
   FEV1 %pred → 0: ≥65, 1: 50–64, 2: 36–49, 3: ≤35
   mMRC dyspnea → 0:0–1, 1:2, 2:3, 3:4
   6-min walk distance (m) → 0: ≥350, 1: 250–349, 2: 150–249, 3: ≤149
   Total 0–10 (higher worse).
*/
register({
  id: "bode_index",
  label: "BODE index (COPD)",
  tags: ["pulmonary"],
  inputs: [
    { key: "BMI", required: true },                          // kg/m²
    { key: "fev1_percent_predicted", required: true },       // %
    { key: "mmrc_dyspnea", required: true },                 // 0–4
    { key: "six_minute_walk_m", required: true },            // meters
  ],
  run: ({ BMI, fev1_percent_predicted, mmrc_dyspnea, six_minute_walk_m }) => {
    if ([BMI, fev1_percent_predicted, mmrc_dyspnea, six_minute_walk_m].some(v => v == null)) return null;
    const pBMI = BMI > 21 ? 0 : 1;
    const f = fev1_percent_predicted;
    const pFEV1 = f >= 65 ? 0 : f >= 50 ? 1 : f >= 36 ? 2 : 3;
    const d = mmrc_dyspnea;
    const pDysp = d <= 1 ? 0 : d === 2 ? 1 : d === 3 ? 2 : 3;
    const w = six_minute_walk_m;
    const pWalk = w >= 350 ? 0 : w >= 250 ? 1 : w >= 150 ? 2 : 3;
    const total = pBMI + pFEV1 + pDysp + pWalk;
    return { id: "bode_index", label: "BODE index (COPD)", value: total, unit: "points", precision: 0, notes: [] };
  },
});

/* ---------- SOAR (pneumonia discharge/mortality risk) ----------
   S: SpO2 <92% (1), O: Orientation/Confusion (1), A: Age ≥65 (1), R: RR ≥30 (1)
*/
register({
  id: "soar_score",
  label: "SOAR score",
  tags: ["pulmonary", "infectious_disease", "risk"],
  inputs: [
    { key: "SaO2", required: true },           // %
    { key: "confusion", required: true },      // boolean
    { key: "age", required: true },            // years
    { key: "RRr", required: true },            // breaths/min
  ],
  run: ({ SaO2, confusion, age, RRr }) => {
    const pts = ((SaO2 ?? 100) < 92 ? 1 : 0) + (confusion ? 1 : 0) + ((age ?? 0) >= 65 ? 1 : 0) + ((RRr ?? 0) >= 30 ? 1 : 0);
    const notes: string[] = [];
    if (pts >= 3) notes.push("high risk");
    else if (pts === 2) notes.push("moderate risk");
    else notes.push("low risk");
    return { id: "soar_score", label: "SOAR score", value: pts, unit: "points", precision: 0, notes };
  },
});

// ===================== MED-EXT5 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* ---------- Canadian C-Spine Rule (CCR) ----------
   Logic (adult blunt trauma, GCS 15):
   - If ANY high-risk → image.
   - ELSE if ANY low-risk present → assess active rotation:
       • If can rotate 45° left/right → no imaging.
       • If cannot rotate → image.
   - ELSE (no low-risk) → image.
*/
register({
  id: "canadian_cspine_rule",
  label: "Canadian C-Spine Rule (CCR)",
  tags: ["trauma", "risk"],
  inputs: [
    // High-risk
    { key: "age_ge_65", required: true },
    { key: "dangerous_mechanism", required: true },          // ejected, high-speed MVC, rollover, axial load, etc.
    { key: "paresthesias_in_extremities", required: true },
    // Low-risk (safe assessment)
    { key: "simple_rear_end_mvc", required: true },
    { key: "sitting_in_ed", required: true },
    { key: "ambulatory_any_time", required: true },
    { key: "delayed_onset_neck_pain", required: true },
    { key: "no_midline_c_spine_tenderness", required: true },
    // Rotation exam
    { key: "can_rotate_45_left_and_right", required: true }  // boolean
  ],
  run: (x) => {
    const high = x.age_ge_65 || x.dangerous_mechanism || x.paresthesias_in_extremities;
    const anyLow =
      x.simple_rear_end_mvc || x.sitting_in_ed || x.ambulatory_any_time ||
      x.delayed_onset_neck_pain || x.no_midline_c_spine_tenderness;

    let image = false;
    let reason = "";

    if (high) { image = true; reason = "high-risk feature present"; }
    else if (!anyLow) { image = true; reason = "no low-risk factor to allow safe assessment"; }
    else {
      image = !x.can_rotate_45_left_and_right;
      reason = image ? "cannot rotate 45° left/right" : "low-risk + full rotation";
    }

    return {
      id: "canadian_cspine_rule",
      label: "Canadian C-Spine Rule (CCR)",
      value: image ? 1 : 0,
      unit: "flag",
      precision: 0,
      notes: [image ? "Imaging indicated" : "No imaging by CCR", reason]
    };
  },
});

/* ---------- PE Rule-out Pathway: PERC + Age-adjusted D-dimer ----------
   Usage:
   - Provide either 'pretest_band' ("low"|"intermediate"|"high") OR 'wells_pe' (points).
   - If PERC negative AND pretest low → rule out.
   - Else if pretest low/moderate and D-dimer < age-adjusted threshold → rule out.
   - Else not ruled out.
*/
register({
  id: "pe_ruleout_perc_ddimer",
  label: "PE rule-out (PERC + age-adjusted D-dimer)",
  tags: ["pulmonary", "risk"],
  inputs: [
    { key: "perc_negative", required: true },                  // boolean
    { key: "age", required: true },                            // years
    { key: "ddimer_feu_ng_ml", required: true },               // ng/mL FEU
    { key: "pretest_band" },                                   // "low"|"intermediate"|"high" (optional)
    { key: "wells_pe" }                                        // number (optional)
  ],
  run: ({ perc_negative, age, ddimer_feu_ng_ml, pretest_band, wells_pe }) => {
    if ([perc_negative, age, ddimer_feu_ng_ml].some(v => v == null)) return null;

    // Derive pretest if not provided
    let band = pretest_band;
    if (!band && typeof wells_pe === "number") {
      band = wells_pe <= 1 ? "low" : (wells_pe <= 6 ? "intermediate" : "high");
    }

    // Age-adjusted threshold (FEU ng/mL)
    const threshold = age >= 50 ? age * 10 : 500;
    const ddNeg = ddimer_feu_ng_ml < threshold;

    let ruledOut = false;
    let reason = "";

    if (perc_negative && band === "low") {
      ruledOut = true; reason = "PERC negative in low pretest probability";
    } else if ((band === "low" || band === "intermediate") && ddNeg) {
      ruledOut = true; reason = "D-dimer negative (age-adjusted) in low/intermediate pretest";
    } else {
      ruledOut = false; reason = "Pathway not satisfied";
    }

    const notes: string[] = [
      `age-adjusted D-dimer threshold: ${Math.round(threshold)} ng/mL`,
      ddNeg ? "D-dimer negative" : "D-dimer positive",
      band ? `pretest: ${band}` : "pretest: unspecified"
    ];
    notes.push(ruledOut ? "PE ruled out without imaging" : "Imaging/workup indicated");

    return {
      id: "pe_ruleout_perc_ddimer",
      label: "PE rule-out (PERC + age-adjusted D-dimer)",
      value: ruledOut ? 1 : 0,
      unit: "flag",
      precision: 0,
      notes
    };
  },
});

/* ---------- Ottawa Ankle Rule ----------
   X-ray indicated if: pain in malleolar zone AND (bony tenderness at posterior edge/tip of lateral OR medial malleolus)
   OR inability to bear weight (4 steps) immediately and in ED.
*/
register({
  id: "ottawa_ankle_rule",
  label: "Ottawa Ankle Rule",
  tags: ["trauma", "risk"],
  inputs: [
    { key: "pain_in_malleolar_zone", required: true },
    { key: "bony_tenderness_post_edge_tip_lateral_malleolus", required: true },
    { key: "bony_tenderness_post_edge_tip_medial_malleolus", required: true },
    { key: "inability_to_bear_weight_4_steps", required: true },
  ],
  run: (x) => {
    const boneTender =
      x.bony_tenderness_post_edge_tip_lateral_malleolus ||
      x.bony_tenderness_post_edge_tip_medial_malleolus;

    const image = (x.pain_in_malleolar_zone && (boneTender || x.inability_to_bear_weight_4_steps));
    return {
      id: "ottawa_ankle_rule",
      label: "Ottawa Ankle Rule",
      value: image ? 1 : 0,
      unit: "flag",
      precision: 0,
      notes: [image ? "Ankle X-ray indicated" : "No ankle X-ray by rule"]
    };
  },
});

/* ---------- Ottawa Knee Rule ----------
   X-ray indicated if ANY: age ≥55, isolated patellar tenderness, fibular head tenderness,
   cannot flex to 90°, or cannot bear weight (4 steps) immediately and in ED.
*/
register({
  id: "ottawa_knee_rule",
  label: "Ottawa Knee Rule",
  tags: ["trauma", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "isolated_patellar_tenderness", required: true },
    { key: "tenderness_head_of_fibula", required: true },
    { key: "cannot_flex_to_90", required: true },
    { key: "inability_to_bear_weight_4_steps", required: true },
  ],
  run: (x) => {
    const image = (x.age >= 55) ||
                  x.isolated_patellar_tenderness ||
                  x.tenderness_head_of_fibula ||
                  x.cannot_flex_to_90 ||
                  x.inability_to_bear_weight_4_steps;
    return {
      id: "ottawa_knee_rule",
      label: "Ottawa Knee Rule",
      value: image ? 1 : 0,
      unit: "flag",
      precision: 0,
      notes: [image ? "Knee X-ray indicated" : "No knee X-ray by rule"]
    };
  },
});

/* ---------- Simplified Geneva Score (PE) ----------
   Points mapping (sum):
   - Age >65 (1), Previous DVT/PE (3), Surgery/fracture <1 mo (2), Active malignancy (2),
     Unilateral lower limb pain (3), Hemoptysis (2),
     HR 75–94 (3) or ≥95 (5),
     Pain on deep venous palpation and unilateral edema (4).
   Bands: 0–3 low, 4–10 intermediate, ≥11 high.
*/
register({
  id: "simplified_geneva_pe",
  label: "Simplified Geneva (PE)",
  tags: ["pulmonary", "risk"],
  inputs: [
    { key: "age_gt_65", required: true },
    { key: "previous_dvt_pe", required: true },
    { key: "surgery_or_fracture_lt_1mo", required: true },
    { key: "active_malignancy", required: true },
    { key: "unilateral_lower_limb_pain", required: true },
    { key: "hemoptysis", required: true },
    { key: "HR", required: true }, // bpm
    { key: "pain_on_deep_venous_palpation_and_unilateral_edema", required: true },
  ],
  run: (x) => {
    let pts = 0;
    pts += x.age_gt_65 ? 1 : 0;
    pts += x.previous_dvt_pe ? 3 : 0;
    pts += x.surgery_or_fracture_lt_1mo ? 2 : 0;
    pts += x.active_malignancy ? 2 : 0;
    pts += x.unilateral_lower_limb_pain ? 3 : 0;
    pts += x.hemoptysis ? 2 : 0;
    pts += x.HR >= 95 ? 5 : (x.HR >= 75 ? 3 : 0);
    pts += x.pain_on_deep_venous_palpation_and_unilateral_edema ? 4 : 0;

    const notes: string[] = [];
    if (pts >= 11) notes.push("high probability");
    else if (pts >= 4) notes.push("intermediate probability");
    else notes.push("low probability");
    return { id: "simplified_geneva_pe", label: "Simplified Geneva (PE)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- SOFA total (sum of subscores) ----------
   Sums previously computed: sofa_resp, sofa_coag, sofa_liver, sofa_cardio, sofa_cns, sofa_renal.
   If any missing, they count as 0 (conservative).
*/
register({
  id: "sofa_total",
  label: "SOFA total",
  tags: ["icu_scores"],
  inputs: [
    { key: "sofa_resp" },
    { key: "sofa_coag" },
    { key: "sofa_liver" },
    { key: "sofa_cardio" },
    { key: "sofa_cns" },
    { key: "sofa_renal" },
  ],
  run: (x) => {
    const sum =
      (Number.isFinite(x.sofa_resp) ? x.sofa_resp : 0) +
      (Number.isFinite(x.sofa_coag) ? x.sofa_coag : 0) +
      (Number.isFinite(x.sofa_liver) ? x.sofa_liver : 0) +
      (Number.isFinite(x.sofa_cardio) ? x.sofa_cardio : 0) +
      (Number.isFinite(x.sofa_cns) ? x.sofa_cns : 0) +
      (Number.isFinite(x.sofa_renal) ? x.sofa_renal : 0);

    const notes: string[] = [];
    if (sum >= 11) notes.push("very high severity (SOFA ≥11)");
    else if (sum >= 6) notes.push("high severity (SOFA 6–10)");
    else notes.push("lower severity band (SOFA 0–5)");

    return { id: "sofa_total", label: "SOFA total", value: sum, unit: "points", precision: 0, notes };
  },
});

/* ---------- TBSA (Rule of Nines, adult) ----------
   Provide percent involvement per region (0–100). Typical full-region weights:
   Head 9, Each arm 9, Each leg 18, Anterior trunk 18, Posterior trunk 18, Perineum 1.
   We accept direct percent inputs to support partial burns.
*/
register({
  id: "tbsa_rule_of_nines_adult",
  label: "TBSA (Rule of Nines, adult)",
  tags: ["burns", "critical_care"],
  inputs: [
    { key: "head_pct", required: true },             // 0–9
    { key: "arm_left_pct", required: true },         // 0–9
    { key: "arm_right_pct", required: true },        // 0–9
    { key: "leg_left_pct", required: true },         // 0–18
    { key: "leg_right_pct", required: true },        // 0–18
    { key: "anterior_trunk_pct", required: true },   // 0–18
    { key: "posterior_trunk_pct", required: true },  // 0–18
    { key: "perineum_pct", required: true },         // 0–1
  ],
  run: (x) => {
    const vals = [
      x.head_pct, x.arm_left_pct, x.arm_right_pct, x.leg_left_pct, x.leg_right_pct,
      x.anterior_trunk_pct, x.posterior_trunk_pct, x.perineum_pct
    ];
    if (vals.some(v => v == null)) return null;
    const total = vals.reduce((a,b) => a + (Number(b)||0), 0);
    const capped = Math.max(0, Math.min(100, total));
    const notes: string[] = [];
    if (total !== capped) notes.push("capped to 100%");
    return { id: "tbsa_rule_of_nines_adult", label: "TBSA (Rule of Nines, adult)", value: capped, unit: "% body surface", precision: 0, notes };
  },
});

// ===================== MED-EXT6–8 (APPEND-ONLY) =====================

/* ---------- MED-EXT6 ---------- */
/** NIHSS-lite mapper: just sum motor, language, vision for demo */
register({
  id: "nihss_lite",
  label: "NIHSS (lite)",
  tags: ["neurology", "stroke"],
  inputs: [
    { key: "motor_score", required: true },   // 0–4
    { key: "language_score", required: true },// 0–3
    { key: "vision_score", required: true },  // 0–3
  ],
  run: (x) => {
    const total = (x.motor_score ?? 0) + (x.language_score ?? 0) + (x.vision_score ?? 0);
    const notes:string[] = [];
    if (total >= 15) notes.push("severe stroke");
    else if (total >= 5) notes.push("moderate stroke");
    else notes.push("minor stroke");
    return { id: "nihss_lite", label: "NIHSS (lite)", value: total, unit: "points", precision: 0, notes };
  },
});

/** Charlson Comorbidity Index (simplified bands) */
register({
  id: "charlson_index",
  label: "Charlson Comorbidity Index",
  tags: ["comorbidity", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "num_comorbidities", required: true },
  ],
  run: ({ age, num_comorbidities }) => {
    let pts = num_comorbidities ?? 0;
    if (age >= 50) pts += Math.floor((age - 40) / 10); // age weighting
    const notes:string[] = [];
    notes.push(pts >= 5 ? "high comorbidity burden" : "lower comorbidity burden");
    return { id: "charlson_index", label: "Charlson Index", value: pts, unit: "points", precision: 0, notes };
  },
});

/** CURB-65 disposition helper */
register({
  id: "curb65_dispo",
  label: "CURB-65 disposition",
  tags: ["pulmonary", "risk"],
  inputs: [{ key: "curb65", required: true }],
  run: ({ curb65 }) => {
    if (curb65 == null) return null;
    const notes:string[] = [];
    if (curb65 >= 3) notes.push("hospitalize, consider ICU");
    else if (curb65 === 2) notes.push("admit to ward");
    else notes.push("outpatient possible");
    return { id: "curb65_dispo", label: "CURB-65 disposition", value: curb65, unit: "points", precision: 0, notes };
  },
});

/** Vancomycin AUC flag (no dosing) */
register({
  id: "vanco_auc_flag",
  label: "Vancomycin AUC flag",
  tags: ["id", "pharmacology"],
  inputs: [{ key: "auc_mcg_hr_ml", required: true }],
  run: ({ auc_mcg_hr_ml }) => {
    if (auc_mcg_hr_ml == null) return null;
    const notes:string[] = [];
    if (auc_mcg_hr_ml > 600) notes.push("AUC >600: toxicity risk");
    else if (auc_mcg_hr_ml < 400) notes.push("AUC <400: underexposure");
    else notes.push("AUC in target range (400–600)");
    return { id: "vanco_auc_flag", label: "Vancomycin AUC flag", value: auc_mcg_hr_ml, unit: "mg·h/L", precision: 0, notes };
  },
});

/** Fractional excretion uric acid (FEUA) */
register({
  id: "feua",
  label: "FEUA",
  tags: ["renal", "metabolic"],
  inputs: [
    { key: "urine_uric", required: true },
    { key: "plasma_uric", required: true },
    { key: "urine_creatinine", required: true },
    { key: "plasma_creatinine", required: true },
  ],
  run: (x) => {
    const feua = (x.urine_uric * x.plasma_creatinine) / (x.plasma_uric * x.urine_creatinine) * 100;
    const notes:string[] = [];
    notes.push(feua > 10 ? "suggests uricosuric state" : "normal/low");
    return { id: "feua", label: "FEUA", value: feua, unit: "%", precision: 1, notes };
  },
});

/** Hypercalcemia flag */
register({
  id: "hypercalcemia_flag",
  label: "Hypercalcemia flag",
  tags: ["electrolytes"],
  inputs: [{ key: "calcium", required: true }],
  run: ({ calcium }) => {
    if (calcium == null) return null;
    const notes:string[] = [];
    if (calcium >= 14) notes.push("severe hypercalcemia");
    else if (calcium >= 12) notes.push("moderate hypercalcemia");
    else if (calcium > 10.5) notes.push("mild hypercalcemia");
    else notes.push("normal");
    return { id: "hypercalcemia_flag", label: "Hypercalcemia flag", value: calcium, unit: "mg/dL", precision: 1, notes };
  },
});

/* ---------- MED-EXT7 ---------- */
/** Canadian CT Head Rule (minor, pediatric variant) */
register({
  id: "canadian_ct_head_minor_peds",
  label: "Canadian CT Head (peds)",
  tags: ["trauma", "pediatrics"],
  inputs: [
    { key: "gcs", required: true },
    { key: "suspected_skull_fracture", required: true },
    { key: "worsening_headache", required: true },
    { key: "vomiting", required: true },
    { key: "amnesia", required: true },
    { key: "dangerous_mechanism", required: true },
  ],
  run: (x) => {
    const high = x.gcs < 15 || x.suspected_skull_fracture;
    const medium = x.worsening_headache || x.vomiting || x.amnesia || x.dangerous_mechanism;
    const notes:string[] = [];
    if (high) notes.push("CT recommended (high risk)");
    else if (medium) notes.push("consider CT (medium risk)");
    else notes.push("CT not required");
    return { id: "canadian_ct_head_minor_peds", label: "Canadian CT Head (peds)", value: high?2:medium?1:0, unit: "tier", precision: 0, notes };
  },
});

/** PECARN pediatric head trauma rule (simplified) */
register({
  id: "pecarn_head_child",
  label: "PECARN pediatric head trauma",
  tags: ["trauma", "pediatrics"],
  inputs: [
    { key: "age_lt_2", required: true },
    { key: "gcs", required: true },
    { key: "altered_mental_status", required: true },
    { key: "palpable_skull_fracture", required: true },
    { key: "scalp_hematoma", required: true },
    { key: "severe_mechanism", required: true },
    { key: "not_acting_normally", required: true },
  ],
  run: (x) => {
    const high = x.gcs < 15 || x.altered_mental_status || x.palpable_skull_fracture;
    const medium = x.scalp_hematoma || x.severe_mechanism || x.not_acting_normally;
    const notes:string[] = [];
    if (high) notes.push("CT indicated (high risk)");
    else if (medium) notes.push("CT vs obs (intermediate)");
    else notes.push("CT not indicated");
    return { id: "pecarn_head_child", label: "PECARN pediatric head", value: high?2:medium?1:0, unit: "tier", precision: 0, notes };
  },
});

/** Ottawa SAH Rule */
register({
  id: "ottawa_sah_rule",
  label: "Ottawa SAH Rule",
  tags: ["neurology", "risk"],
  inputs: [
    { key: "age_ge_40", required: true },
    { key: "neck_pain_stiffness", required: true },
    { key: "witnessed_loc", required: true },
    { key: "exertional_onset", required: true },
    { key: "thunderclap_instant", required: true },
    { key: "limited_neck_flexion", required: true },
  ],
  run: (x) => {
    const any = x.age_ge_40||x.neck_pain_stiffness||x.witnessed_loc||x.exertional_onset||x.thunderclap_instant||x.limited_neck_flexion;
    const notes:string[] = [];
    notes.push(any ? "rule positive: CT/LP required" : "rule negative: SAH very unlikely");
    return { id: "ottawa_sah_rule", label: "Ottawa SAH Rule", value: any?1:0, unit: "flag", precision: 0, notes };
  },
});

/** PESI simplified bands */
register({
  id: "pesi_simplified",
  label: "PESI (simplified bands)",
  tags: ["pulmonary", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "sex_male", required: true },
    { key: "cancer", required: true },
    { key: "chf", required: true },
    { key: "chronic_lung", required: true },
    { key: "HR", required: true },
    { key: "SBP", required: true },
    { key: "RRr", required: true },
    { key: "temp_c", required: true },
    { key: "SaO2", required: true },
    { key: "altered_mental_status", required: true },
  ],
  run: (x) => {
    let pts = x.age + (x.sex_male?10:0) + (x.cancer?30:0) + (x.chf?10:0) + (x.chronic_lung?10:0);
    pts += x.HR >=110?20:0;
    pts += x.SBP <100?30:0;
    pts += x.RRr >=30?20:0;
    pts += x.temp_c <36?20:0;
    pts += x.SaO2 <90?20:0;
    pts += x.altered_mental_status?60:0;
    const notes:string[] = [];
    if (pts >= 125) notes.push("very high risk");
    else if (pts >= 105) notes.push("high risk");
    else if (pts >= 85) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "pesi_simplified", label: "PESI (simplified)", value: pts, unit: "points", precision: 0, notes };
  },
});

/** HASI (hypoglycemia admission score, simplified) */
register({
  id: "hasi_score",
  label: "HASI score",
  tags: ["metabolic", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "gcs_lt_15", required: true },
    { key: "sepsis", required: true },
    { key: "needs_iv_dextrose", required: true },
  ],
  run: (x) => {
    let pts = 0;
    pts += x.age >= 65 ? 1 : 0;
    pts += x.gcs_lt_15 ? 1 : 0;
    pts += x.sepsis ? 1 : 0;
    pts += x.needs_iv_dextrose ? 1 : 0;
    const notes:string[] = [];
    if (pts >= 2) notes.push("admit");
    else notes.push("discharge possible");
    return { id: "hasi_score", label: "HASI score", value: pts, unit: "points", precision: 0, notes };
  },
});

/* ---------- MED-EXT8 ---------- */
/** APGAR score (newborn) */
register({
  id: "apgar_score",
  label: "APGAR score",
  tags: ["pediatrics", "obstetrics"],
  inputs: [
    { key: "appearance", required: true }, // 0–2
    { key: "pulse", required: true },      // 0–2
    { key: "grimace", required: true },    // 0–2
    { key: "activity", required: true },   // 0–2
    { key: "respiration", required: true },// 0–2
  ],
  run: (x) => {
    const total = x.appearance + x.pulse + x.grimace + x.activity + x.respiration;
    const notes:string[] = [];
    if (total >= 7) notes.push("normal (7–10)");
    else if (total >= 4) notes.push("moderately abnormal (4–6)");
    else notes.push("critically low (0–3)");
    return { id: "apgar_score", label: "APGAR score", value: total, unit: "points", precision: 0, notes };
  },
});

/** Bishop Score (labor induction) */
register({
  id: "bishop_score",
  label: "Bishop score",
  tags: ["obstetrics"],
  inputs: [
    { key: "dilation_cm", required: true }, // 0–3
    { key: "effacement_pct", required: true }, // 0–3
    { key: "station", required: true }, // -3–+2
    { key: "consistency", required: true }, // 0–2
    { key: "position", required: true }, // 0–2
  ],
  run: (x) => {
    const total = (x.dilation_cm ?? 0)+(x.effacement_pct ?? 0)+(x.station ?? 0)+(x.consistency ?? 0)+(x.position ?? 0);
    const notes:string[] = [];
    notes.push(total >= 8 ? "favorable cervix" : "unfavorable cervix");
    return { id: "bishop_score", label: "Bishop score", value: total, unit: "points", precision: 0, notes };
  },
});

/** Wells PE (full) */
register({
  id: "wells_pe",
  label: "Wells PE (full)",
  tags: ["pulmonary", "risk"],
  inputs: [
    { key: "clinical_signs_dvt", required: true },
    { key: "alt_dx_less_likely", required: true },
    { key: "hr_gt_100", required: true },
    { key: "immobilization_recent_surgery", required: true },
    { key: "prior_dvt_pe", required: true },
    { key: "hemoptysis", required: true },
    { key: "malignancy", required: true },
  ],
  run: (x) => {
    let pts = 0;
    pts += x.clinical_signs_dvt?3:0;
    pts += x.alt_dx_less_likely?3:0;
    pts += x.hr_gt_100?1.5:0;
    pts += x.immobilization_recent_surgery?1.5:0;
    pts += x.prior_dvt_pe?1.5:0;
    pts += x.hemoptysis?1:0;
    pts += x.malignancy?1:0;
    const notes:string[] = [];
    if (pts > 6) notes.push("high probability");
    else if (pts >= 2) notes.push("moderate probability");
    else notes.push("low probability");
    return { id: "wells_pe", label: "Wells PE (full)", value: pts, unit: "points", precision: 1, notes };
  },
});

/** Revised Cardiac Risk Index (RCRI) */
register({
  id: "rcri",
  label: "Revised Cardiac Risk Index",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "high_risk_surgery", required: true },
    { key: "ischemic_heart_disease", required: true },
    { key: "chf", required: true },
    { key: "cerebrovascular_disease", required: true },
    { key: "insulin_treatment", required: true },
    { key: "creatinine_gt_2", required: true },
  ],
  run: (x) => {
    let pts = 0;
    pts += x.high_risk_surgery?1:0;
    pts += x.ischemic_heart_disease?1:0;
    pts += x.chf?1:0;
    pts += x.cerebrovascular_disease?1:0;
    pts += x.insulin_treatment?1:0;
    pts += x.creatinine_gt_2?1:0;
    const notes:string[] = [];
    if (pts >= 3) notes.push("high risk");
    else if (pts >= 1) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "rcri", label: "RCRI", value: pts, unit: "points", precision: 0, notes };
  },
});

/** Framingham 10yr risk (lite surrogate) */
register({
  id: "framingham_risk_lite",
  label: "Framingham 10yr risk (lite)",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "sex_male", required: true },
    { key: "total_chol", required: true },
    { key: "hdl_chol", required: true },
    { key: "SBP", required: true },
    { key: "treated_bp", required: true },
    { key: "smoker", required: true },
    { key: "diabetes", required: true },
  ],
  run: (x) => {
    let score = (x.age/10) + (x.sex_male?3:0) + (x.total_chol/50) - (x.hdl_chol/15);
    score += (x.SBP/50) + (x.treated_bp?2:0) + (x.smoker?2:0) + (x.diabetes?2:0);
    const notes:string[] = [];
    if (score >= 25) notes.push("high risk");
    else if (score >= 15) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "framingham_risk_lite", label: "Framingham 10yr risk (lite)", value: score, unit: "%", precision: 0, notes };
  },
});

/** CHA₂DS₂-VASc v2 with sex category */
register({
  id: "cha2ds2_vasc2",
  label: "CHA₂DS₂-VASc v2",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "sex_female", required: true },
    { key: "hf", required: true },
    { key: "htn", required: true },
    { key: "stroke_tia_thromboembolism", required: true },
    { key: "vascular_disease", required: true },
    { key: "diabetes", required: true },
  ],
  run: (x) => {
    let pts = 0;
    if (x.age >= 75) pts += 2;
    else if (x.age >= 65) pts += 1;
    pts += x.sex_female ? 1 : 0;
    pts += x.hf ? 1 : 0;
    pts += x.htn ? 1 : 0;
    pts += x.stroke_tia_thromboembolism ? 2 : 0;
    pts += x.vascular_disease ? 1 : 0;
    pts += x.diabetes ? 1 : 0;
    const notes:string[] = [];
    if (pts >= 2) notes.push("anticoagulation recommended");
    else if (pts === 1) notes.push("consider anticoagulation");
    else notes.push("no anticoagulation needed");
    return { id: "cha2ds2_vasc2", label: "CHA₂DS₂-VASc v2", value: pts, unit: "points", precision: 0, notes };
  },
});
// ===================== MED-EXT9–11 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* =========================================================
   MED-EXT9 — Renal / Acid–Base Diagnostics & Toxicology
   ========================================================= */

/** Serum osmolality (calculated) = 2*Na + Glu/18 + BUN/2.8 (+ EtOH/3.7 optional) */
register({
  id: "serum_osm_calc",
  label: "Serum osmolality (calculated)",
  tags: ["electrolytes", "toxicology"],
  inputs: [
    { key: "Na", required: true },          // mmol/L
    { key: "glucose", required: true },     // mg/dL
    { key: "BUN", required: true },         // mg/dL
    { key: "ethanol_mg_dl" },               // mg/dL optional
  ],
  run: ({ Na, glucose, BUN, ethanol_mg_dl }) => {
    if ([Na, glucose, BUN].some(v => v == null)) return null;
    const ethanolTerm = ethanol_mg_dl ? (ethanol_mg_dl / 3.7) : 0;
    const osm = 2 * Na + glucose / 18 + BUN / 2.8 + ethanolTerm;
    return { id: "serum_osm_calc", label: "Serum osmolality (calculated)", value: osm, unit: "mOsm/kg", precision: 0, notes: [] };
  },
});

/** Osmolar gap = measured − calculated; flags for toxic alcohol concern (no therapy advice) */
register({
  id: "osmolar_gap",
  label: "Osmolar gap",
  tags: ["toxicology", "acid-base"],
  inputs: [
    { key: "measured_osm", required: true },      // mOsm/kg
    { key: "serum_osm_calc", required: true },    // from above
    { key: "anion_gap" },                         // optional
    { key: "HCO3" },                              // optional
    { key: "pH" },                                // optional
  ],
  run: ({ measured_osm, serum_osm_calc, anion_gap, HCO3, pH }) => {
    if ([measured_osm, serum_osm_calc].some(v => v == null)) return null;
    const gap = measured_osm - serum_osm_calc;
    const notes: string[] = [];
    if (gap > 20) notes.push("marked osm gap (>20)");
    else if (gap > 10) notes.push("elevated osm gap (10–20)");
    else notes.push("osm gap within reference");
    // Toxic alcohol consideration (non-directive)
    const hagma = (typeof anion_gap === "number" && anion_gap > 12) && (typeof HCO3 === "number" && HCO3 < 22);
    const acidemia = typeof pH === "number" ? pH < 7.30 : false;
    if (gap > 10 && (hagma || acidemia)) notes.push("consider toxic alcohol differential (ethylene glycol, methanol)");
    return { id: "osmolar_gap", label: "Osmolar gap", value: gap, unit: "mOsm/kg", precision: 0, notes };
  },
});

/** Albumin-corrected anion gap = AG + 2.5*(4 - albumin_g_dL) */
register({
  id: "anion_gap_albumin_corrected",
  label: "Anion gap (albumin-corrected)",
  tags: ["acid-base"],
  inputs: [
    { key: "anion_gap", required: true },
    { key: "albumin", required: true }, // g/dL
  ],
  run: ({ anion_gap, albumin }) => {
    if ([anion_gap, albumin].some(v => v == null)) return null;
    const corr = anion_gap + 2.5 * (4 - albumin);
    const notes: string[] = [];
    if (corr >= 20) notes.push("elevated corrected AG (≥20)");
    else if (corr > 12) notes.push("upper-normal to mildly elevated");
    else notes.push("normal");
    return { id: "anion_gap_albumin_corrected", label: "Anion gap (albumin-corrected)", value: corr, unit: "mmol/L", precision: 0, notes };
  },
});

/** Delta–delta interpreter (uses existing delta_gap + delta_ratio to emit a narrative) */
register({
  id: "delta_delta_interpret",
  label: "Delta–delta interpretation",
  tags: ["acid-base"],
  inputs: [
    { key: "delta_gap", required: true },
    { key: "delta_ratio", required: true },
  ],
  run: ({ delta_gap, delta_ratio }) => {
    if ([delta_gap, delta_ratio].some(v => v == null)) return null;
    const notes: string[] = [];
    // Delta mismatch
    if (Math.abs(delta_gap) >= 4) notes.push("Δ mismatch suggests mixed metabolic process");
    else notes.push("Δ match suggests single-process HAGMA");
    // Ratio narrative
    if (delta_ratio < 0.4) notes.push("non-AG acidosis concomitant likely");
    else if (delta_ratio > 2) notes.push("metabolic alkalosis or chronic respiratory acidosis likely");
    else notes.push("ratio consistent with isolated HAGMA");
    return { id: "delta_delta_interpret", label: "Delta–delta interpretation", value: 0, unit: "note", precision: 0, notes };
  },
});

/** Urine osmolal gap = measured Uosm − calculated Uosm (2*(UNa+UK) + Uurea/2.8 + Uglucose/18) */
register({
  id: "urine_osm_gap",
  label: "Urine osmolal gap",
  tags: ["renal", "acid-base"],
  inputs: [
    { key: "urine_osm_measured", required: true }, // mOsm/kg
    { key: "urine_Na", required: true },           // mmol/L
    { key: "urine_K", required: true },            // mmol/L
    { key: "urine_urea", required: true },         // mg/dL (BUN units)
    { key: "urine_glucose" },                      // mg/dL (optional)
  ],
  run: ({ urine_osm_measured, urine_Na, urine_K, urine_urea, urine_glucose }) => {
    if ([urine_osm_measured, urine_Na, urine_K, urine_urea].some(v => v == null)) return null;
    const ucalc = 2 * (urine_Na + urine_K) + (urine_urea / 2.8) + ((urine_glucose ?? 0) / 18);
    const gap = urine_osm_measured - ucalc;
    const notes: string[] = [];
    if (gap > 100) notes.push("↑ urine NH4+ production likely (diarrhea/NH4Cl) — negative UAG context");
    else notes.push("low urine NH4+ production (consider RTA if NAGMA)");
    return { id: "urine_osm_gap", label: "Urine osmolal gap", value: gap, unit: "mOsm/kg", precision: 0, notes };
  },
});

/** Fractional excretion of bicarbonate (FEHCO3) = (U_HCO3 * S_Cr)/(S_HCO3 * U_Cr)*100 */
register({
  id: "fehco3",
  label: "FEHCO₃",
  tags: ["renal", "acid-base"],
  inputs: [
    { key: "urine_HCO3", required: true },        // mmol/L
    { key: "serum_HCO3", required: true },        // mmol/L
    { key: "urine_creatinine", required: true },  // mg/dL
    { key: "serum_creatinine", required: true },  // mg/dL
  ],
  run: (x) => {
    const fe = (x.urine_HCO3 * x.serum_creatinine) / (x.serum_HCO3 * x.urine_creatinine) * 100;
    const notes: string[] = [];
    if (fe > 15) notes.push("FEHCO₃ >15% (proximal RTA if on alkali load)");
    else notes.push("FEHCO₃ ≤15%");
    return { id: "fehco3", label: "FEHCO₃", value: fe, unit: "%", precision: 1, notes };
  },
});

/** Calcium–phosphate product = Ca(mg/dL) * Phos(mg/dL) with risk banding */
register({
  id: "ca_phos_product",
  label: "Calcium–phosphate product",
  tags: ["renal", "metabolic"],
  inputs: [
    { key: "calcium", required: true },  // mg/dL
    { key: "phosphate", required: true } // mg/dL
  ],
  run: ({ calcium, phosphate }) => {
    if ([calcium, phosphate].some(v => v == null)) return null;
    const prod = calcium * phosphate;
    const notes: string[] = [];
    if (prod > 70) notes.push("very high Ca×P product (>70)");
    else if (prod > 55) notes.push("high Ca×P product (>55)");
    else notes.push("within target band");
    return { id: "ca_phos_product", label: "Calcium–phosphate product", value: prod, unit: "mg²/dL²", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT10 — Endocrine / Sepsis helpers
   ========================================================= */

/** Effective serum osmolality = 2*Na + glucose/18 (excludes BUN) */
register({
  id: "effective_osm",
  label: "Effective serum osmolality",
  tags: ["endocrine", "electrolytes"],
  inputs: [
    { key: "Na", required: true },
    { key: "glucose", required: true },
  ],
  run: ({ Na, glucose }) => {
    if ([Na, glucose].some(v => v == null)) return null;
    const eosm = 2 * Na + glucose / 18;
    return { id: "effective_osm", label: "Effective serum osmolality", value: eosm, unit: "mOsm/kg", precision: 0, notes: [] };
  },
});

/** DKA severity (ADA-style bands; informational, not therapy) */
register({
  id: "dka_severity",
  label: "DKA severity",
  tags: ["endocrine", "critical_care"],
  inputs: [
    { key: "pH", required: true },
    { key: "HCO3", required: true },
    { key: "mental_status", required: true }, // "alert" | "drowsy" | "stupor/coma"
    { key: "glucose", required: true },       // mg/dL
  ],
  run: ({ pH, HCO3, mental_status, glucose }) => {
    if ([pH, HCO3, mental_status, glucose].some(v => v == null)) return null;
    const notes: string[] = [];
    let tier = "mild";
    if (pH < 7.0 || HCO3 < 10 || mental_status === "stupor/coma") tier = "severe";
    else if (pH < 7.24 || HCO3 < 15 || mental_status === "drowsy") tier = "moderate";
    notes.push(`glucose ${glucose} mg/dL`);
    return { id: "dka_severity", label: "DKA severity", value: tier === "severe" ? 3 : tier === "moderate" ? 2 : 1, unit: "tier", precision: 0, notes: [tier] };
  },
});

/** HHS flag (glucose>600, effective osm>320, minimal ketones implied) */
register({
  id: "hhs_flag",
  label: "HHS criteria flag",
  tags: ["endocrine", "critical_care"],
  inputs: [
    { key: "glucose", required: true },
    { key: "effective_osm", required: true },
  ],
  run: ({ glucose, effective_osm }) => {
    if ([glucose, effective_osm].some(v => v == null)) return null;
    const flag = glucose > 600 && effective_osm > 320;
    const notes: string[] = [];
    notes.push(flag ? "meets biochemical criteria for HHS (clinical confirmation required)" : "does not meet HHS biochemical criteria");
    return { id: "hhs_flag", label: "HHS criteria flag", value: flag ? 1 : 0, unit: "flag", precision: 0, notes };
  },
});

/** SIRS score (legacy sepsis screen; 0–4) */
register({
  id: "sirs_score",
  label: "SIRS score",
  tags: ["sepsis", "critical_care"],
  inputs: [
    { key: "temp_c", required: true },  // >38 or <36
    { key: "HR", required: true },      // >90
    { key: "RRr", required: true },     // >20 OR PaCO2 <32 (not included here)
    { key: "WBC", required: true },     // >12 or <4 (10^3/µL)
  ],
  run: ({ temp_c, HR, RRr, WBC }) => {
    const pts =
      ((temp_c > 38 || temp_c < 36) ? 1 : 0) +
      ((HR > 90) ? 1 : 0) +
      ((RRr > 20) ? 1 : 0) +
      ((WBC > 12 || WBC < 4) ? 1 : 0);
    const notes: string[] = [];
    notes.push(pts >= 2 ? "SIRS positive (screening only)" : "SIRS negative");
    return { id: "sirs_score", label: "SIRS score", value: pts, unit: "points", precision: 0, notes };
  },
});

/** Lactate clearance = (initial − repeat)/initial *100 (%) */
register({
  id: "lactate_clearance",
  label: "Lactate clearance",
  tags: ["sepsis", "critical_care"],
  inputs: [
    { key: "lactate_initial", required: true },
    { key: "lactate_repeat", required: true },
  ],
  run: ({ lactate_initial, lactate_repeat }) => {
    if ([lactate_initial, lactate_repeat].some(v => v == null) || lactate_initial <= 0) return null;
    const pct = ((lactate_initial - lactate_repeat) / lactate_initial) * 100;
    const notes: string[] = [];
    if (pct >= 10) notes.push("≥10% clearance (favorable)");
    else notes.push("<10% clearance");
    return { id: "lactate_clearance", label: "Lactate clearance", value: pct, unit: "%", precision: 1, notes };
  },
});

/* =========================================================
   MED-EXT11 — Hematology & Surgical ID
   ========================================================= */

/** Mentzer index = MCV / RBC (IDA vs thal trait screen) */
register({
  id: "mentzer_index",
  label: "Mentzer index",
  tags: ["hematology"],
  inputs: [
    { key: "MCV", required: true }, // fL
    { key: "RBC", required: true }, // x10^12/L (or x10^6/µL numerically)
  ],
  run: ({ MCV, RBC }) => {
    if ([MCV, RBC].some(v => v == null) || RBC <= 0) return null;
    const idx = MCV / RBC;
    const notes: string[] = [];
    if (idx < 13) notes.push("suggests thalassemia trait");
    else notes.push("suggests iron deficiency anemia");
    return { id: "mentzer_index", label: "Mentzer index", value: idx, unit: "unitless", precision: 1, notes };
  },
});

/** Hemoglobin severity bands (non-directive) */
register({
  id: "hemoglobin_severity",
  label: "Hemoglobin severity bands",
  tags: ["hematology"],
  inputs: [{ key: "hemoglobin", required: true }], // g/dL
  run: ({ hemoglobin }) => {
    if (hemoglobin == null) return null;
    const notes: string[] = [];
    if (hemoglobin < 7) notes.push("severe anemia band (<7 g/dL)");
    else if (hemoglobin < 8) notes.push("moderate–severe (7–7.9)");
    else if (hemoglobin < 10) notes.push("moderate (8–9.9)");
    else if (hemoglobin < 12) notes.push("mild (10–11.9)");
    else notes.push("within or near reference");
    return { id: "hemoglobin_severity", label: "Hemoglobin severity bands", value: hemoglobin, unit: "g/dL", precision: 1, notes };
  },
});

/** LRINEC (simplified bands) for necrotizing soft tissue infection risk */
register({
  id: "lrinec_simplified",
  label: "LRINEC (simplified)",
  tags: ["infectious_disease", "surgery", "risk"],
  inputs: [
    { key: "CRP", required: true },        // mg/L
    { key: "WBC", required: true },        // x10^3/µL
    { key: "hemoglobin", required: true }, // g/dL
    { key: "Na", required: true },         // mmol/L
    { key: "creatinine", required: true }, // mg/dL
    { key: "glucose", required: true },    // mg/dL
  ],
  run: (x) => {
    let pts = 0;
    // Coarse mapping to approximate LRINEC strata
    pts += x.CRP >= 150 ? 4 : x.CRP >= 100 ? 2 : 0;
    pts += x.WBC >= 25 ? 2 : x.WBC >= 15 ? 1 : 0;
    pts += x.hemoglobin <= 11 ? 2 : x.hemoglobin <= 13.5 ? 1 : 0;
    pts += x.Na < 135 ? 2 : 0;
    pts += x.creatinine > 1.6 ? 2 : 0;
    pts += x.glucose > 180 ? 1 : 0;

    const notes: string[] = [];
    if (pts >= 8) notes.push("high risk (LRINEC ≥8)");
    else if (pts >= 6) notes.push("intermediate risk (6–7)");
    else notes.push("lower risk (≤5)");
    return { id: "lrinec_simplified", label: "LRINEC (simplified)", value: pts, unit: "points", precision: 0, notes };
  },
});

/** BISAP (acute pancreatitis, 0–5): BUN>25, impaired mental status, SIRS≥2, age>60, pleural effusion */
register({
  id: "bisap",
  label: "BISAP",
  tags: ["gastroenterology", "risk"],
  inputs: [
    { key: "BUN", required: true },
    { key: "altered_mentation", required: true },
    { key: "sirs_score", required: true },     // from EXT10
    { key: "age", required: true },
    { key: "pleural_effusion", required: true },
  ],
  run: ({ BUN, altered_mentation, sirs_score, age, pleural_effusion }) => {
    if ([BUN, altered_mentation, sirs_score, age, pleural_effusion].some(v => v == null)) return null;
    const pts =
      (BUN > 25 ? 1 : 0) +
      (altered_mentation ? 1 : 0) +
      ((sirs_score ?? 0) >= 2 ? 1 : 0) +
      (age > 60 ? 1 : 0) +
      (pleural_effusion ? 1 : 0);
    const notes: string[] = [];
    if (pts >= 3) notes.push("higher risk (BISAP ≥3)");
    else notes.push("lower risk (BISAP 0–2)");
    return { id: "bisap", label: "BISAP", value: pts, unit: "points", precision: 0, notes };
  },
});

// ===================== MED-EXT12–15 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* =========================================================
   MED-EXT12 — Renal / Acid–Base Gates & SIADH helpers
   ========================================================= */

/** AKIN stage (harmonize with KDIGO; creatinine & urine output) */
register({
  id: "akin_stage",
  label: "AKIN stage",
  tags: ["renal", "icu_scores"],
  inputs: [
    { key: "creatinine", required: true },            // mg/dL
    { key: "baseline_creatinine" },                   // mg/dL
    { key: "creatinine_increase_48h" },               // mg/dL
    { key: "urine_output_ml_per_kg_per_hr" },         // mL/kg/h
    { key: "oliguria_hours" },                        // h
    { key: "dialysis" },                              // boolean
  ],
  run: (x) => {
    if (x.creatinine == null) return null;
    let stage = 0; const notes: string[] = [];
    const ratio = (x.baseline_creatinine && x.baseline_creatinine>0) ? x.creatinine / x.baseline_creatinine : null;
    if (x.dialysis) { stage = 3; notes.push("renal replacement therapy"); }
    if (ratio != null) {
      if (ratio >= 3) { stage = Math.max(stage, 3); notes.push("Cr ≥3× baseline"); }
      else if (ratio >= 2) { stage = Math.max(stage, 2); notes.push("Cr ≥2× baseline"); }
      else if (ratio >= 1.5) { stage = Math.max(stage, 1); notes.push("Cr ≥1.5× baseline"); }
    }
    if (x.creatinine_increase_48h != null && x.creatinine_increase_48h >= 0.3) { stage = Math.max(stage, 1); notes.push("Cr rise ≥0.3 mg/dL (48h)"); }
    const UO = x.urine_output_ml_per_kg_per_hr, h = x.oliguria_hours;
    if (typeof UO === "number" && typeof h === "number") {
      if (UO < 0.3 && h >= 24) { stage = Math.max(stage, 3); notes.push("UO <0.3 mL/kg/h ≥24h"); }
      else if (UO < 0.5 && h >= 12) { stage = Math.max(stage, 2); notes.push("UO <0.5 mL/kg/h ≥12h"); }
      else if (UO < 0.5 && h >= 6) { stage = Math.max(stage, 1); notes.push("UO <0.5 mL/kg/h 6–12h"); }
    }
    return { id: "akin_stage", label: "AKIN stage", value: stage, unit: "stage", precision: 0, notes: notes.length?notes:["insufficient criteria"] };
  },
});

/** FENa vs FEUrea gate (oliguric AKI; diuretics favor FEUrea interpretation) */
register({
  id: "fena_feurea_gate",
  label: "FENa/FEUrea interpretation gate",
  tags: ["renal"],
  inputs: [
    { key: "FENa", required: false },          // %
    { key: "FEUrea", required: false },        // %
    { key: "on_diuretics", required: false },  // boolean
  ],
  run: ({ FENa, FEUrea, on_diuretics }) => {
    const notes: string[] = [];
    let interp = "indeterminate";
    if (on_diuretics && typeof FEUrea === "number") {
      if (FEUrea < 35) { interp = "prerenal pattern (FEUrea <35%)"; }
      else { interp = "intrinsic pattern (FEUrea ≥35%)"; }
      notes.push("interpret FEUrea due to diuretics");
    } else if (!on_diuretics && typeof FENa === "number") {
      if (FENa < 1) { interp = "prerenal pattern (FENa <1%)"; }
      else { interp = "intrinsic pattern (FENa ≥1%)"; }
      notes.push("interpret FENa (no diuretics)");
    } else {
      notes.push("need either FENa (no diuretics) or FEUrea (on diuretics)");
    }
    return { id: "fena_feurea_gate", label: "FENa/FEUrea interpretation gate", value: 0, unit: "note", precision: 0, notes: [interp, ...notes] };
  },
});

/** Metabolic alkalosis chloride-responsiveness (urine chloride) */
register({
  id: "met_alk_chloride_responsive",
  label: "Metabolic alkalosis: chloride-responsive flag",
  tags: ["acid-base", "renal"],
  inputs: [{ key: "urine_Cl", required: true }], // mmol/L
  run: ({ urine_Cl }) => {
    const notes:string[] = [];
    if (urine_Cl < 10) notes.push("chloride-responsive (UCl <10)");
    else if (urine_Cl <= 20) notes.push("likely chloride-responsive (UCl 10–20)");
    else notes.push("chloride-resistant pattern (UCl >20)");
    return { id: "met_alk_chloride_responsive", label: "Metabolic alkalosis: chloride-responsive flag", value: urine_Cl, unit: "mmol/L", precision: 0, notes };
  },
});

/** SIADH support (hypotonic euvolemic with concentrated urine & high UNa) */
register({
  id: "siadh_support",
  label: "SIADH support",
  tags: ["endocrine", "renal"],
  inputs: [
    { key: "effective_osm", required: true }, // mOsm/kg
    { key: "urine_osm_measured", required: true }, // mOsm/kg
    { key: "urine_Na", required: true }, // mmol/L
  ],
  run: ({ effective_osm, urine_osm_measured, urine_Na }) => {
    const hypo = effective_osm < 275;
    const concentrated = urine_osm_measured > 100;
    const highUNa = urine_Na >= 30;
    const supportive = hypo && concentrated && highUNa;
    const notes:string[] = [];
    notes.push(supportive ? "pattern supports SIADH (clinical correlation required)" : "pattern not supportive");
    return { id: "siadh_support", label: "SIADH support", value: supportive?1:0, unit: "flag", precision: 0, notes: [`hypotonic:${hypo}`, `Uosm>100:${concentrated}`, `UNa≥30:${highUNa}`] };
  },
});

/** Uosm/Serum osm ratio (concentrating ability) */
register({
  id: "uosm_sosm_ratio",
  label: "Uosm/Serum osm ratio",
  tags: ["renal"],
  inputs: [
    { key: "urine_osm_measured", required: true },
    { key: "measured_osm", required: true },
  ],
  run: ({ urine_osm_measured, measured_osm }) => {
    if (measured_osm == null || measured_osm <= 0) return null;
    const r = urine_osm_measured / measured_osm;
    const notes:string[] = [];
    if (r < 1) notes.push("dilute urine");
    else if (r < 2) notes.push("moderately concentrated");
    else notes.push("well concentrated");
    return { id: "uosm_sosm_ratio", label: "Uosm/Serum osm ratio", value: r, unit: "ratio", precision: 2, notes };
  },
});

/** Sodium correction rate safety (ΔNa per 24h) */
register({
  id: "sodium_correction_rate",
  label: "Sodium correction rate safety",
  tags: ["electrolytes", "safety"],
  inputs: [
    { key: "delta_Na_mEq", required: true },  // planned/observed Δ over 24h
  ],
  run: ({ delta_Na_mEq }) => {
    const notes:string[] = [];
    if (delta_Na_mEq > 12) notes.push("unsafe: ΔNa>12 mEq in 24h");
    else if (delta_Na_mEq > 10) notes.push("caution: ΔNa 10–12");
    else if (delta_Na_mEq >= 6) notes.push("typical target band 6–10");
    else notes.push("slow correction (<6)");
    return { id: "sodium_correction_rate", label: "Sodium correction rate safety", value: delta_Na_mEq, unit: "mEq/24h", precision: 1, notes };
  },
});

/* =========================================================
   MED-EXT13 — Neuro Hemorrhage & Coma utilities
   ========================================================= */

/** GCS total from components */
register({
  id: "gcs_total",
  label: "GCS total",
  tags: ["neurology"],
  inputs: [
    { key: "gcs_eye", required: true },     // 1–4
    { key: "gcs_verbal", required: true },  // 1–5
    { key: "gcs_motor", required: true },   // 1–6
  ],
  run: ({ gcs_eye, gcs_verbal, gcs_motor }) => {
    const total = (gcs_eye ?? 0) + (gcs_verbal ?? 0) + (gcs_motor ?? 0);
    const notes:string[] = [];
    if (total <= 8) notes.push("severe");
    else if (total <= 12) notes.push("moderate");
    else notes.push("mild");
    return { id: "gcs_total", label: "GCS total", value: total, unit: "points", precision: 0, notes };
  },
});

/** ICH score (simplified) */
register({
  id: "ich_score",
  label: "ICH score (simplified)",
  tags: ["neurology", "risk"],
  inputs: [
    { key: "gcs_total", required: true },           // from above
    { key: "ich_volume_ml", required: true },       // >30 mL
    { key: "intraventricular_hemorrhage", required: true },
    { key: "infratentorial_origin", required: true },
    { key: "age_ge_80", required: true },
  ],
  run: (x) => {
    let pts = 0;
    pts += x.gcs_total <= 4 ? 2 : x.gcs_total <= 8 ? 1 : 0;
    pts += x.ich_volume_ml > 30 ? 1 : 0;
    pts += x.intraventricular_hemorrhage ? 1 : 0;
    pts += x.infratentorial_origin ? 1 : 0;
    pts += x.age_ge_80 ? 1 : 0;
    const notes:string[] = [];
    if (pts >= 3) notes.push("high risk");
    else if (pts === 2) notes.push("intermediate risk");
    else notes.push("lower risk");
    return { id: "ich_score", label: "ICH score (simplified)", value: pts, unit: "points", precision: 0, notes };
  },
});

/** Hunt–Hess (SAH severity, simplified mapping 1–5) */
register({
  id: "hunt_hess",
  label: "Hunt–Hess grade (simplified)",
  tags: ["neurology", "risk"],
  inputs: [
    { key: "grade", required: true }, // 1–5 chosen upstream by clinician/mapper
  ],
  run: ({ grade }) => {
    if (grade == null) return null;
    const notes:string[] = [];
    notes.push(grade >= 4 ? "severe SAH" : grade >= 3 ? "moderate SAH" : "mild SAH");
    return { id: "hunt_hess", label: "Hunt–Hess grade (simplified)", value: grade, unit: "grade", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT14 — Sepsis/ID Severity Flags
   ========================================================= */

/** Septic shock (Sepsis-3) biochemical flag */
register({
  id: "septic_shock_flag",
  label: "Septic shock (Sepsis-3) flag",
  tags: ["sepsis", "critical_care"],
  inputs: [
    { key: "on_vasopressors", required: true },       // boolean (to maintain MAP ≥65)
    { key: "lactate", required: true },               // mmol/L
  ],
  run: ({ on_vasopressors, lactate }) => {
    const flag = !!on_vasopressors && lactate > 2;
    const notes:string[] = [];
    notes.push(flag ? "meets Sepsis-3 shock criteria (pressors + lactate >2)" : "does not meet Sepsis-3 shock criteria");
    return { id: "septic_shock_flag", label: "Septic shock (Sepsis-3) flag", value: flag?1:0, unit: "flag", precision: 0, notes };
  },
});

/** qPitt (quick Pitt bacteremia score, simplified 0–5) */
register({
  id: "qpitt_simplified",
  label: "qPitt (simplified)",
  tags: ["infectious_disease", "risk"],
  inputs: [
    { key: "temp_c", required: true },          // ≤35 or ≥40
    { key: "SBP", required: true },             // <90
    { key: "RRr", required: true },             // ≥25
    { key: "altered_mentation", required: true },
    { key: "mechanical_ventilation", required: true },
  ],
  run: (x) => {
    let pts = 0;
    pts += (x.temp_c <= 35 || x.temp_c >= 40) ? 1 : 0;
    pts += x.SBP < 90 ? 1 : 0;
    pts += x.RRr >= 25 ? 1 : 0;
    pts += x.altered_mentation ? 1 : 0;
    pts += x.mechanical_ventilation ? 1 : 0;
    const notes:string[] = [];
    if (pts >= 3) notes.push("high risk");
    else if (pts === 2) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "qpitt_simplified", label: "qPitt (simplified)", value: pts, unit: "points", precision: 0, notes };
  },
});

/** SOFA → mortality band (informational, non-calibrated) */
register({
  id: "sofa_mortality_band",
  label: "SOFA mortality band",
  tags: ["icu_scores", "sepsis"],
  inputs: [{ key: "sofa_total", required: true }],
  run: ({ sofa_total }) => {
    if (sofa_total == null) return null;
    const notes:string[] = [];
    if (sofa_total >= 12) notes.push("very high mortality band");
    else if (sofa_total >= 8) notes.push("high mortality band");
    else if (sofa_total >= 4) notes.push("moderate mortality band");
    else notes.push("lower mortality band");
    return { id: "sofa_mortality_band", label: "SOFA mortality band", value: sofa_total, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT15 — Nutrition & Frailty Screens
   ========================================================= */

/** NRS-2002 (screening surrogate 0–7) */
register({
  id: "nrs_2002_surrogate",
  label: "NRS-2002 (surrogate)",
  tags: ["nutrition", "risk"],
  inputs: [
    { key: "nutritional_impairment_band", required: true }, // 0 none, 1 mild, 2 mod, 3 severe
    { key: "disease_severity_band", required: true },       // 0 none, 1 mild, 2 mod, 3 severe
    { key: "age_ge_70", required: true },                   // +1 if true
  ],
  run: ({ nutritional_impairment_band, disease_severity_band, age_ge_70 }) => {
    const total = (nutritional_impairment_band ?? 0) + (disease_severity_band ?? 0) + (age_ge_70 ? 1 : 0);
    const notes:string[] = [];
    notes.push(total >= 3 ? "nutritional risk (≥3)" : "no nutritional risk (<3)");
    return { id: "nrs_2002_surrogate", label: "NRS-2002 (surrogate)", value: total, unit: "points", precision: 0, notes };
  },
});

/** MUST (Malnutrition Universal Screening Tool) surrogate 0–6 */
register({
  id: "must_surrogate",
  label: "MUST (surrogate)",
  tags: ["nutrition", "risk"],
  inputs: [
    { key: "bmi_band", required: true },           // 0: >20, 1: 18.5–20, 2: <18.5
    { key: "weight_loss_band", required: true },   // 0: <5%, 1: 5–10%, 2: >10%
    { key: "acute_disease_effect", required: true } // 0/2
  ],
  run: ({ bmi_band, weight_loss_band, acute_disease_effect }) => {
    const total = (bmi_band ?? 0) + (weight_loss_band ?? 0) + (acute_disease_effect ?? 0);
    const notes:string[] = [];
    if (total >= 2) notes.push("high risk (≥2)");
    else if (total === 1) notes.push("medium risk");
    else notes.push("low risk");
    return { id: "must_surrogate", label: "MUST (surrogate)", value: total, unit: "points", precision: 0, notes };
  },
});

/** Clinical Frailty Scale (CFS) — input 1–9, banded */
register({
  id: "cfs_band",
  label: "Clinical Frailty Scale (banded)",
  tags: ["geriatrics", "risk"],
  inputs: [{ key: "cfs", required: true }], // 1–9
  run: ({ cfs }) => {
    if (cfs == null) return null;
    const notes:string[] = [];
    if (cfs >= 7) notes.push("severe–very severe frailty (7–9)");
    else if (cfs >= 5) notes.push("mild–moderate frailty (5–6)");
    else if (cfs >= 3) notes.push("vulnerable (3–4)");
    else notes.push("very fit to fit (1–2)");
    return { id: "cfs_band", label: "Clinical Frailty Scale (banded)", value: cfs, unit: "score", precision: 0, notes };
  },
});

// ===================== MED-EXT16–20 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* =========================================================
   MED-EXT16 — Renal/ABG gates + TRALI/TACO + BISAP dispo
   ========================================================= */

/** Renal Doppler Resistive Index (RI) = (PSV - EDV)/PSV ; bands */
register({
  id: "renal_ri_bands",
  label: "Renal Doppler RI (bands)",
  tags: ["renal", "imaging"],
  inputs: [
    { key: "psv_cm_s", required: true },
    { key: "edv_cm_s", required: true },
  ],
  run: ({ psv_cm_s, edv_cm_s }) => {
    if ([psv_cm_s, edv_cm_s].some(v => v == null) || psv_cm_s <= 0) return null;
    const ri = (psv_cm_s - edv_cm_s) / psv_cm_s;
    const notes:string[] = [];
    if (ri >= 0.8) notes.push("high RI (≥0.80)");
    else if (ri >= 0.7) notes.push("borderline (0.70–0.79)");
    else notes.push("within reference (<0.70)");
    return { id: "renal_ri_bands", label: "Renal Doppler RI (bands)", value: ri, unit: "ratio", precision: 2, notes };
  },
});

/** SIADH vs hypovolemia gate using uric acid / FEUA if available */
register({
  id: "siadh_vs_hypovolemia_gate",
  label: "Hyponatremia gate (SIADH vs hypovolemia)",
  tags: ["renal", "endocrine"],
  inputs: [
    { key: "plasma_uric", required: false }, // mg/dL
    { key: "feua", required: false },        // % (from existing FEUA calc)
  ],
  run: ({ plasma_uric, feua }) => {
    const notes: string[] = [];
    let pattern = "indeterminate";
    if (typeof feua === "number") {
      if (feua > 10) { pattern = "SIADH pattern (FEUA >10%)"; }
      else if (feua < 8) { pattern = "hypovolemic pattern (FEUA <8%)"; }
      notes.push("interpreted via FEUA");
    } else if (typeof plasma_uric === "number") {
      if (plasma_uric < 4) { pattern = "SIADH pattern (low serum uric acid)"; }
      else if (plasma_uric > 6) { pattern = "hypovolemic pattern (higher serum uric acid)"; }
      notes.push("interpreted via serum uric acid");
    } else {
      notes.push("provide FEUA or serum uric acid");
    }
    return { id: "siadh_vs_hypovolemia_gate", label: "Hyponatremia gate (SIADH vs hypovolemia)", value: 0, unit: "note", precision: 0, notes: [pattern, ...notes] };
  },
});

/** Metabolic alkalosis subtype mapper (chloride, K+, HTN) */
register({
  id: "met_alk_subtype",
  label: "Metabolic alkalosis subtype (mapper)",
  tags: ["acid-base", "renal"],
  inputs: [
    { key: "urine_Cl", required: true },      // mmol/L
    { key: "hypokalemia", required: false },  // boolean
    { key: "hypertension", required: false }, // boolean
  ],
  run: ({ urine_Cl, hypokalemia, hypertension }) => {
    const notes:string[] = [];
    if (urine_Cl < 20) {
      notes.push("chloride-responsive (saline-respons.) pattern");
      if (hypokalemia) notes.push("consider gastric losses/diuretics");
    } else {
      notes.push("chloride-resistant pattern");
      if (hypertension) notes.push("consider mineralocorticoid excess");
      else if (hypokalemia) notes.push("consider Bartter/Gitelman");
    }
    return { id: "met_alk_subtype", label: "Metabolic alkalosis subtype (mapper)", value: urine_Cl, unit: "mmol/L", precision: 0, notes };
  },
});

/** TRALI vs TACO differentiation helper (non-diagnostic) */
register({
  id: "trali_taco_helper",
  label: "Transfusion dyspnea helper (TRALI vs TACO)",
  tags: ["transfusion", "critical_care"],
  inputs: [
    { key: "onset_hours", required: true },              // hours from transfusion
    { key: "elevated_bnp_ntprobnp", required: false },   // boolean
    { key: "cvp_or_volume_overload", required: false },  // boolean
    { key: "fever_or_leukopenia", required: false },     // boolean
  ],
  run: (x) => {
    const trali_support = (x.onset_hours <= 6) && !x.elevated_bnp_ntprobnp && !x.cvp_or_volume_overload && !!x.fever_or_leukopenia;
    const taco_support  = (x.onset_hours <= 6) && (!!x.elevated_bnp_ntprobnp || !!x.cvp_or_volume_overload);
    const notes:string[] = [];
    if (trali_support) notes.push("pattern supports TRALI");
    if (taco_support) notes.push("pattern supports TACO");
    if (!trali_support && !taco_support) notes.push("pattern indeterminate");
    return { id: "trali_taco_helper", label: "Transfusion dyspnea helper (TRALI vs TACO)", value: trali_support ? (taco_support ? 2 : 1) : (taco_support ? -1 : 0), unit: "flag", precision: 0, notes };
  },
});

/** BISAP → disposition note */
register({
  id: "bisap_dispo",
  label: "BISAP disposition note",
  tags: ["gastroenterology", "risk"],
  inputs: [{ key: "bisap", required: true }],
  run: ({ bisap }) => {
    if (bisap == null) return null;
    const notes:string[] = [];
    if (bisap >= 3) notes.push("higher risk — admit/close monitoring context");
    else notes.push("lower risk — routine monitoring context");
    return { id: "bisap_dispo", label: "BISAP disposition note", value: bisap, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT17 — Hepatic fibrosis/severity calculators
   ========================================================= */

/** FIB-4 index = (Age × AST) / (Platelets × sqrt(ALT)) */
register({
  id: "fib4",
  label: "FIB-4 index",
  tags: ["hepatology", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "AST", required: true },
    { key: "ALT", required: true },
    { key: "platelets", required: true }, // x10^3/µL
  ],
  run: ({ age, AST, ALT, platelets }) => {
    if ([age, AST, ALT, platelets].some(v => v == null) || ALT <= 0 || platelets <= 0) return null;
    const fib4 = (age * AST) / (platelets * Math.sqrt(ALT));
    const notes:string[] = [];
    if (fib4 >= 3.25) notes.push("high risk for advanced fibrosis");
    else if (fib4 <= 1.3) notes.push("low risk");
    else notes.push("indeterminate");
    return { id: "fib4", label: "FIB-4 index", value: fib4, unit: "index", precision: 2, notes };
  },
});

/** APRI = (AST/ULN_AST) × 100 / Platelets(10^3/µL) */
register({
  id: "apri",
  label: "APRI",
  tags: ["hepatology", "risk"],
  inputs: [
    { key: "AST", required: true },
    { key: "ULN_AST", required: true },
    { key: "platelets", required: true },
  ],
  run: ({ AST, ULN_AST, platelets }) => {
    if ([AST, ULN_AST, platelets].some(v => v == null) || ULN_AST <= 0 || platelets <= 0) return null;
    const apri = (AST / ULN_AST) * 100 / platelets * 1000; // adjust for 10^3/µL units
    const notes:string[] = [];
    if (apri >= 1.0) notes.push("suggests significant fibrosis");
    else notes.push("lower probability of significant fibrosis");
    return { id: "apri", label: "APRI", value: apri, unit: "index", precision: 2, notes };
  },
});

/** NAFLD Fibrosis Score (very simple surrogate bander) */
register({
  id: "nafld_fs_surrogate",
  label: "NAFLD fibrosis surrogate",
  tags: ["hepatology", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "BMI", required: true },
    { key: "diabetes", required: true },
    { key: "AST_ALT_ratio", required: true },
    { key: "platelets", required: true },
    { key: "albumin", required: true },
  ],
  run: (x) => {
    // Simple linear surrogate (not the full published equation)
    let score = (x.age/10) + (x.BMI/5) + (x.diabetes?2:0) + (x.AST_ALT_ratio>=1?1:0) - (x.albumin>=4?1:0) - (x.platelets>=200?1:0);
    const notes:string[] = [];
    if (score >= 6) notes.push("high fibrosis risk (surrogate)");
    else if (score >= 3) notes.push("intermediate (surrogate)");
    else notes.push("low (surrogate)");
    return { id: "nafld_fs_surrogate", label: "NAFLD fibrosis surrogate", value: score, unit: "index", precision: 1, notes };
  },
});

/** MELD-Na (informational bands) */
register({
  id: "meld_na",
  label: "MELD-Na",
  tags: ["hepatology", "icu_scores"],
  inputs: [
    { key: "bilirubin", required: true }, // mg/dL
    { key: "INR", required: true },
    { key: "creatinine", required: true }, // mg/dL
    { key: "Na", required: true },         // mmol/L
  ],
  run: ({ bilirubin, INR, creatinine, Na }) => {
    if ([bilirubin, INR, creatinine, Na].some(v => v == null)) return null;
    const b = Math.max(bilirubin, 1), i = Math.max(INR, 1), c = Math.max(creatinine, 1);
    const meld = 3.78*Math.log(b) + 11.2*Math.log(i) + 9.57*Math.log(c) + 6.43;
    const naClamped = Math.max(125, Math.min(137, Na));
    const meldNa = Math.round(meld + 1.59 * (135 - naClamped));
    const notes:string[] = [];
    if (meldNa >= 30) notes.push("very high severity");
    else if (meldNa >= 20) notes.push("high severity");
    else if (meldNa >= 10) notes.push("moderate");
    else notes.push("lower");
    return { id: "meld_na", label: "MELD-Na", value: meldNa, unit: "score", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT18 — Cardiology risk set (TIMI/GRACE-lite/HAS-BLED/SI)
   ========================================================= */

/** TIMI (UA/NSTEMI) simplified sum 0–7 */
register({
  id: "timi_uanstemi",
  label: "TIMI (UA/NSTEMI) simplified",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "age_ge_65", required: true },
    { key: "ge_3_risk_factors", required: true },   // CAD risk factors ≥3
    { key: "known_cad_ge_50_stenosis", required: true },
    { key: "aspirin_use_7d", required: true },
    { key: "recent_severe_angina", required: true }, // ≥2 episodes/24h
    { key: "st_deviation_ge_0_5mm", required: true },
    { key: "elevated_biomarkers", required: true },
  ],
  run: (x) => {
    const pts = Object.values(x).reduce((a,b)=>a+(b?1:0),0);
    const notes:string[] = [];
    if (pts >= 5) notes.push("high risk");
    else if (pts >= 3) notes.push("intermediate risk");
    else notes.push("low risk");
    return { id: "timi_uanstemi", label: "TIMI (UA/NSTEMI) simplified", value: pts, unit: "points", precision: 0, notes };
  },
});

/** GRACE-lite surrogate (not calibrated) */
register({
  id: "grace_lite",
  label: "GRACE (surrogate)",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "HR", required: true },
    { key: "SBP", required: true },
    { key: "creatinine", required: true },
    { key: "st_deviation", required: true },     // boolean
    { key: "cardiac_arrest_onset", required: true },
    { key: "elevated_biomarkers", required: true },
    { key: "killip_class_ge_2", required: true },
  ],
  run: (x) => {
    let s = (x.age/10) + (x.HR/50) + ((200 - Math.min(x.SBP,200))/40) + (x.creatinine/1.5);
    s += (x.st_deviation?2:0) + (x.cardiac_arrest_onset?3:0) + (x.elevated_biomarkers?1.5:0) + (x.killip_class_ge_2?2:0);
    const notes:string[] = [];
    if (s >= 12) notes.push("high risk (surrogate)");
    else if (s >= 7) notes.push("intermediate (surrogate)");
    else notes.push("low (surrogate)");
    return { id: "grace_lite", label: "GRACE (surrogate)", value: s, unit: "index", precision: 1, notes };
  },
});

/** HAS-BLED bleeding risk (AF) 0–9 */
register({
  id: "has_bled",
  label: "HAS-BLED",
  tags: ["cardiology", "hematology", "risk"],
  inputs: [
    { key: "hypertension", required: true },
    { key: "abnormal_renal", required: true },
    { key: "abnormal_liver", required: true },
    { key: "stroke_history", required: true },
    { key: "bleeding_history", required: true },
    { key: "labile_inr", required: true },
    { key: "elderly_ge_65", required: true },
    { key: "drugs_predispose_bleeding", required: true }, // antiplatelets/NSAIDs
    { key: "alcohol_excess", required: true },
  ],
  run: (x) => {
    const pts = Object.values(x).reduce((a,b)=>a+(b?1:0),0);
    const notes:string[] = [];
    if (pts >= 3) notes.push("high bleeding risk (≥3)");
    else notes.push("lower bleeding risk");
    return { id: "has_bled", label: "HAS-BLED", value: pts, unit: "points", precision: 0, notes };
  },
});

/** Shock Index (SI = HR/SBP) and Age Shock Index (ASI = age*SI) */
register({
  id: "shock_index",
  label: "Shock Index / Age Shock Index",
  tags: ["hemodynamics", "risk"],
  inputs: [
    { key: "HR", required: true },
    { key: "SBP", required: true },
    { key: "age", required: true },
  ],
  run: ({ HR, SBP, age }) => {
    if ([HR, SBP, age].some(v=>v==null) || SBP<=0) return null;
    const si = HR / SBP;
    const asi = age * si;
    const notes:string[] = [];
    if (si >= 1.0) notes.push("elevated SI (≥1.0)");
    if (asi >= 50) notes.push("elevated ASI (≥50)");
    if (notes.length===0) notes.push("within reference bands");
    return { id: "shock_index", label: "Shock Index / Age Shock Index", value: si, unit: "SI (ASI in notes)", precision: 2, notes: [`ASI=${asi.toFixed(1)}`, ...notes] };
  },
});

/* =========================================================
   MED-EXT19 — Fluids/ABG helpers & renal dosing estimate
   ========================================================= */

/** Corrected sodium for hyperglycemia = Na + 1.6*((glucose-100)/100) */
register({
  id: "sodium_corrected_hyperglycemia",
  label: "Corrected sodium (hyperglycemia)",
  tags: ["electrolytes", "endocrine"],
  inputs: [
    { key: "Na", required: true },
    { key: "glucose", required: true }, // mg/dL
  ],
  run: ({ Na, glucose }) => {
    const corr = Na + 1.6 * Math.max(0, (glucose - 100)) / 100;
    return { id: "sodium_corrected_hyperglycemia", label: "Corrected sodium (hyperglycemia)", value: corr, unit: "mmol/L", precision: 1, notes: [] };
  },
});

/** Winter’s expected PaCO₂ for metabolic acidosis = 1.5*HCO₃ + 8 (±2) */
register({
  id: "winters_expected_paco2",
  label: "Expected PaCO₂ (Winter’s)",
  tags: ["acid-base", "pulmonary"],
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    const exp = 1.5 * HCO3 + 8;
    return { id: "winters_expected_paco2", label: "Expected PaCO₂ (Winter’s)", value: exp, unit: "mmHg (±2)", precision: 0, notes: ["respiratory compensation target for metabolic acidosis"] };
  },
});

/** Cockcroft–Gault creatinine clearance (mL/min) */
register({
  id: "cockcroft_gault",
  label: "Creatinine clearance (Cockcroft–Gault)",
  tags: ["renal", "pharmacology"],
  inputs: [
    { key: "age", required: true },
    { key: "weight_kg", required: true },
    { key: "sex", required: true },             // "M" | "F"
    { key: "serum_creatinine", required: true } // mg/dL
  ],
  run: ({ age, weight_kg, sex, serum_creatinine }) => {
    if ([age, weight_kg, sex, serum_creatinine].some(v=>v==null) || serum_creatinine<=0) return null;
    const base = ((140 - age) * weight_kg) / (72 * serum_creatinine);
    const crcl = sex === "F" ? base * 0.85 : base;
    return { id: "cockcroft_gault", label: "Creatinine clearance (Cockcroft–Gault)", value: crcl, unit: "mL/min", precision: 0, notes: [] };
  },
});

/** Delta anion gap narrative (AGcorr vs HCO3) to reinforce mixed disorders */
register({
  id: "delta_ag_narrative",
  label: "Delta AG narrative",
  tags: ["acid-base"],
  inputs: [
    { key: "anion_gap_albumin_corrected", required: true },
    { key: "HCO3", required: true }
  ],
  run: ({ anion_gap_albumin_corrected, HCO3 }) => {
    const delta = anion_gap_albumin_corrected - 12;
    const expectedHCO3 = 24 - delta;
    const notes:string[] = [];
    if (HCO3 < expectedHCO3 - 3) notes.push("concurrent non-AG acidosis suggested");
    else if (HCO3 > expectedHCO3 + 3) notes.push("concurrent metabolic alkalosis suggested");
    else notes.push("HCO₃ matches expected for isolated HAGMA");
    return { id: "delta_ag_narrative", label: "Delta AG narrative", value: 0, unit: "note", precision: 0, notes: [`ΔAG=${delta.toFixed(1)}`, `expected HCO₃≈${expectedHCO3.toFixed(1)}`] };
  },
});

/* =========================================================
   MED-EXT20 — Oxygenation & vitals helpers
   ========================================================= */

/** PF ratio = PaO₂ / FiO₂ with ARDS bands */
register({
  id: "pf_ratio",
  label: "PF ratio (ARDS bands)",
  tags: ["pulmonary", "icu_scores"],
  inputs: [
    { key: "PaO2", required: true },  // mmHg
    { key: "FiO2", required: true },  // fraction 0–1
  ],
  run: ({ PaO2, FiO2 }) => {
    if ([PaO2, FiO2].some(v=>v==null) || FiO2<=0) return null;
    const pf = PaO2 / FiO2;
    const notes:string[] = [];
    if (pf < 100) notes.push("ARDS severe (<100)");
    else if (pf < 200) notes.push("ARDS moderate (100–199)");
    else if (pf <= 300) notes.push("ARDS mild (200–300)");
    else notes.push("no ARDS by PF");
    return { id: "pf_ratio", label: "PF ratio (ARDS bands)", value: pf, unit: "mmHg", precision: 0, notes };
  },
});

/** Mean arterial pressure from SBP/DBP */
register({
  id: "map_from_bp",
  label: "MAP (calculated)",
  tags: ["hemodynamics"],
  inputs: [
    { key: "SBP", required: true },
    { key: "DBP", required: true },
  ],
  run: ({ SBP, DBP }) => {
    const map = (SBP + 2*DBP) / 3;
    return { id: "map_from_bp", label: "MAP (calculated)", value: map, unit: "mmHg", precision: 0, notes: [] };
  },
});

/** Corrected calcium (albumin) = Ca + 0.8*(4 - albumin) */
register({
  id: "corrected_calcium",
  label: "Corrected calcium (albumin)",
  tags: ["electrolytes"],
  inputs: [
    { key: "calcium", required: true },  // mg/dL
    { key: "albumin", required: true },  // g/dL
  ],
  run: ({ calcium, albumin }) => {
    if ([calcium, albumin].some(v=>v==null)) return null;
    const corr = calcium + 0.8*(4 - albumin);
    return { id: "corrected_calcium", label: "Corrected calcium (albumin)", value: corr, unit: "mg/dL", precision: 1, notes: [] };
  },
});

// ===================== MED-EXT21–30 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* =========================================================
   MED-EXT21 — PE: YEARS algorithm + Syncope (SFSR)
   ========================================================= */

/** YEARS algorithm (PE): if ANY YEARS item → D-dimer threshold 500; if NONE → threshold 1000 ng/mL FEU. */
register({
  id: "years_pe",
  label: "YEARS (PE) rule",
  tags: ["pulmonary", "risk"],
  inputs: [
    { key: "clinical_signs_dvt", required: true },   // YEARS item
    { key: "hemoptysis", required: true },           // YEARS item
    { key: "pe_most_likely", required: true },       // YEARS item
    { key: "ddimer_feu_ng_ml", required: true },     // ng/mL FEU
  ],
  run: (x) => {
    const anyItem = x.clinical_signs_dvt || x.hemoptysis || x.pe_most_likely;
    const threshold = anyItem ? 500 : 1000;
    const ruledOut = x.ddimer_feu_ng_ml < threshold;
    const notes: string[] = [
      `YEARS items present: ${anyItem ? "yes" : "no"}`,
      `threshold=${threshold} ng/mL`,
      ruledOut ? "PE ruled out (YEARS pathway)" : "Not ruled out"
    ];
    return { id: "years_pe", label: "YEARS (PE) rule", value: ruledOut ? 1 : 0, unit: "flag", precision: 0, notes };
  },
});

/** San Francisco Syncope Rule (SFSR) — “CHESS” flags; positive if ANY criterion. */
register({
  id: "sfsr_syncope",
  label: "San Francisco Syncope Rule (flag)",
  tags: ["cardiology", "neurology", "risk"],
  inputs: [
    { key: "history_chf", required: true },
    { key: "hematocrit_lt_30", required: true },
    { key: "abnormal_ecg", required: true },
    { key: "shortness_of_breath", required: true },
    { key: "sbp_lt_90", required: true },
  ],
  run: (x) => {
    const positive = x.history_chf || x.hematocrit_lt_30 || x.abnormal_ecg || x.shortness_of_breath || x.sbp_lt_90;
    const notes = [positive ? "SFSR positive — higher risk" : "SFSR negative — lower risk"];
    return { id: "sfsr_syncope", label: "San Francisco Syncope Rule (flag)", value: positive ? 1 : 0, unit: "flag", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT22 — KDIGO AKI + Hyponatremia tonicity class
   ========================================================= */

/** KDIGO AKI stage (creatinine & urine output) */
register({
  id: "kdigo_aki_stage",
  label: "KDIGO AKI stage",
  tags: ["renal", "icu_scores"],
  inputs: [
    { key: "creatinine", required: true },              // mg/dL
    { key: "baseline_creatinine" },                     // mg/dL
    { key: "urine_output_ml_per_kg_per_hr" },           // mL/kg/h
    { key: "oliguria_hours" },                          // h
    { key: "dialysis" },                                // boolean
  ],
  run: (x) => {
    if (x.creatinine == null) return null;
    let stage = 0; const notes: string[] = [];
    const ratio = (x.baseline_creatinine && x.baseline_creatinine>0) ? x.creatinine/x.baseline_creatinine : null;
    if (x.dialysis) { stage = 3; notes.push("RRT present"); }
    if (ratio != null) {
      if (ratio >= 3 || x.creatinine >= 4.0) { stage = Math.max(stage, 3); notes.push("Cr ≥3× baseline or ≥4.0"); }
      else if (ratio >= 2) { stage = Math.max(stage, 2); notes.push("Cr ≥2× baseline"); }
      else if (ratio >= 1.5) { stage = Math.max(stage, 1); notes.push("Cr ≥1.5× baseline"); }
    }
    const UO = x.urine_output_ml_per_kg_per_hr, h = x.oliguria_hours;
    if (typeof UO === "number" && typeof h === "number") {
      if (UO < 0.3 && h >= 24) { stage = Math.max(stage, 3); notes.push("UO <0.3 ≥24h"); }
      else if (UO < 0.5 && h >= 12) { stage = Math.max(stage, 2); notes.push("UO <0.5 ≥12h"); }
      else if (UO < 0.5 && h >= 6) { stage = Math.max(stage, 1); notes.push("UO <0.5 6–12h"); }
    }
    return { id: "kdigo_aki_stage", label: "KDIGO AKI stage", value: stage, unit: "stage", precision: 0, notes: notes.length?notes:["insufficient criteria"] };
  },
});

/** Hyponatremia tonicity classifier via measured serum osmolality */
register({
  id: "hyponatremia_tonicity",
  label: "Hyponatremia tonicity class",
  tags: ["electrolytes", "endocrine"],
  inputs: [
    { key: "Na", required: true },             // mmol/L
    { key: "measured_osm", required: true },   // mOsm/kg
  ],
  run: ({ Na, measured_osm }) => {
    let cls = "normotonic";
    if (measured_osm < 275) cls = "hypotonic";
    else if (measured_osm > 295) cls = "hypertonic";
    const notes = [`Na=${Na}`, `measured osmolality=${measured_osm} mOsm/kg`];
    return { id: "hyponatremia_tonicity", label: "Hyponatremia tonicity class", value: cls === "hypotonic" ? -1 : (cls === "hypertonic" ? 1 : 0), unit: "class", precision: 0, notes: [cls, ...notes] };
  },
});

/* =========================================================
   MED-EXT23 — K+ severity & renal K+ handling (TTKG)
   ========================================================= */

/** Hyperkalemia severity bands with optional ECG danger flag */
register({
  id: "hyperkalemia_severity",
  label: "Hyperkalemia severity",
  tags: ["electrolytes", "cardiology"],
  inputs: [
    { key: "potassium", required: true },       // mmol/L
    { key: "ekg_danger_signs" },                // boolean (peaked T, wide QRS, sine)
  ],
  run: ({ potassium, ekg_danger_signs }) => {
    const notes:string[] = [];
    if (potassium >= 6.5 || ekg_danger_signs) notes.push("severe hyperkalemia / ECG danger");
    else if (potassium >= 6.0) notes.push("moderate (≥6.0)");
    else if (potassium >= 5.5) notes.push("mild (5.5–5.9)");
    else notes.push("within reference");
    return { id: "hyperkalemia_severity", label: "Hyperkalemia severity", value: potassium, unit: "mmol/L", precision: 1, notes };
  },
});

/** TTKG helper = (Urine K / Plasma K) × (Plasma Osm / Urine Osm) */
register({
  id: "ttkg_helper",
  label: "TTKG (potassium handling)",
  tags: ["renal", "electrolytes"],
  inputs: [
    { key: "urine_K", required: true },          // mmol/L
    { key: "plasma_K", required: true },         // mmol/L
    { key: "urine_osm_measured", required: true }, // mOsm/kg
    { key: "measured_osm", required: true },     // mOsm/kg
  ],
  run: (x) => {
    if ([x.urine_K, x.plasma_K, x.urine_osm_measured, x.measured_osm].some(v => v == null) || x.plasma_K <= 0 || x.urine_osm_measured <= 0) return null;
    const t = (x.urine_K / x.plasma_K) * (x.measured_osm / x.urine_osm_measured);
    const notes:string[] = [];
    if (t < 3) notes.push("low TTKG: impaired distal K+ secretion");
    else if (t > 7) notes.push("high TTKG: appropriate aldosterone response");
    else notes.push("indeterminate band");
    return { id: "ttkg_helper", label: "TTKG (potassium handling)", value: t, unit: "index", precision: 2, notes };
  },
});

/* =========================================================
   MED-EXT24 — Hepatic scoring (Child-Pugh, MDF)
   ========================================================= */

/** Child-Pugh score (A/B/C bands); expects upstream to bin labs/ascites/encephalopathy to 1–3 each */
register({
  id: "child_pugh",
  label: "Child-Pugh",
  tags: ["hepatology", "risk"],
  inputs: [
    { key: "bilirubin_band", required: true },     // 1–3
    { key: "albumin_band", required: true },       // 1–3
    { key: "inr_band", required: true },           // 1–3
    { key: "ascites_band", required: true },       // 1–3
    { key: "encephalopathy_band", required: true } // 1–3
  ],
  run: (x) => {
    const total = x.bilirubin_band + x.albumin_band + x.inr_band + x.ascites_band + x.encephalopathy_band;
    const notes:string[] = [];
    const cls = total <= 6 ? "A" : total <= 9 ? "B" : "C";
    notes.push(`Class ${cls}`);
    return { id: "child_pugh", label: "Child-Pugh", value: total, unit: "points", precision: 0, notes };
  },
});

/** Maddrey Discriminant Function (MDF) = 4.6*(PT_prolongation) + bilirubin (mg/dL) */
register({
  id: "maddrey_df",
  label: "Maddrey DF",
  tags: ["hepatology", "risk"],
  inputs: [
    { key: "pt_prolongation_sec", required: true },
    { key: "bilirubin", required: true },
  ],
  run: ({ pt_prolongation_sec, bilirubin }) => {
    const df = 4.6 * pt_prolongation_sec + bilirubin;
    const notes:string[] = [];
    if (df >= 32) notes.push("severe alcoholic hepatitis band (DF ≥32)");
    else notes.push("lower DF band");
    return { id: "maddrey_df", label: "Maddrey DF", value: df, unit: "index", precision: 1, notes };
  },
});

/* =========================================================
   MED-EXT25 — AF & PCI risk tools (CHA2DS2-VASc, DAPT)
   ========================================================= */

/** CHA2DS2-VASc (AF stroke risk) */
register({
  id: "cha2ds2_vasc",
  label: "CHA₂DS₂-VASc",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "congestive_hf", required: true },
    { key: "hypertension", required: true },
    { key: "age_ge_75", required: true },         // +2
    { key: "diabetes", required: true },
    { key: "stroke_tia_thromboembolism", required: true }, // +2
    { key: "vascular_disease", required: true },
    { key: "age_65_74", required: true },
    { key: "sex_female", required: true },
  ],
  run: (x) => {
    let pts = 0;
    pts += x.congestive_hf?1:0;
    pts += x.hypertension?1:0;
    pts += x.age_ge_75?2:0;
    pts += x.diabetes?1:0;
    pts += x.stroke_tia_thromboembolism?2:0;
    pts += x.vascular_disease?1:0;
    pts += x.age_65_74?1:0;
    pts += x.sex_female?1:0;
    const notes = [pts >= 2 ? "elevated stroke risk (men≥2/women≥3 thresholds vary by policy)" : "lower stroke risk band"];
    return { id: "cha2ds2_vasc", label: "CHA₂DS₂-VASc", value: pts, unit: "points", precision: 0, notes };
  },
});

/** DAPT score (simplified surrogate) */
register({
  id: "dapt_surrogate",
  label: "DAPT score (surrogate)",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "age_ge_75", required: true },            // −2
    { key: "age_65_74", required: true },            // −1
    { key: "current_smoker", required: true },       // +1
    { key: "diabetes", required: true },             // +1
    { key: "mi_at_presentation", required: true },   // +1
    { key: "prior_pci_or_mi", required: true },      // +1
    { key: "stent_diameter_lt_3mm", required: true },// +1
    { key: "paclitaxel_eluting_stent", required: true }, // +1
    { key: "lvef_lt_30_or_saphenous_graft", required: true }, // +2
  ],
  run: (x) => {
    let s = 0;
    s += x.age_ge_75 ? -2 : 0;
    s += (x.age_65_74 && !x.age_ge_75) ? -1 : 0;
    s += x.current_smoker?1:0;
    s += x.diabetes?1:0;
    s += x.mi_at_presentation?1:0;
    s += x.prior_pci_or_mi?1:0;
    s += x.stent_diameter_lt_3mm?1:0;
    s += x.paclitaxel_eluting_stent?1:0;
    s += x.lvef_lt_30_or_saphenous_graft?2:0;
    const notes:string[] = [];
    if (s >= 2) notes.push("favors prolonged DAPT (surrogate)");
    else notes.push("does not favor prolonged DAPT (surrogate)");
    return { id: "dapt_surrogate", label: "DAPT score (surrogate)", value: s, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT26 — Lactate bands + TIMI STEMI (surrogate)
   ========================================================= */

/** Lactate severity bands */
register({
  id: "lactate_severity_band",
  label: "Lactate severity band",
  tags: ["sepsis", "critical_care"],
  inputs: [{ key: "lactate", required: true }],
  run: ({ lactate }) => {
    const notes:string[] = [];
    if (lactate >= 4) notes.push("very high (≥4 mmol/L)");
    else if (lactate >= 2) notes.push("elevated (2–3.9)");
    else notes.push("within reference band");
    return { id: "lactate_severity_band", label: "Lactate severity band", value: lactate, unit: "mmol/L", precision: 1, notes };
  },
});

/** TIMI STEMI surrogate (simple risk sum) */
register({
  id: "timi_stemi_surrogate",
  label: "TIMI STEMI (surrogate)",
  tags: ["cardiology", "risk"],
  inputs: [
    { key: "age_ge_65", required: true },
    { key: "diabetes_htn_angina", required: true },    // any
    { key: "sbp_lt_100", required: true },
    { key: "hr_gt_100", required: true },
    { key: "killip_ge_2", required: true },
    { key: "anterior_stemi_or_lbbb", required: true },
    { key: "time_to_tx_gt_4h", required: true },
  ],
  run: (x) => {
    const pts = Object.values(x).reduce((a,b)=>a+(b?1:0),0);
    const notes:string[] = [];
    if (pts >= 5) notes.push("high surrogate risk");
    else if (pts >= 3) notes.push("intermediate surrogate risk");
    else notes.push("low surrogate risk");
    return { id: "timi_stemi_surrogate", label: "TIMI STEMI (surrogate)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT27 — OB: Preeclampsia severe features flag
   ========================================================= */

/** Preeclampsia with severe features (biochemical/clinical flag) */
register({
  id: "preeclampsia_severe_flag",
  label: "Preeclampsia severe features (flag)",
  tags: ["obstetrics", "risk"],
  inputs: [
    { key: "sbp_ge_160_or_dbp_ge_110", required: true },
    { key: "platelets_lt_100", required: true },
    { key: "creatinine_gt_1_1_or_doubling", required: true },
    { key: "ast_alt_gt_2x_uln", required: true },
    { key: "pulmonary_edema", required: true },
    { key: "neuro_visual_symptoms", required: true },
  ],
  run: (x) => {
    const any = x.sbp_ge_160_or_dbp_ge_110 || x.platelets_lt_100 || x.creatinine_gt_1_1_or_doubling ||
                x.ast_alt_gt_2x_uln || x.pulmonary_edema || x.neuro_visual_symptoms;
    const notes = [any ? "severe features present (flag)" : "no severe features (by inputs)"];
    return { id: "preeclampsia_severe_flag", label: "Preeclampsia severe features (flag)", value: any?1:0, unit: "flag", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT28 — Compute FENa / FEUrea formulas (to feed gates)
   ========================================================= */

/** Fractional excretion of sodium (FENa %) = (UNa × SCr)/(SNa × UCr) × 100 */
register({
  id: "fena_calc",
  label: "FENa (calculated)",
  tags: ["renal", "electrolytes"],
  inputs: [
    { key: "urine_Na", required: true },
    { key: "serum_Na", required: true },
    { key: "urine_creatinine", required: true },
    { key: "serum_creatinine", required: true },
  ],
  run: (x) => {
    const fena = (x.urine_Na * x.serum_creatinine) / (x.serum_Na * x.urine_creatinine) * 100;
    return { id: "fena_calc", label: "FENa (calculated)", value: fena, unit: "%", precision: 2, notes: [] };
  },
});

/** Fractional excretion of urea (FEUrea %) = (UUrea × SCr)/(SUrea × UCr) × 100 */
register({
  id: "feurea_calc",
  label: "FEUrea (calculated)",
  tags: ["renal", "electrolytes"],
  inputs: [
    { key: "urine_urea", required: true },       // mg/dL (BUN units)
    { key: "serum_urea", required: true },       // mg/dL (BUN)
    { key: "urine_creatinine", required: true },
    { key: "serum_creatinine", required: true },
  ],
  run: (x) => {
    const fe = (x.urine_urea * x.serum_creatinine) / (x.serum_urea * x.urine_creatinine) * 100;
    return { id: "feurea_calc", label: "FEUrea (calculated)", value: fe, unit: "%", precision: 1, notes: [] };
  },
});

/* =========================================================
   MED-EXT29 — Basic AG calculator (feeds corrected AG tools)
   ========================================================= */

/** Serum anion gap = Na − (Cl + HCO₃) */
register({
  id: "anion_gap_calc",
  label: "Anion gap (calculated)",
  tags: ["acid-base", "electrolytes"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
  ],
  run: ({ Na, Cl, HCO3 }) => {
    const ag = Na - (Cl + HCO3);
    const notes:string[] = [];
    if (ag > 12) notes.push("elevated AG (lab-specific ranges vary)");
    else notes.push("within reference");
    return { id: "anion_gap_calc", label: "Anion gap (calculated)", value: ag, unit: "mmol/L", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT30 — Finish: tiny vitals helper (RR category)
   ========================================================= */

/** Respiratory rate category (adult) */
register({
  id: "rr_category_adult",
  label: "Respiratory rate category (adult)",
  tags: ["vitals"],
  inputs: [{ key: "RRr", required: true }],
  run: ({ RRr }) => {
    const notes:string[] = [];
    if (RRr <= 8) notes.push("bradypnea");
    else if (RRr <= 20) notes.push("normal");
    else if (RRr <= 24) notes.push("tachypnea (mild)");
    else notes.push("tachypnea (moderate–severe)");
    return { id: "rr_category_adult", label: "Respiratory rate category (adult)", value: RRr, unit: "breaths/min", precision: 0, notes };
  },
});

// ===================== MED-EXT31–40 (APPEND-ONLY) =====================
/* =========================================================
   MED-EXT31 — Stroke & Neuro Imaging Rules
   ========================================================= */

/** NIHSS severity bands (uses total NIHSS) */
register({
  id: "nihss_band",
  label: "NIHSS severity band",
  tags: ["neurology", "stroke"],
  inputs: [{ key: "nihss_total", required: true }],
  run: ({ nihss_total }) => {
    const notes:string[] = [];
    if (nihss_total >= 25) notes.push("very severe");
    else if (nihss_total >= 16) notes.push("severe");
    else if (nihss_total >= 5) notes.push("moderate");
    else notes.push("minor");
    return { id: "nihss_band", label: "NIHSS severity band", value: nihss_total, unit: "points", precision: 0, notes };
  },
});

/** Canadian CT Head Rule simplified flag */
register({
  id: "canadian_ct_head_flag",
  label: "Canadian CT Head Rule (flag)",
  tags: ["trauma", "neurology"],
  inputs: [
    { key: "gcs_lt_15_2h", required: true },
    { key: "suspected_open_depressed_skull", required: true },
    { key: "signs_basilar_skull", required: true },
    { key: "vomiting_ge_2", required: true },
    { key: "age_ge_65", required: true },
  ],
  run: (x) => {
    const pos = x.gcs_lt_15_2h || x.suspected_open_depressed_skull || x.signs_basilar_skull || x.vomiting_ge_2 || x.age_ge_65;
    return { id: "canadian_ct_head_flag", label: "Canadian CT Head Rule (flag)", value: pos?1:0, unit: "flag", precision: 0, notes: [pos?"positive":"negative"] };
  },
});

/* =========================================================
   MED-EXT32 — Trauma & Orthopedic
   ========================================================= */

/** Ottawa Ankle Rule simplified */
register({
  id: "ottawa_ankle_flag",
  label: "Ottawa Ankle Rule (flag)",
  tags: ["trauma", "orthopedics"],
  inputs: [
    { key: "malleolar_pain", required: true },
    { key: "bone_tenderness_posterior_tibia_fibula", required: true },
    { key: "unable_weightbear_4steps", required: true },
  ],
  run: (x) => {
    const pos = x.malleolar_pain && (x.bone_tenderness_posterior_tibia_fibula || x.unable_weightbear_4steps);
    return { id: "ottawa_ankle_flag", label: "Ottawa Ankle Rule (flag)", value: pos?1:0, unit: "flag", precision: 0, notes: [pos?"positive":"negative"] };
  },
});

/* =========================================================
   MED-EXT33 — Burns & Pediatrics
   ========================================================= */

/** Parkland burn formula (fluid in 24h) = 4 mL × weight (kg) × %TBSA */
register({
  id: "parkland_formula",
  label: "Parkland burn formula",
  tags: ["burns", "critical_care"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "tbsa_percent", required: true },
  ],
  run: ({ weight_kg, tbsa_percent }) => {
    const vol = 4 * weight_kg * tbsa_percent;
    return { id: "parkland_formula", label: "Parkland burn formula", value: vol, unit: "mL (24h)", precision: 0, notes: ["half in first 8h, rest over 16h"] };
  },
});

/** Pediatric maintenance fluids (4-2-1 rule, mL/h) */
register({
  id: "peds_421_fluids",
  label: "Pediatric maintenance fluids (4-2-1 rule)",
  tags: ["pediatrics", "fluids"],
  inputs: [{ key: "weight_kg", required: true }],
  run: ({ weight_kg }) => {
    let rate = 0;
    if (weight_kg <= 10) rate = 4 * weight_kg;
    else if (weight_kg <= 20) rate = 40 + 2*(weight_kg-10);
    else rate = 60 + (weight_kg-20);
    return { id: "peds_421_fluids", label: "Pediatric maintenance fluids (4-2-1 rule)", value: rate, unit: "mL/h", precision: 0, notes: [] };
  },
});

/* =========================================================
   MED-EXT34 — Oncology risk scores
   ========================================================= */

/** Caprini VTE risk (surgical patients, surrogate sum) */
register({
  id: "caprini_vte_surrogate",
  label: "Caprini VTE risk (surrogate)",
  tags: ["oncology", "hematology", "risk"],
  inputs: [{ key: "risk_points", required: true }],
  run: ({ risk_points }) => {
    const notes:string[] = [];
    if (risk_points >= 5) notes.push("highest risk");
    else if (risk_points >= 3) notes.push("moderate–high risk");
    else notes.push("low risk");
    return { id: "caprini_vte_surrogate", label: "Caprini VTE risk (surrogate)", value: risk_points, unit: "points", precision: 0, notes };
  },
});

/** MASCC febrile neutropenia risk index (simplified) */
register({
  id: "mascc_fn_surrogate",
  label: "MASCC FN risk (surrogate)",
  tags: ["oncology", "risk"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 21 ? "low risk (MASCC ≥21)" : "high risk (<21)"];
    return { id: "mascc_fn_surrogate", label: "MASCC FN risk (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT35 — Endocrine: thyroid & adrenal
   ========================================================= */

/** Corrected calcium by albumin (repeat to ensure availability) */
register({
  id: "corrected_calcium2",
  label: "Corrected calcium (albumin)",
  tags: ["endocrine", "electrolytes"],
  inputs: [
    { key: "calcium", required: true },
    { key: "albumin", required: true },
  ],
  run: ({ calcium, albumin }) => {
    if ([calcium, albumin].some(v=>v==null)) return null;
    return { id: "corrected_calcium2", label: "Corrected calcium (albumin)", value: calcium + 0.8*(4 - albumin), unit: "mg/dL", precision: 1, notes: [] };
  },
});

/** Thyroid storm (Burch-Wartofsky surrogate score) */
register({
  id: "thyroid_storm_surrogate",
  label: "Thyroid storm surrogate",
  tags: ["endocrine", "risk"],
  inputs: [{ key: "bwps_score", required: true }],
  run: ({ bwps_score }) => {
    const notes = [bwps_score >= 45 ? "thyroid storm likely" : bwps_score >= 25 ? "impending storm" : "unlikely"];
    return { id: "thyroid_storm_surrogate", label: "Thyroid storm surrogate", value: bwps_score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT36 — ICU: Sepsis/ARDS adjuncts
   ========================================================= */

/** qSOFA score (0–3) */
register({
  id: "qsofa",
  label: "qSOFA",
  tags: ["sepsis", "icu_scores"],
  inputs: [
    { key: "sbp_le_100", required: true },
    { key: "rr_ge_22", required: true },
    { key: "gcs_le_14", required: true },
  ],
  run: (x) => {
    const score = [x.sbp_le_100, x.rr_ge_22, x.gcs_le_14].filter(Boolean).length;
    return { id: "qsofa", label: "qSOFA", value: score, unit: "points", precision: 0, notes: [score>=2?"high risk":"lower risk"] };
  },
});

/** Berlin ARDS classification via PF ratio */
register({
  id: "berlin_ards_class",
  label: "Berlin ARDS class",
  tags: ["pulmonary", "icu_scores"],
  inputs: [{ key: "pf_ratio", required: true }],
  run: ({ pf_ratio }) => {
    const notes:string[] = [];
    if (pf_ratio < 100) notes.push("severe ARDS");
    else if (pf_ratio < 200) notes.push("moderate ARDS");
    else if (pf_ratio <= 300) notes.push("mild ARDS");
    else notes.push("not ARDS by PF");
    return { id: "berlin_ards_class", label: "Berlin ARDS class", value: pf_ratio, unit: "mmHg", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT37 — Nutrition
   ========================================================= */

/** BMI = weight / height² */
register({
  id: "bmi_calc",
  label: "Body Mass Index",
  tags: ["nutrition", "general"],
  inputs: [
    { key: "weight_kg", required: true },
    { key: "height_cm", required: true },
  ],
  run: ({ weight_kg, height_cm }) => {
    if ([weight_kg, height_cm].some(v=>v==null) || height_cm<=0) return null;
    const bmi = weight_kg / ((height_cm/100)**2);
    const notes:string[] = [];
    if (bmi >= 30) notes.push("obese");
    else if (bmi >= 25) notes.push("overweight");
    else if (bmi >= 18.5) notes.push("normal");
    else notes.push("underweight");
    return { id: "bmi_calc", label: "Body Mass Index", value: bmi, unit: "kg/m²", precision: 1, notes };
  },
});

/* =========================================================
   MED-EXT38 — Hematology
   ========================================================= */

/** ANC = WBC × (%neutrophils + %bands)/100 */
register({
  id: "anc_calc",
  label: "Absolute neutrophil count (ANC)",
  tags: ["hematology"],
  inputs: [
    { key: "WBC", required: true },           // ×10^3/µL
    { key: "pct_neutrophils", required: true },
    { key: "pct_bands", required: true },
  ],
  run: (x) => {
    const anc = x.WBC * (x.pct_neutrophils + x.pct_bands)/100;
    const notes:string[] = [];
    if (anc < 0.5) notes.push("severe neutropenia (<500/µL)");
    else if (anc < 1.0) notes.push("moderate neutropenia");
    else if (anc < 1.5) notes.push("mild neutropenia");
    else notes.push("normal");
    return { id: "anc_calc", label: "Absolute neutrophil count (ANC)", value: anc, unit: "×10^3/µL", precision: 2, notes };
  },
});

/* =========================================================
   MED-EXT39 — Obstetrics
   ========================================================= */

/** Bishop score (cervical favorability; input total from 0–13) */
register({
  id: "bishop_score_band",
  label: "Bishop score band",
  tags: ["obstetrics", "risk"],
  inputs: [{ key: "bishop_score", required: true }],
  run: ({ bishop_score }) => {
    const notes:string[] = [];
    if (bishop_score >= 9) notes.push("favorable");
    else if (bishop_score >= 5) notes.push("intermediate");
    else notes.push("unfavorable");
    return { id: "bishop_score_band", label: "Bishop score band", value: bishop_score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT40 — General ICU severity
   ========================================================= */

/** APACHE II surrogate (0–71, simplified sum input) */
register({
  id: "apache2_surrogate",
  label: "APACHE II (surrogate)",
  tags: ["icu_scores", "risk"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes:string[] = [];
    if (score >= 30) notes.push("very high mortality band");
    else if (score >= 20) notes.push("high risk");
    else if (score >= 10) notes.push("moderate");
    else notes.push("low");
    return { id: "apache2_surrogate", label: "APACHE II (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

// ===================== MED-EXT41–50 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* =========================================================
   MED-EXT41 — Geriatrics / Frailty
   ========================================================= */

/** Charlson Comorbidity Index surrogate */
register({
  id: "charlson_surrogate",
  label: "Charlson Comorbidity Index (surrogate)",
  tags: ["geriatrics", "risk"],
  inputs: [{ key: "points", required: true }],
  run: ({ points }) => {
    const notes = [points >= 5 ? "high burden" : points >= 3 ? "moderate" : "low"];
    return { id: "charlson_surrogate", label: "Charlson Comorbidity Index (surrogate)", value: points, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT42 — Trauma Scores
   ========================================================= */

/** Revised Trauma Score (RTS surrogate input 0–12) */
register({
  id: "rts_surrogate",
  label: "Revised Trauma Score (surrogate)",
  tags: ["trauma", "icu_scores"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score <= 4 ? "very high mortality risk" : score <= 6 ? "high" : score <= 10 ? "moderate" : "low"];
    return { id: "rts_surrogate", label: "Revised Trauma Score (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/** Injury Severity Score (ISS surrogate) */
register({
  id: "iss_surrogate",
  label: "Injury Severity Score (surrogate)",
  tags: ["trauma", "icu_scores"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 25 ? "very severe" : score >= 16 ? "severe" : score >= 9 ? "moderate" : "minor"];
    return { id: "iss_surrogate", label: "Injury Severity Score (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT43 — Dialysis adequacy
   ========================================================= */

/** Kt/V (dialysis adequacy surrogate) */
register({
  id: "ktv_surrogate",
  label: "Kt/V (dialysis adequacy surrogate)",
  tags: ["renal", "dialysis"],
  inputs: [{ key: "ktv", required: true }],
  run: ({ ktv }) => {
    const notes = [ktv >= 1.2 ? "adequate dialysis dose (surrogate)" : "suboptimal dialysis dose (surrogate)"];
    return { id: "ktv_surrogate", label: "Kt/V (dialysis adequacy surrogate)", value: ktv, unit: "index", precision: 2, notes };
  },
});

/* =========================================================
   MED-EXT44 — Hematology/Coagulation
   ========================================================= */

/** INR banding */
register({
  id: "inr_band",
  label: "INR band",
  tags: ["hematology", "coagulation"],
  inputs: [{ key: "INR", required: true }],
  run: ({ INR }) => {
    const notes:string[] = [];
    if (INR >= 4.5) notes.push("very high");
    else if (INR >= 3.0) notes.push("high");
    else if (INR >= 2.0) notes.push("therapeutic (common for AF/VTE)");
    else notes.push("subtherapeutic");
    return { id: "inr_band", label: "INR band", value: INR, unit: "ratio", precision: 2, notes };
  },
});

/** D-dimer interpretation (age-adjusted if age provided) */
register({
  id: "ddimer_interp",
  label: "D-dimer interpretation",
  tags: ["hematology", "pulmonary"],
  inputs: [
    { key: "ddimer_ng_ml", required: true },
    { key: "age", required: false },
  ],
  run: ({ ddimer_ng_ml, age }) => {
    let cutoff = 500;
    if (age && age > 50) cutoff = age*10; // age-adjusted
    const pos = ddimer_ng_ml > cutoff;
    const notes = [`cutoff=${cutoff} ng/mL`, pos?"positive":"negative"];
    return { id: "ddimer_interp", label: "D-dimer interpretation", value: pos?1:0, unit: "flag", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT45 — Neonatal
   ========================================================= */

/** APGAR banding (0–10) */
register({
  id: "apgar_band",
  label: "APGAR band",
  tags: ["neonatal", "risk"],
  inputs: [{ key: "apgar_total", required: true }],
  run: ({ apgar_total }) => {
    const notes = [apgar_total <= 3 ? "low" : apgar_total <= 6 ? "intermediate" : "normal"];
    return { id: "apgar_band", label: "APGAR band", value: apgar_total, unit: "points", precision: 0, notes };
  },
});

/** Ballard score surrogate (prematurity) */
register({
  id: "ballard_surrogate",
  label: "Ballard score (surrogate)",
  tags: ["neonatal"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const weeks = 20 + Math.round(score/5); // surrogate mapping
    return { id: "ballard_surrogate", label: "Ballard score (surrogate)", value: weeks, unit: "weeks GA (approx)", precision: 0, notes: [] };
  },
});

/* =========================================================
   MED-EXT46 — Endocrine / Metabolic
   ========================================================= */

/** HOMA-IR = (Glucose mg/dL × Insulin μU/mL) / 405 */
register({
  id: "homa_ir",
  label: "HOMA-IR",
  tags: ["endocrine", "metabolic"],
  inputs: [
    { key: "glucose", required: true },
    { key: "insulin", required: true },
  ],
  run: ({ glucose, insulin }) => {
    const val = (glucose * insulin) / 405;
    const notes = [val >= 2.5 ? "insulin resistance (surrogate cutoff)" : "within reference"];
    return { id: "homa_ir", label: "HOMA-IR", value: val, unit: "index", precision: 2, notes };
  },
});

/* =========================================================
   MED-EXT47 — ICU / Risk
   ========================================================= */

/** NEWS2 score surrogate */
register({
  id: "news2_surrogate",
  label: "NEWS2 (surrogate)",
  tags: ["icu_scores", "risk"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 7 ? "high risk" : score >= 5 ? "medium" : "low"];
    return { id: "news2_surrogate", label: "NEWS2 (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT48 — Pulmonary / Oxygenation
   ========================================================= */

/** Alveolar-arterial (A–a) gradient simplified */
register({
  id: "aa_gradient",
  label: "A–a gradient (simplified)",
  tags: ["pulmonary", "acid-base"],
  inputs: [
    { key: "PaO2", required: true },
    { key: "FiO2", required: true }, // fraction 0–1
    { key: "PaCO2", required: true },
  ],
  run: ({ PaO2, FiO2, PaCO2 }) => {
    const PAO2 = FiO2*713 - PaCO2/0.8; // alveolar gas equation simplified
    const grad = PAO2 - PaO2;
    const notes = [grad > 20 ? "elevated A–a" : "normal"];
    return { id: "aa_gradient", label: "A–a gradient (simplified)", value: grad, unit: "mmHg", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT49 — Misc Risk
   ========================================================= */

/** Wells DVT simplified score input */
register({
  id: "wells_dvt_surrogate",
  label: "Wells DVT (surrogate)",
  tags: ["hematology", "risk"],
  inputs: [{ key: "points", required: true }],
  run: ({ points }) => {
    const notes = [points >= 3 ? "high prob" : points >= 1 ? "moderate" : "low"];
    return { id: "wells_dvt_surrogate", label: "Wells DVT (surrogate)", value: points, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT50 — General / Vitals
   ========================================================= */

/** Shock index pediatric band (HR/SBP, age input for cutoffs) */
register({
  id: "shock_index_peds",
  label: "Shock Index (pediatric surrogate)",
  tags: ["pediatrics", "hemodynamics"],
  inputs: [
    { key: "HR", required: true },
    { key: "SBP", required: true },
    { key: "age", required: true },
  ],
  run: ({ HR, SBP, age }) => {
    if (!HR || !SBP || SBP<=0) return null;
    const si = HR / SBP;
    const cutoff = age<6 ? 1.2 : 0.9;
    const notes = [si>cutoff ? "elevated SI for age" : "within ref"];
    return { id: "shock_index_peds", label: "Shock Index (pediatric surrogate)", value: si, unit: "ratio", precision: 2, notes };
  },
});

// ===================== MED-EXT51–60 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* =========================================================
   MED-EXT51 — NEXUS C-Spine (alternative to CCR)
   ========================================================= */

/** NEXUS C-spine rule: imaging NOT required only if ALL are true:
    - no midline tenderness, no intoxication, normal alertness, no focal neuro deficit, no distracting injury */
register({
  id: "nexus_cspine_flag",
  label: "NEXUS C-Spine Rule (flag)",
  tags: ["trauma", "risk"],
  inputs: [
    { key: "no_midline_tenderness", required: true },
    { key: "no_intoxication", required: true },
    { key: "normal_alertness", required: true },
    { key: "no_focal_neuro_deficit", required: true },
    { key: "no_distracting_injury", required: true },
  ],
  run: (x) => {
    const allSafe = x.no_midline_tenderness && x.no_intoxication && x.normal_alertness && x.no_focal_neuro_deficit && x.no_distracting_injury;
    // value: 0 = no imaging by NEXUS; 1 = imaging indicated
    const notes = [allSafe ? "All low-risk present — no imaging by NEXUS" : "One or more criteria absent — imaging indicated"];
    return { id: "nexus_cspine_flag", label: "NEXUS C-Spine Rule (flag)", value: allSafe ? 0 : 1, unit: "flag", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT52 — Platelet bands
   ========================================================= */

/** Platelet severity bands */
register({
  id: "platelet_band",
  label: "Platelet count band",
  tags: ["hematology", "risk"],
  inputs: [{ key: "platelets", required: true }], // ×10^3/µL
  run: ({ platelets }) => {
    const notes:string[] = [];
    if (platelets < 10) notes.push("critical thrombocytopenia (<10)");
    else if (platelets < 20) notes.push("severe (10–19)");
    else if (platelets < 50) notes.push("moderate (20–49)");
    else if (platelets < 100) notes.push("mild (50–99)");
    else notes.push("within/near reference (≥100)");
    return { id: "platelet_band", label: "Platelet count band", value: platelets, unit: "×10^3/µL", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT53 — DIC (ISTH simplified surrogate)
   ========================================================= */

/** DIC score surrogate using coarse bins:
    - Platelets: ≥100=0, 50–99=1, <50=2
    - D-dimer/FDP: normal=0, moderate=2, strong=3  (pass as 'ddimer_band': 0|2|3)
    - PT prolongation: <3s=0, 3–6s=1, >6s=2
    - Fibrinogen: ≥100 mg/dL=0, <100=1
    Score ≥5 -> overt DIC (surrogate, not diagnostic) */
register({
  id: "dic_surrogate",
  label: "DIC score (surrogate)",
  tags: ["hematology", "coagulation", "risk"],
  inputs: [
    { key: "platelets", required: true },        // ×10^3/µL
    { key: "ddimer_band", required: true },      // 0|2|3
    { key: "pt_prolong_sec", required: true },   // seconds above control
    { key: "fibrinogen", required: true },       // mg/dL
  ],
  run: (x) => {
    const pltPts = x.platelets < 50 ? 2 : (x.platelets < 100 ? 1 : 0);
    const ddPts = x.ddimer_band; // expect 0,2,3
    const ptPts = x.pt_prolong_sec > 6 ? 2 : (x.pt_prolong_sec >= 3 ? 1 : 0);
    const fibPts = x.fibrinogen < 100 ? 1 : 0;
    const total = pltPts + ddPts + ptPts + fibPts;
    const notes = [total >= 5 ? "overt DIC (surrogate) ≥5" : "non-overt (surrogate)"];
    return { id: "dic_surrogate", label: "DIC score (surrogate)", value: total, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT54 — Urine anion gap
   ========================================================= */

/** Urine anion gap (UAG) = UNa + UK − UCl
    Negative UAG suggests high urinary NH4+ (e.g., diarrhea). Positive suggests RTA in NAGMA context. */
register({
  id: "urine_anion_gap",
  label: "Urine anion gap",
  tags: ["renal", "acid-base"],
  inputs: [
    { key: "urine_Na", required: true }, // mmol/L
    { key: "urine_K", required: true },  // mmol/L
    { key: "urine_Cl", required: true }, // mmol/L
  ],
  run: ({ urine_Na, urine_K, urine_Cl }) => {
    const uag = urine_Na + urine_K - urine_Cl;
    const notes:string[] = [];
    if (uag < 0) notes.push("negative UAG → ↑ urinary NH4+ (diarrhea pattern)");
    else notes.push("positive/zero UAG → consider RTA if NAGMA");
    return { id: "urine_anion_gap", label: "Urine anion gap", value: uag, unit: "mmol/L", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT55 — Free water deficit (uses provided TBW factor)
   ========================================================= */

/** Free Water Deficit ≈ TBW × (Na/140 − 1)
    Provide TBW directly or via factor×weight: TBW = tbw_factor * weight_kg */
register({
  id: "free_water_deficit",
  label: "Free water deficit",
  tags: ["electrolytes", "fluids"],
  inputs: [
    { key: "Na", required: true },              // mmol/L
    { key: "tbw_liters" },                      // optional direct
    { key: "weight_kg" },                       // optional if using factor
    { key: "tbw_factor" },                      // e.g., adult M 0.6, adult F 0.5 (clinician supplies)
  ],
  run: ({ Na, tbw_liters, weight_kg, tbw_factor }) => {
    let TBW = tbw_liters;
    if (TBW == null && weight_kg != null && tbw_factor != null) TBW = tbw_factor * weight_kg;
    if (TBW == null) return { id: "free_water_deficit", label: "Free water deficit", value: 0, unit: "L", precision: 1, notes: ["Provide tbw_liters or (weight_kg & tbw_factor)"] };
    const deficit = TBW * (Na/140 - 1);
    return { id: "free_water_deficit", label: "Free water deficit", value: deficit, unit: "L", precision: 1, notes: [] };
  },
});

/* =========================================================
   MED-EXT56 — MuLBSTA (viral pneumonia mortality) surrogate
   ========================================================= */

/** MuLBSTA surrogate: sum of present risk elements (0–6)
    Elements (booleans expected here):
    - multilobular_infiltrates, lymphopenia, bacterial_coinfection,
      smoking_history, hypertension, age_ge_60 */
register({
  id: "mulbsta_surrogate",
  label: "MuLBSTA (surrogate)",
  tags: ["pulmonary", "infectious_disease", "risk"],
  inputs: [
    { key: "multilobular_infiltrates", required: true },
    { key: "lymphopenia", required: true },
    { key: "bacterial_coinfection", required: true },
    { key: "smoking_history", required: true },
    { key: "hypertension", required: true },
    { key: "age_ge_60", required: true },
  ],
  run: (x) => {
    const pts = Object.values(x).reduce((a,b)=>a+(b?1:0),0);
    const notes:string[] = [];
    if (pts >= 4) notes.push("high surrogate risk");
    else if (pts >= 2) notes.push("intermediate surrogate risk");
    else notes.push("low surrogate risk");
    return { id: "mulbsta_surrogate", label: "MuLBSTA (surrogate)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT57 — Sgarbossa (LBBB/ventricular-paced MI) simplified
   ========================================================= */

/** Sgarbossa simplified (flag):
    Positive if ANY:
    - concordant_ST_elev_ge_1mm
    - concordant_ST_depr_V1toV3_ge_1mm
    - excessively_discordant_ST_elev_ge_5mm */
register({
  id: "sgarbossa_flag",
  label: "Sgarbossa criteria (flag, simplified)",
  tags: ["cardiology", "ecg", "risk"],
  inputs: [
    { key: "concordant_ST_elev_ge_1mm", required: true },
    { key: "concordant_ST_depr_V1toV3_ge_1mm", required: true },
    { key: "excessively_discordant_ST_elev_ge_5mm", required: true },
  ],
  run: (x) => {
    const pos = x.concordant_ST_elev_ge_1mm || x.concordant_ST_depr_V1toV3_ge_1mm || x.excessively_discordant_ST_elev_ge_5mm;
    const notes = [pos ? "Sgarbossa positive (consider acute MI in LBBB/VP)" : "Sgarbossa negative"];
    return { id: "sgarbossa_flag", label: "Sgarbossa criteria (flag, simplified)", value: pos?1:0, unit: "flag", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT58 — PERC (PE rule-out criteria) flag
   ========================================================= */

/** PERC: Rule out PE in *low pretest* only if ALL eight are true:
    age<50, HR<100, SaO2≥95, no hemoptysis, no estrogen use,
    no prior DVT/PE, no unilateral leg swelling, no recent surgery/trauma */
register({
  id: "perc_flag",
  label: "PERC rule (flag)",
  tags: ["pulmonary", "risk"],
  inputs: [
    { key: "age_lt_50", required: true },
    { key: "hr_lt_100", required: true },
    { key: "sao2_ge_95", required: true },
    { key: "no_hemoptysis", required: true },
    { key: "no_estrogen_use", required: true },
    { key: "no_prior_dvt_pe", required: true },
    { key: "no_unilateral_leg_swelling", required: true },
    { key: "no_recent_surgery_trauma", required: true },
  ],
  run: (x) => {
    const all = x.age_lt_50 && x.hr_lt_100 && x.sao2_ge_95 && x.no_hemoptysis && x.no_estrogen_use && x.no_prior_dvt_pe && x.no_unilateral_leg_swelling && x.no_recent_surgery_trauma;
    const notes = [all ? "PERC negative — in low pretest can rule out without D-dimer" : "PERC positive/indeterminate"];
    // value: 1 means "PERC negative (passes all)" to align with 'rule-out achieved' signaling
    return { id: "perc_flag", label: "PERC rule (flag)", value: all ? 1 : 0, unit: "flag", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT59 — Fractional excretion of phosphate (FEPO₄)
   ========================================================= */

/** FEPO4 (%) = (U_PO4 × S_Cr) / (S_PO4 × U_Cr) × 100 */
register({
  id: "fepo4",
  label: "FEPO₄",
  tags: ["renal", "electrolytes"],
  inputs: [
    { key: "urine_phosphate", required: true },    // mg/dL or mmol/L (consistent units serum/urine)
    { key: "serum_phosphate", required: true },
    { key: "urine_creatinine", required: true },
    { key: "serum_creatinine", required: true },
  ],
  run: (x) => {
    if ([x.urine_phosphate, x.serum_phosphate, x.urine_creatinine, x.serum_creatinine].some(v => v == null) || x.serum_phosphate <= 0 || x.urine_creatinine <= 0) return null;
    const fe = (x.urine_phosphate * x.serum_creatinine) / (x.serum_phosphate * x.urine_creatinine) * 100;
    const notes:string[] = [];
    if (fe > 20) notes.push("renal phosphate wasting pattern (>20%)");
    else notes.push("non-wasting pattern (≤20%)");
    return { id: "fepo4", label: "FEPO₄", value: fe, unit: "%", precision: 1, notes };
  },
});

/* =========================================================
   MED-EXT60 — Hepatorenal syndrome (support pattern)
   ========================================================= */

/** HRS support flag (informational, non-diagnostic)
    Inputs reflect typical criteria presence/absence. Flag if pattern supportive. */
register({
  id: "hrs_support_flag",
  label: "Hepatorenal syndrome (support pattern)",
  tags: ["hepatology", "renal", "risk"],
  inputs: [
    { key: "cirrhosis_ascites", required: true },
    { key: "aki_present", required: true },
    { key: "no_shock", required: true },
    { key: "no_nephrotoxins", required: true },
    { key: "no_structural_kidney_disease", required: true }, // e.g., minimal protein/hematuria, normal US
  ],
  run: (x) => {
    const supportive = x.cirrhosis_ascites && x.aki_present && x.no_shock && x.no_nephrotoxins && x.no_structural_kidney_disease;
    const notes = [supportive ? "pattern supportive of HRS — clinical confirmation required" : "pattern not supportive"];
    return { id: "hrs_support_flag", label: "Hepatorenal syndrome (support pattern)", value: supportive?1:0, unit: "flag", precision: 0, notes };
  },
});

// ===================== MED-EXT110–130 (APPEND-ONLY) =====================
/* If this import already exists at file top, remove this line. */

/* =========================================================
   MED-EXT110 — MELD-Na (2016 update) 
   MELD-Na(2016) = MELD + 1.32*(137-Na) − [0.033*MELD*(137-Na)]
   where MELD = 3.78*ln(bilirubin) + 11.2*ln(INR) + 9.57*ln(creatinine) + 6.43
   Clamp labs per convention: bili/INR/Cr min 1.0; Na clamp [125,137].
   ========================================================= */
register({
  id: "meld_na_2016",
  label: "MELD-Na (2016)",
  tags: ["hepatology", "icu_scores"],
  inputs: [
    { key: "bilirubin", required: true }, // mg/dL
    { key: "INR", required: true },
    { key: "creatinine", required: true }, // mg/dL
    { key: "Na", required: true },         // mmol/L
  ],
  run: ({ bilirubin, INR, creatinine, Na }) => {
    if ([bilirubin, INR, creatinine, Na].some(v => v == null)) return null;
    const b = Math.max(1, bilirubin);
    const i = Math.max(1, INR);
    const c = Math.max(1, creatinine);
    const na = Math.max(125, Math.min(137, Na));
    const meld = 3.78*Math.log(b) + 11.2*Math.log(i) + 9.57*Math.log(c) + 6.43;
    const adj = 1.32*(137 - na) - (0.033 * meld * (137 - na));
    const meldNa = Math.round(meld + adj);
    const notes:string[] = [];
    if (meldNa >= 30) notes.push("very high severity");
    else if (meldNa >= 20) notes.push("high severity");
    else if (meldNa >= 10) notes.push("moderate");
    else notes.push("lower");
    return { id: "meld_na_2016", label: "MELD-Na (2016)", value: meldNa, unit: "score", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT111 — CLIF-C ACLF (surrogate index)
   ========================================================= */
register({
  id: "clif_c_aclf_surrogate",
  label: "CLIF-C ACLF (surrogate)",
  tags: ["hepatology", "icu_scores"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 60 ? "very high" : score >= 50 ? "high" : score >= 40 ? "moderate" : "lower"];
    return { id: "clif_c_aclf_surrogate", label: "CLIF-C ACLF (surrogate)", value: score, unit: "index", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT112 — PELOD-2 (pediatric organ dysfunction) surrogate
   ========================================================= */
register({
  id: "pelod2_surrogate",
  label: "PELOD-2 (surrogate)",
  tags: ["pediatrics", "icu_scores"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 10 ? "high" : score >= 5 ? "moderate" : "low"];
    return { id: "pelod2_surrogate", label: "PELOD-2 (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT113 — SNAPPE-II (neonatal) surrogate
   ========================================================= */
register({
  id: "snappE2_surrogate",
  label: "SNAPPE-II (surrogate)",
  tags: ["neonatal", "icu_scores"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 50 ? "very high" : score >= 30 ? "high" : score >= 20 ? "moderate" : "low"];
    return { id: "snappE2_surrogate", label: "SNAPPE-II (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT114 — SCORTEN (TEN) — criteria count 0–7
   ========================================================= */
register({
  id: "scorten_ten",
  label: "SCORTEN (TEN) criteria count",
  tags: ["dermatology", "risk"],
  inputs: [{ key: "criteria_met", required: true }], // 0–7
  run: ({ criteria_met }) => {
    const notes = [criteria_met >= 5 ? "very high risk" : criteria_met >= 3 ? "high risk" : "lower risk"];
    return { id: "scorten_ten", label: "SCORTEN (TEN) criteria count", value: criteria_met, unit: "criteria", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT115 — Glasgow–Imrie pancreatitis score (criteria count)
   ========================================================= */
register({
  id: "glasgow_imrie_surrogate",
  label: "Glasgow–Imrie (pancreatitis) criteria",
  tags: ["gastroenterology", "risk"],
  inputs: [{ key: "criteria_met_48h", required: true }], // 0–8 typical
  run: ({ criteria_met_48h }) => {
    const notes = [criteria_met_48h >= 3 ? "severe risk band" : "milder band"];
    return { id: "glasgow_imrie_surrogate", label: "Glasgow–Imrie (pancreatitis) criteria", value: criteria_met_48h, unit: "criteria", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT116 — ICNARC (surrogate severity band)
   ========================================================= */
register({
  id: "icnarc_surrogate",
  label: "ICNARC severity (surrogate)",
  tags: ["icu_scores", "risk"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 30 ? "very high" : score >= 20 ? "high" : score >= 10 ? "moderate" : "low"];
    return { id: "icnarc_surrogate", label: "ICNARC severity (surrogate)", value: score, unit: "index", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT117 — LODS (Logistic Organ Dysfunction) surrogate
   ========================================================= */
register({
  id: "lods_surrogate",
  label: "LODS (surrogate)",
  tags: ["icu_scores", "risk"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 10 ? "high" : score >= 6 ? "moderate" : "low"];
    return { id: "lods_surrogate", label: "LODS (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT118 — Pediatric Trauma Score (PTS) band
   ========================================================= */
register({
  id: "pediatric_trauma_score",
  label: "Pediatric Trauma Score (band)",
  tags: ["pediatrics", "trauma"],
  inputs: [{ key: "pts", required: true }], // −6 to +12
  run: ({ pts }) => {
    const notes = [pts <= 0 ? "very severe" : pts <= 5 ? "severe" : pts <= 8 ? "moderate" : "mild"];
    return { id: "pediatric_trauma_score", label: "Pediatric Trauma Score (band)", value: pts, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT119 — Ottawa Knee Rule (flag)
   ========================================================= */
register({
  id: "ottawa_knee_flag",
  label: "Ottawa Knee Rule (flag)",
  tags: ["trauma", "orthopedics"],
  inputs: [
    { key: "age_ge_55", required: true },
    { key: "isolated_patellar_tenderness", required: true },
    { key: "fib_head_tenderness", required: true },
    { key: "unable_flex_90", required: true },
    { key: "unable_weightbear_4steps", required: true },
  ],
  run: (x) => {
    const pos = x.age_ge_55 || x.isolated_patellar_tenderness || x.fib_head_tenderness || x.unable_flex_90 || x.unable_weightbear_4steps;
    return { id: "ottawa_knee_flag", label: "Ottawa Knee Rule (flag)", value: pos?1:0, unit: "flag", precision: 0, notes: [pos?"positive":"negative"] };
  },
});

/* =========================================================
   MED-EXT120 — Canadian C-Spine Rule (flag)
   (simplified: high-risk factor OR inability to actively rotate 45° either way)
   ========================================================= */
register({
  id: "canadian_cspine_flag",
  label: "Canadian C-Spine Rule (flag)",
  tags: ["trauma", "risk"],
  inputs: [
    { key: "high_risk_factor", required: true },     // e.g., age ≥65, dangerous mechanism, paresthesias
    { key: "low_risk_allows_assessment", required: true }, // true if low-risk present to assess ROM
    { key: "can_rotate_45_each_side", required: true },
  ],
  run: (x) => {
    const imaging = x.high_risk_factor || (!x.low_risk_allows_assessment) || (!x.can_rotate_45_each_side);
    return { id: "canadian_cspine_flag", label: "Canadian C-Spine Rule (flag)", value: imaging?1:0, unit: "flag", precision: 0, notes: [imaging?"imaging indicated":"no imaging by CCR"] };
  },
});

/* =========================================================
   MED-EXT121 — Canadian Syncope Risk Score (surrogate)
   ========================================================= */
register({
  id: "csrs_surrogate",
  label: "Canadian Syncope Risk Score (surrogate)",
  tags: ["cardiology", "neurology", "risk"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 4 ? "very high" : score >= 1 ? "intermediate" : "low"];
    return { id: "csrs_surrogate", label: "Canadian Syncope Risk Score (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT122 — Wells PE (surrogate band)
   ========================================================= */
register({
  id: "wells_pe_surrogate",
  label: "Wells PE (surrogate band)",
  tags: ["pulmonary", "risk"],
  inputs: [{ key: "points", required: true }],
  run: ({ points }) => {
    const notes = [points > 6 ? "high probability" : points >= 2 ? "moderate probability" : "low probability"];
    return { id: "wells_pe_surrogate", label: "Wells PE (surrogate band)", value: points, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT123 — Severe CAP minor criteria count (flag)
   (Severe CAP if ≥3 minor criteria present; clinician supplies count)
   ========================================================= */
register({
  id: "severe_cap_minor_flag",
  label: "Severe CAP (minor criteria) flag",
  tags: ["infectious_disease", "pulmonary", "risk"],
  inputs: [{ key: "minor_criteria_count", required: true }],
  run: ({ minor_criteria_count }) => {
    const severe = minor_criteria_count >= 3;
    return { id: "severe_cap_minor_flag", label: "Severe CAP (minor criteria) flag", value: severe?1:0, unit: "flag", precision: 0, notes: [severe?"meets severe CAP by minor criteria (count≥3)":"does not meet minor criteria threshold"] };
  },
});

/* =========================================================
   MED-EXT124 — QTc (Fridericia) = QT / RR^(1/3)
   ========================================================= */
register({
  id: "qtc_fridericia",
  label: "QTc (Fridericia)",
  tags: ["cardiology", "ecg"],
  inputs: [
    { key: "QT_ms", required: true },
    { key: "RR_sec", required: true },
  ],
  run: ({ QT_ms, RR_sec }) => {
    if (RR_sec <= 0) return null;
    const qtc = QT_ms / Math.cbrt(RR_sec);
    return { id: "qtc_fridericia", label: "QTc (Fridericia)", value: qtc, unit: "ms", precision: 0, notes: [] };
  },
});

/* =========================================================
   MED-EXT125 — Compute Child-Pugh from raw labs (auto-banding)
   ========================================================= */
register({
  id: "child_pugh_autoband",
  label: "Child-Pugh (auto from labs)",
  tags: ["hepatology", "risk"],
  inputs: [
    { key: "bilirubin", required: true }, // mg/dL
    { key: "albumin", required: true },   // g/dL
    { key: "INR", required: true },
    { key: "ascites", required: true },   // "none" | "mild" | "moderate_severe"
    { key: "encephalopathy", required: true }, // "none" | "grade_1_2" | "grade_3_4"
  ],
  run: (x) => {
    const bili_band = x.bilirubin < 2 ? 1 : x.bilirubin <= 3 ? 2 : 3;
    const alb_band  = x.albumin > 3.5 ? 1 : x.albumin >= 2.8 ? 2 : 3;
    const inr_band  = x.INR < 1.7 ? 1 : x.INR <= 2.3 ? 2 : 3;
    const asc_band  = x.ascites === "none" ? 1 : x.ascites === "mild" ? 2 : 3;
    const enc_band  = x.encephalopathy === "none" ? 1 : x.encephalopathy === "grade_1_2" ? 2 : 3;
    const total = bili_band + alb_band + inr_band + asc_band + enc_band;
    const cls = total <= 6 ? "A" : total <= 9 ? "B" : "C";
    return { id: "child_pugh_autoband", label: "Child-Pugh (auto from labs)", value: total, unit: `points (Class ${cls})`, precision: 0, notes: [`Class ${cls}`, `bands: bili${bili_band}/alb${alb_band}/INR${inr_band}/asc${asc_band}/enc${enc_band}`] };
  },
});

/* =========================================================
   MED-EXT126 — GRACE STEMI (surrogate)
   ========================================================= */
register({
  id: "grace_stemi_surrogate",
  label: "GRACE STEMI (surrogate)",
  tags: ["cardiology", "risk"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 200 ? "very high" : score >= 140 ? "high" : score >= 100 ? "intermediate" : "low"];
    return { id: "grace_stemi_surrogate", label: "GRACE STEMI (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT127 — MEWS (Modified Early Warning Score) surrogate
   ========================================================= */
register({
  id: "mews_surrogate",
  label: "MEWS (surrogate)",
  tags: ["icu_scores", "risk"],
  inputs: [{ key: "score", required: true }],
  run: ({ score }) => {
    const notes = [score >= 5 ? "high risk" : score >= 3 ? "moderate" : "low"];
    return { id: "mews_surrogate", label: "MEWS (surrogate)", value: score, unit: "points", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT128 — Baux burn index = Age + %TBSA
   ========================================================= */
register({
  id: "baux_index",
  label: "Baux burn index",
  tags: ["burns", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "tbsa_percent", required: true },
  ],
  run: ({ age, tbsa_percent }) => {
    const idx = age + tbsa_percent;
    const notes = [idx >= 140 ? "very high" : idx >= 100 ? "high" : "moderate/lower"];
    return { id: "baux_index", label: "Baux burn index", value: idx, unit: "index", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT129 — Revised Baux (add inhalation injury +17)
   ========================================================= */
register({
  id: "revised_baux_index",
  label: "Revised Baux index",
  tags: ["burns", "risk"],
  inputs: [
    { key: "age", required: true },
    { key: "tbsa_percent", required: true },
    { key: "inhalation_injury", required: true }, // boolean
  ],
  run: ({ age, tbsa_percent, inhalation_injury }) => {
    const val = age + tbsa_percent + (inhalation_injury ? 17 : 0);
    const notes = [val >= 157 ? "very high" : val >= 110 ? "high" : "moderate/lower"];
    return { id: "revised_baux_index", label: "Revised Baux index", value: val, unit: "index", precision: 0, notes };
  },
});

/* =========================================================
   MED-EXT130 — KDIGO CKD G-stage from eGFR
   ========================================================= */
register({
  id: "kdigo_ckd_stage",
  label: "KDIGO CKD G-stage (from eGFR)",
  tags: ["renal"],
  inputs: [{ key: "egfr", required: true }], // mL/min/1.73m²
  run: ({ egfr }) => {
    if (egfr == null) return null;
    let stage = "G1";
    if (egfr < 15) stage = "G5";
    else if (egfr < 30) stage = "G4";
    else if (egfr < 60) stage = "G3";
    else if (egfr < 90) stage = "G2";
    else stage = "G1";
    const notes = [`Stage ${stage}`];
    return { id: "kdigo_ckd_stage", label: "KDIGO CKD G-stage (from eGFR)", value: egfr, unit: "mL/min/1.73m²", precision: 0, notes };
  },
});
