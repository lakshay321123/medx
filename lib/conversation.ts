import { v4 as uuid } from "uuid";
export function createConversationId() {
  return `conv_${uuid()}`;
}
