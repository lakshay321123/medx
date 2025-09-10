// lib/medical/engine/calculators/timi_stemi.ts
// TIMI risk score for STEMI.

export interface TIMISTEMIInput {
  age_years?: number | null;
  diabetes_htn_or_angina?: boolean | null;
  sbp_mmHg?: number | null;
  hr_bpm?: number | null;
  killip_class?: 1|2|3|4 | null;
  weight_kg?: number | null;
  anterior_stemior_lbbb?: boolean | null;
  time_to_treatment_hours?: number | null;
}

export interface TIMISTEMIOutput { points: number; components: Record<string, number>; }

export function runTIMI_STEMI(i: TIMISTEMIInput): TIMISTEMIOutput {
  const comp: Record<string, number> = {};
  const age = i.age_years ?? 0;
  comp.age = age >= 75 ? 3 : (age >= 65 ? 2 : 0);
  comp.riskhx = i.diabetes_htn_or_angina ? 1 : 0;
  const sbp = i.sbp_mmHg ?? 9999;
  comp.sbp = sbp < 100 ? 3 : 0;
  const hr = i.hr_bpm ?? 0;
  comp.hr = hr > 100 ? 2 : 0;
  comp.killip = (i.killip_class && i.killip_class >= 2) ? 2 : 0;
  const wt = i.weight_kg ?? 999;
  comp.weight = wt < 67 ? 1 : 0;
  comp.loc = i.anterior_stemior_lbbb ? 1 : 0;
  const t = i.time_to_treatment_hours ?? 0;
  comp.delay = t > 4 ? 1 : 0;
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points: pts, components: comp };
}
