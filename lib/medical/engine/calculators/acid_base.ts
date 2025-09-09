import { register } from "../registry";

// ===== Anion Gap (±K) =====
register({
  id: "anion_gap",
  label: "Anion gap",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "K" },
  ],
  run: ({ Na, Cl, HCO3, K }) => {
    if (Na == null || Cl == null || HCO3 == null) return null;
    const ag = (Na + (K ?? 0)) - (Cl + HCO3);
    return { id: "anion_gap", label: "Anion gap", value: ag, unit: "mmol/L", precision: 1 };
  },
  priority: 10,
});

// ===== Albumin-corrected Anion Gap =====
// AG_corr = AG + 2.5 × (4.0 − albumin g/dL)
register({
  id: "anion_gap_albumin_corrected",
  label: "Anion gap (albumin-corrected)",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "K" },
    { key: "albumin" },
  ],
  run: ({ Na, Cl, HCO3, K, albumin }) => {
    if (Na == null || Cl == null || HCO3 == null || albumin == null) return null;
    const ag = (Na + (K ?? 0)) - (Cl + HCO3);
    const agc = ag + 2.5 * (4 - albumin);
    const notes: string[] = [];
    if (agc >= 16) notes.push("elevated corrected AG");
    return {
      id: "anion_gap_albumin_corrected",
      label: "Anion gap (albumin-corrected)",
      value: agc,
      unit: "mmol/L",
      precision: 1,
      notes,
    };
  },
  priority: 11,
});

// ===== Delta Gap & Delta–Delta =====
// deltaAG = AG_corr - 12 (use corrected if available; else raw)
// expected HCO3 = 24 - deltaAG; delta-delta = (Observed HCO3 - expected HCO3)
register({
  id: "delta_gap",
  label: "Delta gap",
  tags: ["acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "K" },
    { key: "albumin" },
  ],
  run: ({ Na, Cl, HCO3, K, albumin }) => {
    if (Na == null || Cl == null || HCO3 == null) return null;
    const ag = (Na + (K ?? 0)) - (Cl + HCO3);
    const agCorr = albumin != null ? ag + 2.5 * (4 - albumin) : ag;
    const dAG = agCorr - 12;
    const expectedHCO3 = 24 - dAG;
    const deltaDelta = HCO3 - expectedHCO3;

    const notes: string[] = [];
    if (deltaDelta > 3) notes.push("concurrent metabolic alkalosis (↑ HCO₃)");
    if (deltaDelta < -3) notes.push("concurrent non-AG metabolic acidosis (↓ HCO₃)");

    return {
      id: "delta_gap",
      label: "Delta gap (ΔAG), Δ–Δ",
      value: Number.isFinite(dAG) ? dAG : undefined,
      unit: "mmol/L",
      precision: 1,
      notes: [
        `ΔAG: ${Number.isFinite(dAG) ? dAG.toFixed(1) : "—"}`,
        `Expected HCO₃: ${Number.isFinite(expectedHCO3) ? expectedHCO3.toFixed(1) : "—"} mmol/L`,
        `Δ–Δ: ${Number.isFinite(deltaDelta) ? deltaDelta.toFixed(1) : "—"} mmol/L`,
        ...notes,
      ],
    };
  },
  priority: 12,
});

// ===== Corrected Sodium for Hyperglycemia =====
register({
  id: "corrected_na_1_6",
  label: "Corrected Na (1.6 factor)",
  tags: ["electrolytes"],
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mgdl" },
    { key: "glucose_mmol" },
  ],
  run: ({ Na, glucose_mgdl, glucose_mmol }) => {
    const glu = glucose_mgdl ?? (glucose_mmol != null ? glucose_mmol * 18 : undefined);
    if (Na == null || glu == null) return null;
    const val = Na + 1.6 * ((glu - 100) / 100);
    return { id: "corrected_na_1_6", label: "Corrected Na (1.6)", value: val, unit: "mmol/L", precision: 1 };
  },
  priority: 20,
});

register({
  id: "corrected_na_2_4",
  label: "Corrected Na (2.4 factor)",
  tags: ["electrolytes"],
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mgdl" },
    { key: "glucose_mmol" },
  ],
  run: ({ Na, glucose_mgdl, glucose_mmol }) => {
    const glu = glucose_mgdl ?? (glucose_mmol != null ? glucose_mmol * 18 : undefined);
    if (Na == null || glu == null) return null;
    const val = Na + 2.4 * ((glu - 100) / 100);
    return { id: "corrected_na_2_4", label: "Corrected Na (2.4)", value: val, unit: "mmol/L", precision: 1 };
  },
  priority: 21,
});

// ===== Winter's Formula (expected pCO₂ in metabolic acidosis) =====
// pCO2_expected = 1.5 × HCO3 + 8 ± 2
register({
  id: "winters_formula",
  label: "Expected pCO₂ (Winter’s formula)",
  tags: ["acid-base"],
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    if (HCO3 == null) return null;
    const exp = 1.5 * HCO3 + 8;
    return {
      id: "winters_formula",
      label: "Expected pCO₂ (Winter’s)",
      value: exp,
      unit: "mmHg",
      precision: 1,
      notes: ["±2 mmHg range"],
    };
  },
  priority: 30,
});

// ===== Compensation heuristics (simple linear rules) =====
// Metabolic alkalosis expected pCO₂: pCO₂ ≈ 0.7 × ΔHCO₃ + 40 ± 5
register({
  id: "metabolic_alk_compensation",
  label: "Expected pCO₂ in metabolic alkalosis",
  tags: ["acid-base"],
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    if (HCO3 == null || HCO3 < 28) return null;
    const delta = HCO3 - 24;
    const exp = 0.7 * delta + 40;
    return {
      id: "metabolic_alk_compensation",
      label: "Expected pCO₂ (metabolic alkalosis)",
      value: exp,
      unit: "mmHg",
      precision: 1,
      notes: ["±5 mmHg range"],
    };
  },
  priority: 31,
});

// Acute respiratory acidosis: ΔHCO₃ ≈ +1 mmol/L per +10 mmHg pCO₂ (chronic ≈ +3.5)
// Acute respiratory alkalosis: ΔHCO₃ ≈ −2 mmol/L per −10 mmHg pCO₂ (chronic ≈ −5)
register({
  id: "resp_comp_rules",
  label: "Respiratory compensation (heuristics)",
  tags: ["acid-base"],
  inputs: [{ key: "pCO2" }, { key: "HCO3" }],
  run: ({ pCO2, HCO3 }) => {
    if (pCO2 == null || HCO3 == null) return null;
    const notes = [
      "Acute resp. acidosis: +1 HCO₃ per +10 pCO₂",
      "Chronic resp. acidosis: +3.5 HCO₃ per +10 pCO₂",
      "Acute resp. alkalosis: −2 HCO₃ per −10 pCO₂",
      "Chronic resp. alkalosis: −5 HCO₃ per −10 pCO₂",
    ];
    return { id: "resp_comp_rules", label: "Respiratory compensation", value: "", notes };
  },
  priority: 40,
});
