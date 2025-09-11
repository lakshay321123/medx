import { calc_edd } from "../lib/medical/engine/calculators/edd_naegele";
describe("calc_edd", () => {
  it("adds 280 days to LMP", () => {
    const r = calc_edd({ lmp_iso: "2024-01-01", as_of_iso: "2024-01-15" });
    expect(r.edd_iso).toBe("2024-10-07");
    expect(r.ga_weeks).toBe(2);
    expect(r.ga_days).toBe(0);
  });
});
