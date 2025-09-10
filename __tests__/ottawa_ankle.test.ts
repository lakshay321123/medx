import { test, expect } from "@jest/globals";
import { runOttawaAnkle } from "../lib/medical/engine/calculators/ottawa_ankle";

test("Ottawa ankle rules", () => {
  const out = runOttawaAnkle({ malleolar_pain: true, bone_tender_posterior_edge_lat_malleolus: true, inability_bear_weight_4steps: false });
  expect(out.need_radiograph).toBe(true);
});
