// lib/medical/engine/calculators/ottawa_ankle.ts
export interface OttawaAnkleInput {
  malleolar_pain?: boolean | null;
  navicular_pain?: boolean | null;
  base_5th_metatarsal_pain?: boolean | null;
  inability_bear_weight_4steps?: boolean | null;
  bone_tender_posterior_edge_lat_malleolus?: boolean | null;
  bone_tender_posterior_edge_med_malleolus?: boolean | null;
}
export interface OttawaAnkleOutput { need_radiograph: boolean; reasons: string[]; }

export function runOttawaAnkle(i: OttawaAnkleInput): OttawaAnkleOutput {
  const reasons: string[] = [];
  const midfoot = i.navicular_pain || i.base_5th_metatarsal_pain;
  const ankle_bone_tender = i.bone_tender_posterior_edge_lat_malleolus || i.bone_tender_posterior_edge_med_malleolus;
  if (i.malleolar_pain && ankle_bone_tender) reasons.push("malleolar bone tenderness");
  if (midfoot && (i.navicular_pain || i.base_5th_metatarsal_pain)) reasons.push("midfoot bone tenderness");
  if (i.inability_bear_weight_4steps) reasons.push("inability to bear weight");
  return { need_radiograph: reasons.length > 0, reasons };
}
