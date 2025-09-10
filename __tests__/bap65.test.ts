
import { test, expect } from "@jest/globals";
import { runBAP65 } from "../lib/medical/engine/calculators/bap65";

test("BAP-65 class IV", () => {
  const out = runBAP65({ bun_mg_dL:30, altered_mental_status:true, pulse_bpm:120, age_years:70 });
  expect(out.points).toBe(4);
  expect(out.class_label).toBe("IV");
});
