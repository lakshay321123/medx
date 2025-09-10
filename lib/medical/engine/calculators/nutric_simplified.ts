/**
 * NUTRIC score without IL-6 (0 to 9)
 * Age: <50 = 0, 50 to 74 = 1, >=75 = 3
 * APACHE II: <15 = 0, 15 to 19 = 1, 20 to 27 = 2, >=28 = 3
 * SOFA: <6 = 0, 6 to 9 = 1, >=10 = 2
 * Comorbidities: 0 = 0, 1 to 2 = 1, >=3 = 2
 * Days from hospital to ICU: 0 = 0, >=1 = 1
 * High risk if score >= 5
 */
export interface NUTRICInput {
  age: number;
  apache_ii: number;
  sofa: number;
  comorbidity_count: number;
  days_hospital_to_icu: number;
}
export interface NUTRICResult { score: number; high_risk: boolean; }
export function runNUTRIC(i: NUTRICInput): NUTRICResult {
  let s = 0;
  if (i.age >= 75) s += 3;
  else if (i.age >= 50) s += 1;
  if (i.apache_ii >= 28) s += 3;
  else if (i.apache_ii >= 20) s += 2;
  else if (i.apache_ii >= 15) s += 1;
  if (i.sofa >= 10) s += 2;
  else if (i.sofa >= 6) s += 1;
  if (i.comorbidity_count >= 3) s += 2;
  else if (i.comorbidity_count >= 1) s += 1;
  if (i.days_hospital_to_icu >= 1) s += 1;
  return { score: s, high_risk: s >= 5 };
}
