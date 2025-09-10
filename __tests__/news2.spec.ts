
import { runNEWS2 } from "../lib/medical/engine/calculators/news2";

test("NEWS2 scoring & trigger", () => {
  const out = runNEWS2({ RR:28, SpO2:92, onOxygen:true, Temp_C:38.5, SBP:95, HR:120, ACVPU:"V" })!;
  expect(out.score).toBeGreaterThanOrEqual(7);
  expect(out.trigger).toBe("urgent response");
});
