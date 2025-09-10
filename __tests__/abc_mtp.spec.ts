import { runABC } from "../../lib/medical/engine/calculators/abc_mtp";

test("ABC triggers MTP >=2", () => {
  const out = runABC({Penetrating:true, PositiveFAST:true, SBP:85, HR:130})!;
  expect(out.score).toBe(4);
  expect(out.mtp_recommended).toBe(true);
});
