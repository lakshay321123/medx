/** Shared math helpers (no external deps). */
export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
export const ln = (v: number) => Math.log(Math.max(v, 1e-9)); // guard against ln(0)
export const round0to40 = (v: number) => clamp(Math.round(v), 6, 40);
export const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v as number);

/** Generic rounding helper used across calculators. */
export const round = (v: number, decimals = 0): number => {
  if (!Number.isFinite(v)) return v as unknown as number;
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
};

/** Safe float read with default. */
export function num(x: any, d = 0) {
  const n = typeof x === "string" ? Number(x) : x;
  return Number.isFinite(n) ? (n as number) : d;
}
