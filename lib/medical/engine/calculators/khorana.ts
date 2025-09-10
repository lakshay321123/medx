export interface KhoranaInput {
  cancer_site: "stomach"|"pancreas"|"lung"|"lymphoma"|"gynecologic"|"bladder"|"testicular"|"other";
  platelets_10e9_L: number;
  hemoglobin_g_dL: number;
  on_esa?: boolean;
  leukocytes_10e9_L: number;
  bmi_kg_m2: number;
}

export function runKhorana(i: KhoranaInput) {
  let score = 0;
  if (i.cancer_site === "stomach" || i.cancer_site === "pancreas") score += 2;
  if (["lung","lymphoma","gynecologic","bladder","testicular"].includes(i.cancer_site)) score += 1;
  if (i.platelets_10e9_L >= 350) score += 1;
  if (i.hemoglobin_g_dL < 10 || i.on_esa) score += 1;
  if (i.leukocytes_10e9_L > 11) score += 1;
  if (i.bmi_kg_m2 >= 35) score += 1;
  const risk = score >= 3 ? "high" : (score >= 1 ? "intermediate" : "low");
  return { score, risk };
}
