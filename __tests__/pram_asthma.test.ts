import { runPRAM } from "@/lib/medical/engine/calculators/pram_asthma";

test("PRAM severity bands", () => {
  const mild = runPRAM({ suprasternal_ret:0, scalene_use:0, air_entry:0, wheeze:0, o2_sat:0 });
  expect(mild.score).toBe(0);
  expect(mild.severity).toBe("mild");
  const sev = runPRAM({ suprasternal_ret:2, scalene_use:2, air_entry:3, wheeze:3, o2_sat:2 });
  expect(sev.score).toBe(12);
  expect(sev.severity).toBe("severe");
});
