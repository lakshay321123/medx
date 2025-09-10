// lib/medical/engine/calculators/centor_mcisaac.ts
export interface CentorInput {
  age?: number | null;
  tonsillar_exudate?: boolean | null;
  tender_anterior_cervical_nodes?: boolean | null;
  fever_ge_38C?: boolean | null;
  cough_present?: boolean | null; // absence gives point
}
export interface CentorOutput { points: number; components: Record<string, number>; }

export function runCentorMcIsaac(i: CentorInput): CentorOutput {
  const comp: Record<string, number> = {};
  comp.exudate = i.tonsillar_exudate ? 1 : 0;
  comp.nodes = i.tender_anterior_cervical_nodes ? 1 : 0;
  comp.fever = i.fever_ge_38C ? 1 : 0;
  comp.cough = i.cough_present ? 0 : 1;
  const age = i.age ?? 0;
  let ageAdj = 0;
  if (age < 15) ageAdj = 1; else if (age > 44) ageAdj = -1;
  comp.age = ageAdj;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points, components: comp };
}
