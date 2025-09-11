"use client";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";

export function ChatWindow() {
  const messages = useChatStore(s => s.currentId ? s.threads[s.currentId]?.messages ?? [] : []);
  const addMessage = useChatStore(s => s.addMessage);

  const handleSend = async (content: string) => {
    // after sending user message, persist thread if needed
    await persistIfTemp();
    // placeholder assistant reply
    addMessage({ role: "assistant", content: "..." });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {messages.map(m => (
          <div key={m.id} className="p-2">
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
}

export default ChatWindow;

