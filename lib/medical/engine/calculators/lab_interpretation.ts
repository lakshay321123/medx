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
