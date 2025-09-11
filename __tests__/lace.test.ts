import { calc_lace } from "../lib/medical/engine/calculators/lace";

describe("calc_lace", () => {
  it("maps LOS/acuity/CCI/ED to points", () => {
    const v = calc_lace({ length_of_stay_days: 10, acute_admission: true, charlson_index: 4, ed_visits_past_6mo: 2 });
    expect(v).toBe(14);
  });
});
