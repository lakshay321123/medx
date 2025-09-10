
import { runHestia } from "../lib/medical/engine/calculators/pe_hestia";

test("Hestia outpatient suitability", ()=>{
  const out = runHestia({ hemodynamic_instability:false, thrombolysis_or_embolectomy_indicated:false, active_bleeding_or_high_risk:false, oxygen_requirement:false, severe_renal_or_liver_impairment:false, pregnancy:false, social_reasons_boolean:false, pain_requires_iv_medication:false, other_medical_or_psych_reason:false })!;
  expect(out.eligible_outpatient).toBe(true);
});
