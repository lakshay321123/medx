  import { calc_glasgow_blatchford } from "../lib/medical/engine/calculators/glasgow_blatchford";

  describe("calc_glasgow_blatchford", () => {

it("scores Glasgow-Blatchford", () => {
  const v = calc_glasgow_blatchford({
    bun_mg_dl: 30, hb_g_dl: 11.5, sex: "male", sbp: 95, pulse: 105,
    melena: true, syncope: false, hepatic_disease: true, cardiac_failure: false
  });
  expect(v).toBe(12);
});

  });
