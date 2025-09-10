
// lib/medical/engine/calculators/has_bled.ts
// HAS-BLED bleeding risk for AF anticoagulation.

export interface HASBLEDInput {
  hypertension?: boolean; // SBP > 160
  abnormal_renal?: boolean;
  abnormal_liver?: boolean;
  stroke_history?: boolean;
  bleeding_history_or_predisposition?: boolean;
  labile_inr?: boolean; // if on warfarin
  elderly_gt_65?: boolean;
  drugs_predisposing_bleeding?: boolean; // antiplatelets, NSAIDs
  alcohol_excess?: boolean;
}

export interface HASBLEDOutput { points: number; components: Record<string, number>; }

export function hasBled(i: HASBLEDInput): HASBLEDOutput {
  const comp: Record<string, number> = {};
  comp.hypertension = i.hypertension ? 1 : 0;
  // Abnormal renal/liver can give up to 2 total (1 each)
  comp.abnormal_renal = i.abnormal_renal ? 1 : 0;
  comp.abnormal_liver = i.abnormal_liver ? 1 : 0;
  comp.stroke = i.stroke_history ? 1 : 0;
  comp.bleeding = i.bleeding_history_or_predisposition ? 1 : 0;
  comp.labile_inr = i.labile_inr ? 1 : 0;
  comp.elderly = i.elderly_gt_65 ? 1 : 0;
  // Drugs/alcohol up to 2 total
  comp.drugs = i.drugs_predisposing_bleeding ? 1 : 0;
  comp.alcohol = i.alcohol_excess ? 1 : 0;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points, components: comp };
}
