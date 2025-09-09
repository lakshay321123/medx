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

