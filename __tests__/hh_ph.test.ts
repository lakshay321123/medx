import { runHendersonHasselbalch } from "@/lib/medical/engine/calculators/hh_ph";

test("Henderson-Hasselbalch", () => {
  const r = runHendersonHasselbalch({ hco3:24, paco2:40 });
  expect(r.ph).toBeCloseTo(7.4, 2);
});
