// lib/medical/engine/calculators/hit_4ts.ts

export interface FourTsInput {
  platelet_fall_pct?: number | null; // % fall from baseline (0-100)
  platelet_nadir_k?: number | null;  // nadir in x10^3/µL
  timing_days_since_heparin?: number | null; // days to onset
  new_thrombosis_or_skin_necrosis_or_acute_systemic_reaction?: boolean | null;
  other_causes_of_thrombocytopenia_likely?: "none" | "possible" | "definite" | null;
}

export interface FourTsOutput {
  points: number;
  category: "low" | "intermediate" | "high";
  components: Record<string, number>;
}

function thrombocytopeniaPts(fall:number, nadir:number):number{
  if (fall >= 50 && nadir >= 20) return 2;
  if ((fall >= 30 && fall < 50) || (nadir >= 10 && nadir < 20)) return 1;
  return 0;
}
function timingPts(days:number):number{
  if (days >= 5 && days <= 10) return 2;
  if (days <= 1 || (days > 10)) return 1; // includes rapid fall with re-exposure
  return 1; // default to 1 if uncertain but not classic
}
function thrombosisPts(any:boolean):number{ return any ? 2 : 0; }
function otherCausesPts(lbl: FourTsInput["other_causes_of_thrombocytopenia_likely"]):number{
  if (lbl === "none") return 2;
  if (lbl === "possible") return 1;
  return 0; // definite
}

export function runFourTs(i: FourTsInput): FourTsOutput {
  const fall = Math.max(0, Math.min(100, i.platelet_fall_pct ?? 0));
  const nadir = Math.max(0, i.platelet_nadir_k ?? 0);
  const days = Math.max(0, i.timing_days_since_heparin ?? 0);
  const comp: Record<string, number> = {};
  comp.thrombocytopenia = thrombocytopeniaPts(fall, nadir);
  comp.timing = timingPts(days);
  comp.thrombosis = thrombosisPts(!!i.new_thrombosis_or_skin_necrosis_or_acute_systemic_reaction);
  comp.other_causes = otherCausesPts(i.other_causes_of_thrombocytopenia_likely ?? "possible");
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  let cat: "low"|"intermediate"|"high" = "low";
  if (pts >= 6) cat = "high"; else if (pts >= 4) cat = "intermediate";
  return { points: pts, category: cat, components: comp };
}
