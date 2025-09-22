export interface RedFlagChecklist {
  openCut?: boolean;
  numbness?: boolean;
  severeSwelling?: boolean;
}

const CHECKLIST_LABELS: Record<keyof Required<RedFlagChecklist>, string> = {
  openCut: "Open wound/cut over suspected fracture site",
  numbness: "Numbness or tingling in fingers/hand",
  severeSwelling: "Severe swelling or visible deformity",
};

function normalizeModelFlags(flags: unknown): string[] {
  if (!Array.isArray(flags)) return [];
  return flags
    .map(flag => (typeof flag === "string" ? flag.trim() : ""))
    .filter(Boolean);
}

export interface RedFlagMergeResult {
  merged: string[];
  checklistFlags: string[];
}

export function deriveRedFlags(
  checklist: RedFlagChecklist | null | undefined,
  modelFlags: unknown,
): RedFlagMergeResult {
  const fromModel = normalizeModelFlags(modelFlags);
  const fromChecklist: string[] = [];

  if (checklist) {
    for (const key of Object.keys(CHECKLIST_LABELS) as (keyof RedFlagChecklist)[]) {
      if (checklist[key]) {
        fromChecklist.push(CHECKLIST_LABELS[key as keyof Required<RedFlagChecklist>]);
      }
    }
  }

  const merged = Array.from(new Set([...fromModel, ...fromChecklist]));
  return { merged, checklistFlags: fromChecklist };
}
