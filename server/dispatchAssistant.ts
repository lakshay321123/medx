import { setPendingAction } from "@/lib/chat/pending";
import type { AssistantMessage } from "@/lib/chat/types";
// import { MessageStore } from "@/server/store";

export async function dispatchAssistant(msg: AssistantMessage) {
  try {
    // await MessageStore.insert(msg);  // ensure msg.proposedAction gets saved (e.g., in a JSON column)
  } catch (e) {
    console.error("[dispatchAssistant] persist failed", e);
  }

  setPendingAction(msg.threadId, msg.id, msg.proposedAction);

  return msg;
}
