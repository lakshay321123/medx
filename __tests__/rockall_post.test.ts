import { runRockallPost } from "@/lib/medical/engine/calculators/rockall_post";

test("Rockall post endoscopy", () => {
  const r = runRockallPost({ age_years:82, shock:"hypotension", comorbidity:"very_major", diagnosis:"malignancy", stigmata:"srh_present" });
  expect(r.score).toBeGreaterThanOrEqual(2+2+3+2+2);
  expect(r.band).toBe("high");
});
