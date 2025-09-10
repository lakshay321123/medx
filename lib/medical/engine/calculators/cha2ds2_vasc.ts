
// lib/medical/engine/calculators/cha2ds2_vasc.ts
// CHA2DS2-VASc stroke risk score in AF.

export interface CHA2DS2VASCInput {
  congestive_heart_failure?: boolean; // 1
  hypertension?: boolean;             // 1
  age_years?: number;                 // 65-74 => 1; >=75 => 2
  diabetes?: boolean;                 // 1
  stroke_tia_thromboembolism?: boolean; // 2
  vascular_disease?: boolean;         // 1 (MI, PAD, or aortic plaque)
  sex_female?: boolean;               // 1 (but only counts if other risk present in some schemas; we sum raw points here)
}

export interface CHA2DS2VASCOutput { points: number; }

export function cha2ds2vasc(i: CHA2DS2VASCInput): CHA2DS2VASCOutput {
  let pts = 0;
  if (i.congestive_heart_failure) pts += 1;
  if (i.hypertension) pts += 1;
  const age = i.age_years ?? 0;
  if (age >= 75) pts += 2;
  else if (age >= 65) pts += 1;
  if (i.diabetes) pts += 1;
  if (i.stroke_tia_thromboembolism) pts += 2;
  if (i.vascular_disease) pts += 1;
  if (i.sex_female) pts += 1;
  return { points: pts };
}
