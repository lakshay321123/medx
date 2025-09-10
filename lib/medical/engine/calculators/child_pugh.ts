/**
 * Child-Pugh score (5–15) with A/B/C class
 * Inputs: bilirubin mg/dL, albumin g/dL, INR, ascites (none/mild/mod-severe), encephalopathy (none/mild/mod-severe)
 */
export type CPClass = "A" | "B" | "C";
export interface ChildPughInput {
  bilirubin_mg_dl: number;
  albumin_g_dl: number;
  inr: number;
  ascites: "none" | "mild" | "moderate-severe";
  encephalopathy: "none" | "mild" | "moderate-severe";
}
export interface ChildPughResult { points: number; klass: CPClass; }
function pts_bilirubin(v: number) { return v < 2 ? 1 : (v <= 3 ? 2 : 3); }
function pts_albumin(v: number) { return v > 3.5 ? 1 : (v >= 2.8 ? 2 : 3); }
function pts_inr(v: number) { return v < 1.7 ? 1 : (v <= 2.3 ? 2 : 3); }
function pts_tri(v: "none" | "mild" | "moderate-severe") { return v === "none" ? 1 : (v === "mild" ? 2 : 3); }
export function runChildPugh(i: ChildPughInput): ChildPughResult {
  const s = pts_bilirubin(i.bilirubin_mg_dl) + pts_albumin(i.albumin_g_dl) + pts_inr(i.inr) + pts_tri(i.ascites) + pts_tri(i.encephalopathy);
  let k: CPClass = "A";
  if (s >= 10) k = "C";
  else if (s >= 7) k = "B";
  return { points: s, klass: k };
}
