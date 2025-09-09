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
