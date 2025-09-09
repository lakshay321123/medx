export function computeAnionGap({ Na, K, Cl, HCO3 }: { Na: number; K?: number; Cl: number; HCO3: number }) {
  const kPart = K ?? 0;
  return (Na + kPart) - (Cl + HCO3);
}

export function correctSodiumForGlucose(Na: number, glucoseMgDl: number, factor: 1.6 | 2.4 = 1.6) {
  return Na + factor * ((glucoseMgDl - 100) / 100);
}

export function needsKBeforeInsulin(K: number) {
  return K < 3.3; // per ADA guidelines
}

// add more calculators: BMI, DeltaGap, Osmolality, etc.
