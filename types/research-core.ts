export type Phase = "1" | "2" | "3" | "4";
export type Status = "Recruiting" | "Completed";

export type ResearchFilters = {
  phase?: Phase;
  status?: Status;
  country?: string;
  gene?: string;
};

export function normalizePhase(raw?: string): Phase | undefined {
  if (!raw) return;
  const v = raw.replace(/[^0-9]/g, "");
  if (["1", "2", "3", "4"].includes(v)) return v as Phase;
}

export function normalizeStatus(raw?: string): Status | undefined {
  if (!raw) return;
  const v = raw.trim().toLowerCase();
  if (v === "recruiting") return "Recruiting";
  if (v === "completed") return "Completed";
}

