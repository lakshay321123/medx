export type Labs = {
  Na?: number; K?: number; Cl?: number; HCO3?: number;
  glucose_mgdl?: number; glucose_mmol?: number;
  BUN?: number; creatinine?: number; albumin?: number;
};

export function mgdlFromMmol(gluMmol?: number) {
  return gluMmol != null ? gluMmol * 18 : undefined;
}

export function computeAnionGap({ Na, K, Cl, HCO3 }: Labs) {
  if (Na == null || Cl == null || HCO3 == null) return undefined;
  const kPart = K ?? 0;
  return (Na + kPart) - (Cl + HCO3);
}

export function correctSodiumForGlucose(Na?: number, glucoseMgdl?: number, factor: 1.6 | 2.4 = 1.6) {
  if (Na == null || glucoseMgdl == null) return undefined;
  return Na + factor * ((glucoseMgdl - 100) / 100);
}

export function effectiveOsmolality({ Na, glucose_mgdl, BUN }: Labs) {
  if (Na == null) return undefined;
  const glu = glucose_mgdl ?? 0;
  const bun = BUN ?? 0;
  // 2*Na + glucose/18 + BUN/2.8
  return 2*Na + (glu/18) + (bun/2.8);
}

export function needsKBeforeInsulin(K?: number) {
  return K != null && K < 3.3; // ADA
}

