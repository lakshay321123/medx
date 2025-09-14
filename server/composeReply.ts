import { randomUUID } from "crypto";
import type { AssistantMessage } from "@/lib/chat/types";

export function composeReply(): AssistantMessage {
  const msg: AssistantMessage = {
    id: randomUUID(),
    role: "assistant",
    text: "Want details on causes or treatments?",
    proposedAction: {
      actionId: "expand_details",
      payload: { section: "causes_treatments" },
      expiresAt: Date.now() + 5 * 60_000, // 5 min TTL
    },
    suggestions: [
      // keep follow-ups NON-clickable: no actionId here
      { id: "q1", label: "Want details on causes or treatments?" },
    ],
  };
  return msg;
}
