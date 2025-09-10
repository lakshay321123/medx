import { register } from "../registry";

/**
 * ASTCT CRS v2 (simplified):
 * CRS grade driven by fever + hypotension/vasopressors + hypoxia:
 * - G1: fever ≥38°C; no hypotension/hypoxia
 * - G2: hypotension responsive to fluids and/or low-flow O2 (nasal cannula ≤6 L/min)
 * - G3: one vasopressor (± vasopressin) and/or high-flow O2 / non-rebreather
 * - G4: multiple vasopressors (excl vasopressin) and/or positive-pressure ventilation
 */
export function gradeCRS(params: {
  temp_C: number | null;
  vasopressor_support: "none" | "fluids_only" | "one_pressor" | "multiple_pressors";
  hypoxia_support: "none" | "low_flow" | "high_flow" | "positive_pressure";
}) {
  const { temp_C, vasopressor_support, hypoxia_support } = params;
  if (temp_C == null) return { grade: null, notes: ["Need temperature."] };
  if (temp_C < 38) return { grade: 0, notes: ["No fever threshold met."] };

  let grade = 1;
  if (vasopressor_support === "fluids_only" || hypoxia_support === "low_flow") grade = Math.max(grade, 2);
  if (vasopressor_support === "one_pressor" || hypoxia_support === "high_flow") grade = Math.max(grade, 3);
  if (vasopressor_support === "multiple_pressors" || hypoxia_support === "positive_pressure") grade = Math.max(grade, 4);

  return { grade, notes: [] };
}

/**
 * ASTCT ICANS (adult ICE-based):
 * Grade by ICE score + modifiers
 * - G1: ICE 7–9
 * - G2: ICE 3–6
 * - G3: ICE 0–2 or seizure (brief, responsive)
 * - G4: Deep obtundation, coma, prolonged seizures, motor weakness with raised ICP, or cerebral edema
 */
export function gradeICANS(params: {
  ice_score_0_10: number | null;
  seizure: boolean | null;
  motor_weakness: boolean | null;   // focal motor deficits
  cerebral_edema: boolean | null;   // radiographic/clinical
}) {
  const { ice_score_0_10, seizure, motor_weakness, cerebral_edema } = params;
  if (ice_score_0_10 == null) return { grade: null, notes: ["Need ICE score."] };

  if (cerebral_edema) return { grade: 4, notes: ["Cerebral edema"] };
  if (motor_weakness) return { grade: 4, notes: ["Motor weakness with neuro impairment"] };
  if (seizure) return { grade: 3, notes: ["Seizure present"] };

  let grade = 0;
  if (ice_score_0_10 >= 7) grade = 1;
  else if (ice_score_0_10 >= 3) grade = 2;
  else grade = 3;

  return { grade, notes: [] };
}

register({
  id: "astct_crs",
  label: "ASTCT CRS grading",
  inputs: [
    { key: "temp_C", required: true },
    { key: "vasopressor_support", required: true },
    { key: "hypoxia_support", required: true },
  ],
  run: gradeCRS,
});

register({
  id: "astct_icans",
  label: "ASTCT ICANS grading",
  inputs: [
    { key: "ice_score_0_10", required: true },
    { key: "seizure" },
    { key: "motor_weakness" },
    { key: "cerebral_edema" },
  ],
  run: gradeICANS,
});
