import { TrialRecord } from "../types";

// WHO ICTRP does not expose a stable unauthenticated API; return empty for now.
export async function fetchICTRP(_: any): Promise<TrialRecord[]> {
  return [];
}
