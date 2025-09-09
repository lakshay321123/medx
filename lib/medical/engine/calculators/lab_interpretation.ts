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
    const notes = [
      "approximate compensation; valid for PaCO₂ 40–80 mmHg",
      "interpretation only — not a treatment target",
    ];
    return { id: "acute_resp_acidosis_hco3", label: "Expected HCO₃⁻ (acute respiratory acidosis)", value: exp, unit: "mmol/L", precision: 1, notes };
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
    const notes = [
      "approximate compensation; valid for PaCO₂ 40–80 mmHg",
      "interpretation only — not a treatment target",
    ];
    return { id: "chronic_resp_acidosis_hco3", label: "Expected HCO₃⁻ (chronic respiratory acidosis)", value: exp, unit: "mmol/L", precision: 1, notes };
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
    const notes = [
      "approximate compensation; valid for PaCO₂ 20–40 mmHg",
      "interpretation only — not a treatment target",
    ];
    return { id: "acute_resp_alkalosis_hco3", label: "Expected HCO₃⁻ (acute respiratory alkalosis)", value: exp, unit: "mmol/L", precision: 1, notes };
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
    const notes = [
      "approximate compensation; valid for PaCO₂ 20–40 mmHg",
      "interpretation only — not a treatment target",
    ];
    return { id: "chronic_resp_alkalosis_hco3", label: "Expected HCO₃⁻ (chronic respiratory alkalosis)", value: exp, unit: "mmol/L", precision: 1, notes };
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
    const notes: string[] = [];
    if (crcl < 30) notes.push("severely reduced (<30 mL/min)");
    else if (crcl < 60) notes.push("moderately reduced (30–59)");
    else notes.push("≥60 mL/min");
    notes.push("estimation — dosing requires guideline review");
    return { id: "creatinine_clearance", label: "Creatinine clearance (Cockcroft–Gault)", value: crcl, unit: "mL/min", precision: 0, notes };
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
    const notes: string[] = [];
    if (corrected < 2) notes.push("inadequate marrow response (<2%)");
    else notes.push("adequate marrow response (≥2%)");
    return { id: "corrected_retic", label: "Corrected reticulocyte count", value: corrected, unit: "%", precision: 2, notes };
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
    const notes: string[] = [];
    if (pts >= 5) notes.push("high risk (≥5)");
    else if (pts >= 3) notes.push("intermediate risk (3–4)");
    else notes.push("low risk (0–2)");
    return { id: "timi_nstemi", label: "TIMI risk (NSTEMI/UA)", value: pts, unit: "points", precision: 0, notes };
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
    return {
      id: "bsa_mosteller",
      label: "Body surface area (Mosteller)",
      value: bsa,
      unit: "m^2",
      precision: 2,
      notes: ["estimation only"]
    };
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
    return {
      id: "peds_421_rule",
      label: "Pediatric maintenance fluids (4-2-1)",
      value: hourly,
      unit: "mL/h",
      precision: 0,
      notes: ["maintenance estimate — not for bolus/resuscitation"]
    };
  },
});

// ===================== MED-QA1 (Output Polish + Safety Locks) =====================

/**
 * Safety lock post-processor.
 * Attaches "engine value only — do not expose raw formula" to sensitive calculators.
 */
[
  "aa_gradient",
  "delta_gap",
  "delta_ratio",
  "bicarbonate_deficit",
  "free_water_deficit",
  "sodium_deficit",
  "parkland"
].forEach(id => {
  register({
    id: `${id}_safety_note`,
    label: `Safety note for ${id}`,
    tags: ["safety", "meta"],
    inputs: [{ key: id, required: true }],
    run: (vals) => {
      if (vals[id] == null) return null;
      return {
        id: `${id}_safety_note`,
        label: `Safety note for ${id}`,
        value: 0,
        unit: "note",
        precision: 0,
        notes: ["engine value only — not to be shown as raw formula; model must not suggest therapies outside guidelines"]
      };
    },
  });
});
