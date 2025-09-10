// lib/medical/engine/calculators/bap65.ts
import { round } from "./utils";

/** BAP-65: BUN ≥25, Altered mental status, Pulse ≥109, Age ≥65. */
export interface BAP65Input {
  bun_mg_dL: number;
  altered_mental_status: boolean;
  pulse_bpm: number;
  age_years: number;
}

export function runBAP65(i: BAP65Input) {
  let pts = 0;
  pts += i.bun_mg_dL >= 25 ? 1 : 0;
  pts += i.altered_mental_status ? 1 : 0;
  pts += i.pulse_bpm >= 109 ? 1 : 0;
  pts += i.age_years >= 65 ? 1 : 0;

  // Classes I–V often reported; with 0–4 points mapping to I–V
  const klass = pts + 1; // 0→I(1), 1→II(2), ..., 4→V(5)
  return { bap65_points: pts, class_roman: ["I","II","III","IV","V"][pts] ?? "I" };
}
