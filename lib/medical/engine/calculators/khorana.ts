// lib/medical/engine/calculators/khorana.ts

export interface KhoranaInput {
  cancer_site_category?: "very_high" | "high" | "other" | null; // very_high: stomach, pancreas; high: lung, lymphoma, gynecologic, bladder, testicular
  platelet_k_per_uL?: number | null; // >=350 gives 1
  hemoglobin_g_dL?: number | null;   // <10 or ESA use -> 1
  receiving_esa?: boolean | null;
  wbc_k_per_uL?: number | null;      // >11 gives 1
  bmi_kg_m2?: number | null;         // >=35 gives 1
}

export interface KhoranaOutput {
  points: number;
  risk_band: "low" | "intermediate" | "high";
  components: Record<string, number>;
}

export function runKhorana(i: KhoranaInput): KhoranaOutput {
  const comp: Record<string, number> = {};
  comp.site = (i.cancer_site_category === "very_high" ? 2 : (i.cancer_site_category === "high" ? 1 : 0));
  comp.platelets = (i.platelet_k_per_uL ?? 0) >= 350 ? 1 : 0;
  const hb = i.hemoglobin_g_dL ?? 99;
  comp.hb_esa = (hb < 10 || i.receiving_esa) ? 1 : 0;
  comp.wbc = (i.wbc_k_per_uL ?? 0) > 11 ? 1 : 0;
  comp.bmi = (i.bmi_kg_m2 ?? 0) >= 35 ? 1 : 0;
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  let band: "low"|"intermediate"|"high" = "low";
  if (pts >= 3) band = "high";
  else if (pts >= 1) band = "intermediate";
  return { points: pts, risk_band: band, components: comp };
}
