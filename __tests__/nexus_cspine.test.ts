import { runNEXUS } from "@/lib/medical/engine/calculators/nexus_cspine";

test("NEXUS clear", () => {
  const r = runNEXUS({ midline_tenderness:false, intoxication:false, neuro_deficit:false, distracting_injury:false, altered_mental_status:false });
  expect(r.clearable_without_imaging).toBe(true);
});
