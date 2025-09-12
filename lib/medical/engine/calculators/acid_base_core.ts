// lib/medical/engine/calculators/acid_base_core.ts
import { register } from "../registry";

// Canonical AG (no K)
register({
  id: "anion_gap",
  label: "Anion gap",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
  ],
  run: ({ Na, Cl, HCO3 }) => {
    if (Na == null || Cl == null || HCO3 == null) return null;
    const ag = Na - (Cl + HCO3);
    const notes: string[] = [];
    if (ag > 12) notes.push("elevated anion gap");
    return { id: "anion_gap", label: "Anion gap", value: +ag.toFixed(1), unit: "mmol/L", precision: 1, notes };
  },
});

// Albumin-corrected AG (base on no-K AG)
register({
  id: "anion_gap_corrected",
  label: "Anion gap (albumin-corrected)",
  tags: ["electrolytes", "acid-base"],
  inputs: [
    { key: "Na", required: true },
    { key: "Cl", required: true },
    { key: "HCO3", required: true },
    { key: "albumin", required: true },
  ],
  run: ({ Na, Cl, HCO3, albumin }) => {
    if (Na == null || Cl == null || HCO3 == null || albumin == null) return null;
    const ag = Na - (Cl + HCO3);
    const corrected = ag + 2.5 * (4 - albumin);
    const notes = [`uncorr AG=${ag.toFixed(1)}`];
    if (corrected > 12) notes.push("elevated anion gap (corrected)");
    return { id: "anion_gap_corrected", label: "Anion gap (albumin-corrected)", value: +corrected.toFixed(1), unit: "mmol/L", precision: 1, notes };
  },
});

// Winter’s expected PaCO₂
register({
  id: "winters_expected_paco2",
  label: "Expected PaCO₂ (Winter’s)",
  tags: ["acid-base"],
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    if (HCO3 == null) return null;
    const expected = 1.5 * HCO3 + 8;
    const low = expected - 2;
    const high = expected + 2;
    const notes = [`expected ${low.toFixed(1)}–${high.toFixed(1)} mmHg (±2)`];
    return { id: "winters_expected_paco2", label: "Expected PaCO₂ (Winter’s)", value: +expected.toFixed(1), unit: "mmHg", precision: 1, notes };
  },
});

// Serum osmolality, effective osmolality, and osmolal gap
register({
  id: "serum_osmolality",
  label: "Serum osmolality (calculated)",
  tags: ["electrolytes", "osmolar"],
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mgdl", required: true },
    { key: "BUN", required: true },
    { key: "ethanol_mgdl" },
  ],
  run: ({ Na, glucose_mgdl, BUN, ethanol_mgdl }) => {
    if (Na == null || glucose_mgdl == null || BUN == null) return null;
    const osm = 2 * Na + glucose_mgdl / 18 + BUN / 2.8 + (ethanol_mgdl ? ethanol_mgdl / 3.7 : 0);
    return { id: "serum_osmolality", label: "Serum osmolality (calculated)", value: +osm.toFixed(0), unit: "mOsm/kg", precision: 0 };
  },
});

register({
  id: "effective_osmolality",
  label: "Effective osmolality (tonicity)",
  tags: ["electrolytes", "osmolar"],
  inputs: [{ key: "Na", required: true }, { key: "glucose_mgdl", required: true }],
  run: ({ Na, glucose_mgdl }) => {
    if (Na == null || glucose_mgdl == null) return null;
    const eff = 2 * Na + glucose_mgdl / 18;
    return { id: "effective_osmolality", label: "Effective osmolality (tonicity)", value: +eff.toFixed(0), unit: "mOsm/kg", precision: 0 };
  },
});

register({
  id: "osmolal_gap",
  label: "Osmolal gap",
  tags: ["electrolytes", "osmolar"],
  inputs: [
    { key: "Na", required: true },
    { key: "glucose_mgdl", required: true },
    { key: "BUN", required: true },
    { key: "Osm_measured", required: true },
    { key: "ethanol_mgdl" },
  ],
  run: ({ Na, glucose_mgdl, BUN, Osm_measured, ethanol_mgdl }) => {
    if (Na == null || glucose_mgdl == null || BUN == null || Osm_measured == null) return null;
    const calc = 2 * Na + glucose_mgdl / 18 + BUN / 2.8 + (ethanol_mgdl ? ethanol_mgdl / 3.7 : 0);
    const gap = Osm_measured - calc;
    const notes: string[] = [];
    if (gap > 10) notes.push("elevated osmolal gap");
    return { id: "osmolal_gap", label: "Osmolal gap", value: +gap.toFixed(0), unit: "mOsm/kg", precision: 0, notes };
  },
});

// DKA/HHS supportive flags
register({
  id: "dka_flag",
  label: "DKA supportive",
  tags: ["endocrine", "acid-base"],
  inputs: [
    { key: "glucose_mgdl", required: true },
    { key: "HCO3", required: true },
    { key: "pH", required: true },
    { key: "Na", required: true },
    { key: "Cl", required: true },
  ],
  run: ({ glucose_mgdl, HCO3, pH, Na, Cl }) => {
    if (glucose_mgdl == null || HCO3 == null || pH == null || Na == null || Cl == null) return null;
    const ag = Na - (Cl + HCO3);
    const ok = glucose_mgdl >= 250 && HCO3 < 18 && pH < 7.3 && ag > 12;
    return { id: "dka_flag", label: "DKA supportive", value: ok ? 1 : 0, precision: 0, notes: ok ? ["meets lab bands (ketones not provided)"] : [] };
  },
});

register({
  id: "hhs_flag",
  label: "HHS supportive",
  tags: ["endocrine", "acid-base"],
  inputs: [
    { key: "glucose_mgdl", required: true },
    { key: "Na", required: true },
    { key: "HCO3", required: true },
    { key: "pH", required: true },
  ],
  run: ({ glucose_mgdl, Na, HCO3, pH }) => {
    if (glucose_mgdl == null || Na == null || HCO3 == null || pH == null) return null;
    const effective = 2 * Na + glucose_mgdl / 18;
    const ok = glucose_mgdl >= 600 && effective >= 320 && pH >= 7.3 && HCO3 >= 18;
    return { id: "hhs_flag", label: "HHS supportive", value: ok ? 1 : 0, precision: 0, notes: ok ? [`effective osm ≥320`] : [] };
  },
});
