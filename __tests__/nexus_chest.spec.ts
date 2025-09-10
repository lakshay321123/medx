import { runNEXUS_Chest } from "../lib/medical/engine/calculators/nexus_chest";

test("NEXUS Chest", ()=>{ const o=runNEXUS_Chest({age_gt60:false,rapid_deceleration_mechanism:false,chest_pain:false,intoxication:false,abnormal_alertness_or_mental_status:false,distracting_injury:false,chest_wall_tenderness:false})!; expect(o.rule_negative).toBe(true); });
