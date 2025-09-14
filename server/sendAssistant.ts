import type { AssistantMessage } from "@/lib/chat/types";
import { setPendingAction } from "@/lib/chat/pending";

export async function sendAssistant(msg: AssistantMessage) {
  // ...persist to DB/stream to client...
  setPendingAction(msg.id, msg.proposedAction); // ← cache last proposed action
}
