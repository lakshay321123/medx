
import { runKillip } from "../lib/medical/engine/calculators/acs_killip";

test("Killip", ()=>{
  const out = runKillip({ class_num:4 })!;
  expect(out.Killip).toBe(4);
  expect(out.description).toContain("shock");
});
