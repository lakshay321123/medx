/**
 * Myxedema Coma Scoring System (Popoveniuc et al., 2014)
 * Points for: Thermoregulatory, CNS, GI, Precipitating event, Cardiovascular, Metabolic.
 * Interpretation: >60 highly suggestive/diagnostic; 25–59 supportive; <25 unlikely.
 * Ref: Popoveniuc G, et al. (Endocrine Practice. 2014) and widely reproduced clinical tables.
 */

export type CNSStatus = "normal" | "lethargy" | "obtunded" | "stupor" | "coma_or_seizures";
export type GISymptom = "none" | "anorexia_abdpain_constipation" | "decreased_motility" | "paralytic_ileus";

export interface MyxedemaInput {
  temp_c?: number; // core temp in °C
  cns?: CNSStatus;
  gi?: GISymptom;
  precipitating_event?: boolean;

  hr_bpm?: number;
  hypotension?: boolean;
  pericardial_effusion?: boolean;
  cardiomegaly?: boolean;

  sodium_mEq_L?: number;
  glucose_mg_dL?: number;
  pao2_mmHg?: number;
  paco2_mmHg?: number;
  egfr_mL_min_1p73?: number; // or set decreased_gfr flag below
  decreased_gfr_flag?: boolean;
}

export interface MyxedemaOutput {
  score: number;
  band: "Unlikely (<25)" | "Supportive (25–59)" | "Highly suggestive (≥60)";
  details: Record<string, number>;
}

export function runMyxedema(i: MyxedemaInput): MyxedemaOutput {
  const d: Record<string, number> = {};

  // Thermoregulation (°C)
  if (i.temp_c !== undefined) {
    if (i.temp_c >= 35 && i.temp_c <= 36.1) d.temp = 5;
    else if (i.temp_c >= 34 && i.temp_c < 35) d.temp = 10;
    else if (i.temp_c >= 33 && i.temp_c < 34) d.temp = 15;
    else if (i.temp_c >= 30 && i.temp_c < 33) d.temp = 20;
    else if (i.temp_c < 30) d.temp = 30;
    else d.temp = 0;
  } else d.temp = 0;

  // CNS
  switch (i.cns) {
    case "lethargy": d.cns = 10; break;
    case "obtunded": d.cns = 15; break;
    case "stupor": d.cns = 20; break;
    case "coma_or_seizures": d.cns = 30; break;
    default: d.cns = 0;
  }

  // GI
  switch (i.gi) {
    case "anorexia_abdpain_constipation": d.gi = 5; break;
    case "decreased_motility": d.gi = 15; break;
    case "paralytic_ileus": d.gi = 20; break;
    default: d.gi = 0;
  }

  d.precip = i.precipitating_event ? 10 : 0;

  // Cardiovascular
  if (i.hr_bpm !== undefined) {
    if (i.hr_bpm < 40) d.brady = 30;
    else if (i.hr_bpm < 50) d.brady = 20; // 40-49
    else if (i.hr_bpm < 60) d.brady = 10; // 50-59
    else d.brady = 0;
  } else d.brady = 0;

  d.hypotension = i.hypotension ? 20 : 0;
  d.pericardial_effusion = i.pericardial_effusion ? 10 : 0;
  d.cardiomegaly = i.cardiomegaly ? 10 : 0;

  // Metabolic
  if (i.sodium_mEq_L !== undefined && i.sodium_mEq_L < 130) d.hyponatremia = 10; else d.hyponatremia = 0;
  if (i.glucose_mg_dL !== undefined && i.glucose_mg_dL < 60) d.hypoglycemia = 10; else d.hypoglycemia = 0;
  if (i.pao2_mmHg !== undefined && i.pao2_mmHg < 60) d.hypoxemia = 10; else d.hypoxemia = 0;
  if (i.paco2_mmHg !== undefined && i.paco2_mmHg > 45) d.hypercarbia = 10; else d.hypercarbia = 0;

  const gfrLow = (i.decreased_gfr_flag === true) || (i.egfr_mL_min_1p73 !== undefined && i.egfr_mL_min_1p73 < 60);
  d.decreased_gfr = gfrLow ? 10 : 0;

  const score = Object.values(d).reduce((a, b) => a + b, 0);
  let band: MyxedemaOutput["band"];
  if (score >= 60) band = "Highly suggestive (≥60)";
  else if (score >= 25) band = "Supportive (25–59)";
  else band = "Unlikely (<25)";

  return { score, band, details: d };
}
