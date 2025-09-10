// lib/medical/engine/calculators/lace.ts
export interface LACEInput {
  length_of_stay_days?: number | null;
  acute_admission_via_ed?: boolean | null;
  charlson_index?: number | null;
  ed_visits_past6mo?: number | null;
}
export interface LACEOutput { score: number; }

function lengthPoints(d:number){ if (d<=0) return 0; if (d===1) return 1; if (d===2) return 2; if (d===3) return 3; if (d===4) return 4; if (d===5) return 5; if (d===6) return 6; if (d>=7) return 7; return 0; }
function charlsonPoints(c:number){ if (c===0) return 0; if (c===1) return 1; if (c===2) return 2; if (c===3) return 3; if (c===4) return 4; if (c===5) return 5; if (c>=6) return 6; return 0; }
function edPoints(v:number){ if (v===0) return 0; if (v===1) return 1; if (v===2) return 2; if (v===3) return 3; if (v>=4) return 4; return 0; }

export function runLACE(i: LACEInput): LACEOutput {
  const score = lengthPoints(i.length_of_stay_days ?? 0) + (i.acute_admission_via_ed ? 3 : 0) + charlsonPoints(i.charlson_index ?? 0) + edPoints(i.ed_visits_past6mo ?? 0);
  return { score };
}
