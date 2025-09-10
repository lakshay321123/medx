export function isNumber(x: any): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}
export function round(value: number, digits = 2): number {
  const m = Math.pow(10, digits);
  return Math.round(value * m) / m;
}
export function toFraction(x: number): number {
  // Accept 21 (percent) => 0.21 if >1 and <=100 and likely percentage
  if (!isNumber(x)) return NaN;
  if (x > 1 && x <= 100) return x / 100;
  return x;
}
export type Band<T extends string> = { band: T; detail?: string };
