export type ConversationalAct =
  | "ack"          // nice / exactly / thanks
  | "clarify"      // user asks clarification
  | "followup"     // user extends same topic
  | "new_topic";   // clearly different topic
