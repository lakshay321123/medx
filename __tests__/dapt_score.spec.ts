
import { runDAPT } from "../lib/medical/engine/calculators/dapt_score";

test("DAPT favors prolonged", ()=>{
  const out = runDAPT({ age_years:60, current_smoker:true, diabetes:true, mi_at_presentation:true, prior_pci_or_mi:false, stent_diameter_lt3mm:true, paclitaxel_eluting_stent:false, lvef_lt30_or_chf:true, vein_graft_stent:false })!;
  expect(out.DAPT).toBeGreaterThanOrEqual(2);
  expect(out.favors_prolonged).toBe(true);
});
