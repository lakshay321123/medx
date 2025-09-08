export function requireUnits(s: string) {
  // nudge model via system hint — enforce presence of units in final answer
  return "\n\nREQUIREMENT: If a numeric result exists, include units and a one-line unit check.";
}
