// lib/medical/engine/calculators/glasgow_blatchford.ts
export interface GBSInput {
  bun_mmol_l?: number | null; // mmol/L
  hb_g_dl?: number | null;
  male?: boolean | null;
  sbp?: number | null;
  pulse?: number | null;
  melena?: boolean | null;
  syncope?: boolean | null;
  hepatic_disease?: boolean | null;
  heart_failure?: boolean | null;
}
export interface GBSOutput { score: number; }

function hbPoints(hb: number, male: boolean){ 
  if (male) { if (hb >= 13) return 0; if (hb >= 12) return 1; if (hb >= 10) return 3; return 6; }
  else { if (hb >= 12) return 0; if (hb >= 10) return 1; return 6; }
}

export function runGBS(i: GBSInput): GBSOutput {
  let s = 0;
  const bun = i.bun_mmol_l ?? 0;
  if (bun >= 6.5 && bun < 8) s += 2;
  else if (bun < 10) { if (bun >= 8) s += 3; }
  else if (bun < 25) s += 4;
  else s += 6;
  if (i.hb_g_dl != null) s += hbPoints(i.hb_g_dl, !!i.male);
  const sbp = i.sbp ?? 200;
  if (sbp < 100) s += 3; else if (sbp < 109) s += 2; else if (sbp < 119) s += 1;
  if ((i.pulse ?? 0) > 100) s += 1;
  if (i.melena) s += 1;
  if (i.syncope) s += 2;
  if (i.hepatic_disease) s += 2;
  if (i.heart_failure) s += 2;
  return { score: s };
}
