// lib/medical/engine/calculators/pews_simple.ts
export interface PEWSSimpleInput {
  behavior?: "normal"|"irritable"|"lethargic"|null;
  cardiovascular?: "normal"|"tachycardia"|"poor_perfusion"|null;
  respiratory?: "normal"|"tachypnea"|"retractions"|null;
}
export interface PEWSSimpleOutput { points: number; }

function map2(v: string|undefined|null){ if (v==="normal") return 0; if (v==="tachycardia"||v==="tachypnea"||v==="irritable") return 1; if (v==="poor_perfusion"||v==="retractions"||v==="lethargic") return 2; return 0; }

export function runPEWSSimple(i: PEWSSimpleInput): PEWSSimpleOutput {
  const pts = map2(i.behavior) + map2(i.cardiovascular) + map2(i.respiratory);
  return { points: pts };
}
