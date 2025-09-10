/**
 * NEXUS cervical spine rule
 * Imaging needed if any criteria present:
 * - Midline tenderness
 * - Intoxication
 * - Focal neurological deficit
 * - Distracting injury
 * - Altered mental status
 */
export interface NexusInput {
  midline_tenderness: boolean;
  intoxication: boolean;
  neuro_deficit: boolean;
  distracting_injury: boolean;
  altered_mental_status: boolean;
}
export interface NexusResult { clearable_without_imaging: boolean; }
export function runNEXUS(i: NexusInput): NexusResult {
  const any = i.midline_tenderness || i.intoxication || i.neuro_deficit || i.distracting_injury || i.altered_mental_status;
  return { clearable_without_imaging: !any };
}
