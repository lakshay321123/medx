/**
 * P/F ratio = PaO2 / FiO2
 */
export interface PFRatioInput { pao2: number; fio2: number; }
export interface PFRatioResult { ratio: number; ards_severity: "none" | "mild" | "moderate" | "severe"; }
export function runPFRatio(i: PFRatioInput): PFRatioResult {
  const ratio = i.pao2 / i.fio2;
  let sev: PFRatioResult["ards_severity"] = "none";
  if (ratio < 100) sev = "severe";
  else if (ratio < 200) sev = "moderate";
  else if (ratio <= 300) sev = "mild";
  return { ratio, ards_severity: sev };
}
