/** Shared math helpers (no external deps). */
export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

export const ln = (v: number) => Math.log(Math.max(v, 1e-9)); // guard against ln(0)

/** Historical helper used by some scores (clamps 6–40 for certain scales). */
export const round0to40 = (v: number) => clamp(Math.round(v), 6, 40);

export const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v as number);

/** Generic rounding helper used across calculators. */
export const round = (v: number, decimals = 0): number => {
  if (!Number.isFinite(v)) return v as unknown as number;
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
};

/** Safe float read with default fallback. */
export function num(x: any, d = 0) {
  const n = typeof x === "string" ? Number(x) : x;
  return Number.isFinite(n) ? (n as number) : d;
}

/** Convert % → fraction if needed (accepts 0–1 or 0–100 inputs for things like SpO₂/FiO₂). */
export function toFraction(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (!Number.isFinite(n)) return NaN;
  const frac = n > 1 ? n / 100 : n;   // 92 -> 0.92, 0.4 -> 0.4, 1.0 -> 1.0
  return clamp(frac, 0, 1);
}

/** Convert fraction (0–1) → percent (0–100). */
export function toPercent(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (!Number.isFinite(n)) return NaN;
  return clamp(n, 0, 1) * 100;
}
