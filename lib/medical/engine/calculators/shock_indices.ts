// lib/medical/engine/calculators/shock_indices.ts
import { round, clamp } from "./utils";

/** Shock Index (SI) = HR / SBP */
export function shockIndex(hr_bpm: number, sbp_mmHg: number) {
  const si = hr_bpm / Math.max(sbp_mmHg, 1e-6);
  let band: "normal"|"elevated"|"high";
  if (si < 0.7) band = "normal";
  else if (si < 1.0) band = "elevated";
  else band = "high";
  return { si: round(si, 2), band };
}

/** Modified Shock Index (MSI) = HR / MAP */
export function modifiedShockIndex(hr_bpm: number, map_mmHg: number) {
  const msi = hr_bpm / Math.max(map_mmHg, 1e-6);
  return { msi: round(msi, 2) };
}

/** Diastolic Shock Index (DSI) = HR / DBP */
export function diastolicShockIndex(hr_bpm: number, dbp_mmHg: number) {
  const dsi = hr_bpm / Math.max(dbp_mmHg, 1e-6);
  return { dsi: round(dsi, 2) };
}

/** Age Shock Index (ASI) = age * SI */
export function ageShockIndex(age_years: number, hr_bpm: number, sbp_mmHg: number) {
  const { si } = shockIndex(hr_bpm, sbp_mmHg);
  const asi = age_years * si;
  return { asi: round(asi, 0) };
}
