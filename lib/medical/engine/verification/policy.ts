type Policy = { precision: number; tolerancePct: number; strict: boolean; timeoutMs?: number };

const HARD_ZERO: Policy = { precision: 2, tolerancePct: 0, strict: true, timeoutMs: 7000 };

// Per-calculator overrides for deterministic arithmetic (exact match after rounding)
const OVERRIDES: Record<string, Policy> = {
  anion_gap:                   { precision: 0, tolerancePct: 0, strict: true },
  anion_gap_albumin_corrected: { precision: 1, tolerancePct: 0, strict: true },
  serum_osmolality:            { precision: 2, tolerancePct: 0, strict: true },
  effective_osmolality:        { precision: 2, tolerancePct: 0, strict: true },
  winter_expected_pco2:        { precision: 1, tolerancePct: 0, strict: true },
  delta_gap:                   { precision: 1, tolerancePct: 0, strict: true },
  // Add more here as you integrate them
};

export function policyFor(name: string): Policy {
  return OVERRIDES[name] ?? HARD_ZERO;
}
