import { runBAP65 } from "@/lib/medical/engine/calculators/bap65_copd";

test("BAP-65", () => {
  const r = runBAP65({ bun_mg_dl:30, altered_mental_status:true, pulse_bpm:120, age:70 });
  expect(r.score).toBe(4);
});
