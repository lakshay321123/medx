"use client";

import type { ChatMessage } from "@/types/chat";

import Message from "./Message";

export default function MessageList({ items }: { items: ChatMessage[] }) {
  return (
    <div className="space-y-2">
      {items.map(message => (
        <Message key={message.id} m={message} />
      ))}
    </div>
  );
}
