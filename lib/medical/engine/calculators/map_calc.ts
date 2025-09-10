/**
 * Mean arterial pressure (MAP) from SBP and DBP:
 * MAP = (SBP + 2*DBP) / 3
 */
export interface MAPInput { sbp_mmHg: number; dbp_mmHg: number; }
export interface MAPResult { map_mmHg: number; }
export function runMAP(i: MAPInput): MAPResult {
  return { map_mmHg: (i.sbp_mmHg + 2*i.dbp_mmHg) / 3 };
}
