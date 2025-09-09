import type { Labs } from "./calculators";

const NUM = /([0-9]+(?:\.[0-9]+)?)/;

export function extractLabsFromText(s: string): Labs {
  const labs: Labs = {};
  const lower = s.toLowerCase();

  const pick = (key: keyof Labs, rx: RegExp, toNum: (x:string)=>number = Number) => {
    const m = lower.match(rx);
    if (m) (labs as any)[key] = toNum(m[1]);
  };

  pick("Na", /na[^0-9\-]*?[:=]?\s*?([0-9.]+)/);
  pick("K", /k[^a-z0-9]?[^0-9\-]*?[:=]?\s*?([0-9.]+)/);
  pick("Cl", /cl[^a-z0-9]?[^0-9\-]*?[:=]?\s*?([0-9.]+)/);
  pick("HCO3", /(hco3|bicarb)[^0-9\-]*?[:=]?\s*?([0-9.]+)/);
  pick("glucose_mmol", /(glucose|fpg|fasting)[^0-9\-]*?[:=]?\s*?([0-9.]+)\s*mmol/);
  pick("glucose_mgdl", /(glucose|fpg|fasting)[^0-9\-]*?[:=]?\s*?([0-9.]+)\s*mg\/?dl/);
  pick("BUN", /bun[^0-9\-]*?[:=]?\s*?([0-9.]+)/);
  pick("creatinine", /creatinine[^0-9\-]*?[:=]?\s*?([0-9.]+)/);
  pick("albumin", /albumin[^0-9\-]*?[:=]?\s*?([0-9.]+)/);

  // prefer mg/dL if present; else convert mmol to mg/dL
  if (!labs.glucose_mgdl && labs.glucose_mmol != null) {
    labs.glucose_mgdl = labs.glucose_mmol * 18;
  }
  return labs;
}

