import { runSAAG } from "../../lib/medical/engine/calculators/saag";

test("SAAG portal vs non-portal", () => {
  expect(runSAAG({SerumAlbumin:3.5, AscitesAlbumin:1.0})!.interpretation).toMatch(/portal/);
  expect(runSAAG({SerumAlbumin:2.8, AscitesAlbumin:2.0})!.interpretation).toMatch(/non-portal/);
});
