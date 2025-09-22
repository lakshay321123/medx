import type { ChatMessage } from "@/types/chat";
import Message from "./Message";

export default function MessageList({ items }: { items: ChatMessage[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map(m => (
        <Message key={m.id} m={m} />
      ))}
    </div>
  );
}
