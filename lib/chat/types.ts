export type DraftMode = "clinical" | "wellness" | "ai-doc";
export type ThreadMode = "patient" | "doctor";

export function mapDraftToThreadMode(mode: DraftMode): ThreadMode {
  if (mode === "clinical") {
    return "doctor";
  }
  return "patient";
}
