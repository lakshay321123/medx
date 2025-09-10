// lib/medical/engine/calculators/apri.ts
export interface APRIInput {
  ast_u_l?: number | null;
  ast_uln_u_l?: number | null;
  platelets_10e9_L?: number | null;
}
export interface APRIOutput { score: number; band: "low"|"possible_fibrosis"|"suggests_cirrhosis"; }

export function runAPRI(i: APRIInput): APRIOutput {
  if (i.ast_u_l == null || i.ast_uln_u_l == null || i.platelets_10e9_L == null) {
    return { score: NaN, band: "low" };
  }
  const score = ((i.ast_u_l / i.ast_uln_u_l) / i.platelets_10e9_L) * 100;
  let band: APRIOutput["band"] = "low";
  if (score >= 1.0 && score < 2.0) band = "possible_fibrosis";
  else if (score >= 2.0) band = "suggests_cirrhosis";
  return { score, band };
}
