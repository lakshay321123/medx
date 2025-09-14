import { randomUUID } from "crypto";
import type { AssistantMessage } from "@/lib/chat/types";
import { dispatchAssistant } from "./dispatchAssistant";

export async function composeReply(threadId: string) {
  const msg: AssistantMessage = {
    id: randomUUID(),
    role: "assistant",
    threadId,
    text: "Want details on causes or treatments?",
    proposedAction: {
      actionId: "expand_details",
      payload: { section: "causes_treatments" },
      expiresAt: Date.now() + 5 * 60_000,
    },
    suggestions: [{ id: "q1", label: "Want details on causes or treatments?" }],
  };
  await dispatchAssistant(msg);
  return msg;
}
