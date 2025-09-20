"use client";
import { useSearchParams } from "next/navigation";

export function useIsAiDocMode() {
  const sp = useSearchParams();
  const mode = sp.get("mode")?.toLowerCase();
  const panel = sp.get("panel")?.toLowerCase();
  const threadId = sp.get("threadId")?.toLowerCase();
  const context = sp.get("context")?.toLowerCase();

  if (mode === "ai-doc") return true;
  if (panel === "ai-doc") return true;
  if (panel === "chat" && threadId === "med-profile" && context === "profile") return true;
  if (context === "ai-doc-med-profile") return true;
  return false;
}
