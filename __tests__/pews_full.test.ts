import { runPEWS } from "@/lib/medical/engine/calculators/pews_full";

test("PEWS simplified", () => {
  const mid = runPEWS({ respiratory_score:1, cardiovascular_score:1, behavior_score:1, sats_score:1, o2_supplemental:true });
  expect(mid.score).toBe(6);
  expect(mid.risk).toBe("high");
});
