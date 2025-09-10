// lib/medical/engine/calculators/age_adjusted_ddimer.ts
// Age-adjusted D-dimer threshold helper.
// units: 'FEU' (fibrinogen-equivalent; ng/mL) uses Age*10 if age>50.
//        'DDU' (D-dimer units; ng/mL) uses Age*5 if age>50.

export interface AgeAdjustedDDimerOut { threshold_ng_mL: number; }

export function ageAdjustedDDimer(age_years: number, units: 'FEU'|'DDU'='FEU'): AgeAdjustedDDimerOut {
  if (age_years <= 50) return { threshold_ng_mL: (units==='FEU' ? 500 : 250) };
  const mult = units==='FEU' ? 10 : 5;
  return { threshold_ng_mL: age_years * mult };
}
