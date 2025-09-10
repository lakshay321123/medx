// lib/medical/engine/calculators/bova.ts
// Bova score to stratify intermediate-risk PE for early complications.

export interface BovaInput {
  sbp_mmHg?: number | null;                // <100 mmHg gives points
  hr_bpm?: number | null;                  // >=110 bpm gives points
  troponin_elevated?: boolean | null;      // assay positive
  rv_dysfunction?: boolean | null;         // echo or CT evidence
}

export interface BovaOutput {
  points: number;
  class: 1 | 2 | 3; // I, II, III
  components: { sbp: number; hr: number; troponin: number; rv: number };
}

export function runBova(i: BovaInput): BovaOutput {
  const sbp = (i.sbp_mmHg ?? Infinity) < 100 ? 2 : 0;
  const hr = (i.hr_bpm ?? 0) >= 110 ? 2 : 0;
  const troponin = i.troponin_elevated ? 2 : 0;
  const rv = i.rv_dysfunction ? 2 : 0;
  const pts = sbp + hr + troponin + rv;
  let cls: 1|2|3 = 1;
  if (pts >= 5) cls = 3;
  else if (pts >= 3) cls = 2;
  return { points: pts, class: cls, components: { sbp, hr, troponin, rv } };
}
