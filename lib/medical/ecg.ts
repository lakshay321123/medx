export function rrIntervalSeconds(hrBpm: number) {
  return 60 / hrBpm;
}

export function qtcFridericia(qtMs: number, hrBpm: number) {
  const rr = rrIntervalSeconds(hrBpm);
  const denom = Math.cbrt(rr); // cube root
  return qtMs / denom;
}

export function qtcBazett(qtMs: number, hrBpm: number) {
  const rr = rrIntervalSeconds(hrBpm);
  return qtMs / Math.sqrt(rr);
}

export function adjustQtcForElectrolytes(qtcMs: number, k?: number, mg?: number) {
  let adjusted = qtcMs;
  if (k != null && k < 3.5) adjusted += 10;  // hypokalemia adds ~10 ms
  if (mg != null && mg < 1.7) adjusted += 5; // hypomagnesemia adds ~5 ms
  return adjusted;
}
