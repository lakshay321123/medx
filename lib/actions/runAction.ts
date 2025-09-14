import type { ActionId } from "@/lib/chat/types";
import { summarize } from "./summarize";
import { startTriage } from "./triage";
import { expandDetails } from "./expandDetails";
import { makeTimeline } from "./timeline";
import { exportPdf } from "./pdf";
import { shareThread } from "./share";

export async function runAction(actionId: ActionId, payload?: any) {
  switch (actionId) {
    case "summarize":      return summarize(payload);
    case "triage":         return startTriage(payload);
    case "expand_details": return expandDetails(payload); // ← for “Want details…?”
    case "make_timeline":  return makeTimeline(payload);
    case "pdf":            return exportPdf(payload);
    case "share":          return shareThread(payload);
    default:                return { ok: false, error: "Unknown action" };
  }
}
