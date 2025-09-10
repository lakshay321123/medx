
import { register } from "../registry";

export type DAPTInputs = {
  age_years: number,
  current_smoker: boolean,
  diabetes: boolean,
  mi_at_presentation: boolean,
  prior_pci_or_mi: boolean,
  stent_diameter_lt3mm: boolean,
  paclitaxel_eluting_stent: boolean,
  lvef_lt30_or_chf: boolean,
  vein_graft_stent: boolean
};

export function runDAPT(i:DAPTInputs){
  if (i==null || i.age_years==null || !isFinite(i.age_years)) return null;
  let pts = 0;
  if (i.age_years>=75) pts -= 2;
  else if (i.age_years>=65) pts -= 1;
  if (i.current_smoker) pts += 1;
  if (i.diabetes) pts += 1;
  if (i.mi_at_presentation) pts += 1;
  if (i.prior_pci_or_mi) pts += 1;
  if (i.stent_diameter_lt3mm) pts += 1;
  if (i.paclitaxel_eluting_stent) pts += 1;
  if (i.lvef_lt30_or_chf) pts += 2;
  if (i.vein_graft_stent) pts += 2;
  const favors_prolonged = pts>=2;
  return { DAPT: pts, favors_prolonged };
}

register({ id:"dapt_score", label:"DAPT score (12–30mo)", inputs:[
  {key:"age_years",required:true},{key:"current_smoker",required:true},{key:"diabetes",required:true},
  {key:"mi_at_presentation",required:true},{key:"prior_pci_or_mi",required:true},{key:"stent_diameter_lt3mm",required:true},
  {key:"paclitaxel_eluting_stent",required:true},{key:"lvef_lt30_or_chf",required:true},{key:"vein_graft_stent",required:true}
], run: runDAPT as any });
