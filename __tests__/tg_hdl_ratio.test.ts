import { runTGHdlRatio } from "@/lib/medical/engine/calculators/tg_hdl_ratio";

test("TG HDL ratio", () => {
  const r = runTGHdlRatio({ trig_mg_dl:150, hdl_mg_dl:50 });
  expect(r.ratio).toBeCloseTo(3.0, 3);
});
