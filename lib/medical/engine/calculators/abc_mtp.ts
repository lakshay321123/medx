import { register } from "../registry";

export type ABCInputs = { Penetrating: boolean, PositiveFAST: boolean, SBP: number, HR: number };
export function runABC({Penetrating, PositiveFAST, SBP, HR}: ABCInputs) {
  if ([Penetrating, PositiveFAST, SBP, HR].some(v => v==null)) return null;
  let score = 0;
  if (Penetrating) score += 1;
  if (PositiveFAST) score += 1;
  if (SBP < 90) score += 1;
  if (HR > 120) score += 1;
  const mtp = score >= 2;
  return { score, mtp_recommended: mtp };
}

register({
  id: "abc_mtp",
  label: "ABC Score (Massive Transfusion Trigger)",
  inputs: [{key:"Penetrating",required:true},{key:"PositiveFAST",required:true},{key:"SBP",required:true},{key:"HR",required:true}],
  run: runABC as any,
});
