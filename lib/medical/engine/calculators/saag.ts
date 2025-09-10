import { register } from "../registry";

export type SAAGInputs = { SerumAlbumin: number, AscitesAlbumin: number };
export function runSAAG({SerumAlbumin, AscitesAlbumin}: SAAGInputs) {
  if ([SerumAlbumin,AscitesAlbumin].some(v => v==null || !isFinite(v as number))) return null;
  const saag = Number((SerumAlbumin - AscitesAlbumin).toFixed(2));
  const portal = saag >= 1.1 ? "portal-hypertensive pattern" : "non-portal hypertensive pattern";
  return { value: saag, interpretation: portal };
}

register({
  id: "saag",
  label: "SAAG (Serum–Ascites Albumin Gradient)",
  inputs: [{key:"SerumAlbumin",required:true},{key:"AscitesAlbumin",required:true}],
  run: runSAAG as any,
});
