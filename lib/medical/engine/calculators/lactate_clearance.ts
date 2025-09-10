
/** Lactate clearance percentage over time. */
export function lactateClearancePercent(initial_mmol_L: number, follow_mmol_L: number) {
  if (!(initial_mmol_L > 0)) return null;
  return ((initial_mmol_L - follow_mmol_L) / initial_mmol_L) * 100;
}
