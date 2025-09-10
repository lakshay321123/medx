import { register } from "../registry";

/**
 * Child–Pugh Score
 */
function scoreBilirubin(b: number): number { if (b < 2) return 1; if (b <= 3) return 2; return 3; }
function scoreAlbumin(a: number): number { if (a > 3.5) return 1; if (a >= 2.8) return 2; return 3; }
function scoreINR(i: number): number { if (i < 1.7) return 1; if (i <= 2.3) return 2; return 3; }
function scoreAscites(a: "none" | "mild" | "moderate"): number { if (a === "none") return 1; if (a === "mild") return 2; return 3; }
function scoreEncephalopathy(e: "none" | "mild" | "moderate"): number { if (e === "none") return 1; if (e === "mild") return 2; return 3; }

export function calc_child_pugh({
  bilirubin_mg_dl, albumin_g_dl, inr, ascites, encephalopathy
}: {
  bilirubin_mg_dl: number,
  albumin_g_dl: number,
  inr: number,
  ascites: "none" | "mild" | "moderate",
  encephalopathy: "none" | "mild" | "moderate"
}) {
  const s = scoreBilirubin(bilirubin_mg_dl) + scoreAlbumin(albumin_g_dl) + scoreINR(inr) + scoreAscites(ascites) + scoreEncephalopathy(encephalopathy);
  let cls: "A" | "B" | "C" = "A";
  if (s >= 10) cls = "C";
  else if (s >= 7) cls = "B";
  return { score: s, class: cls };
}

register({
  id: "child_pugh",
  label: "Child–Pugh",
  tags: ["hepatology"],
  inputs: [
    { key: "bilirubin_mg_dl", required: true },
    { key: "albumin_g_dl", required: true },
    { key: "inr", required: true },
    { key: "ascites", required: true },
    { key: "encephalopathy", required: true }
  ],
  run: ({
    bilirubin_mg_dl,
    albumin_g_dl,
    inr,
    ascites,
    encephalopathy,
  }: {
    bilirubin_mg_dl: number;
    albumin_g_dl: number;
    inr: number;
    ascites: "none" | "mild" | "moderate";
    encephalopathy: "none" | "mild" | "moderate";
  }) => {
    const r = calc_child_pugh({ bilirubin_mg_dl, albumin_g_dl, inr, ascites, encephalopathy });
    const notes = [`Class ${r.class}`];
    return { id: "child_pugh", label: "Child–Pugh", value: r.score, unit: "score", precision: 0, notes, extra: r };
  },
});
