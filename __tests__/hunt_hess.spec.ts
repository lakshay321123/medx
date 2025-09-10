import { runHuntHess } from "../lib/medical/engine/calculators/hunt_hess";

test("Hunt-Hess", ()=>{ const o=runHuntHess({headache_mild:true,nuchal_rigidity:true,cranial_nerve_palsy:false,drowsy_or_confused:false,mild_focal_deficit:false,stupor:false,severe_focal_deficit:false,decerebrate_posturing:false})!; expect(o.Hunt_Hess).toBe(2); });
