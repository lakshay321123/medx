"use client";
import { useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";
import { thinking } from "@/lib/ux/thinking";

export function ChatWindow() {
  const messages = useChatStore(s => s.currentId ? s.threads[s.currentId]?.messages ?? [] : []);
  const addMessage = useChatStore(s => s.addMessage);
  const [results, setResults] = useState<any[]>([]);

  const handleSend = async (content: string, locationToken?: string) => {
    // after sending user message, persist thread if needed
    await persistIfTemp();
    if (locationToken) {
      thinking.start("Analyzing…");
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: content, locationToken }),
        });
        thinking.headers(res);
        const data = await res.json();
        setResults(data.results || []);
        addMessage({ role: "assistant", content: data.results ? "Here are some places nearby:" : "" });
      } finally {
        thinking.stop();
      }
    } else {
      // For now, echo the user's message as the assistant reply
      // In a real implementation, replace this with a call to your backend/AI service
      addMessage({ role: "assistant", content: `You said: ${content}` });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {messages.map(m => (
          <div key={m.id} className="p-2">
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
        {results.length > 0 && (
          <div className="p-2 space-y-2">
            {results.map((place) => (
              <div key={place.id} className="result-card border p-2 rounded">
                <p>{place.name}</p>
                <p className="text-sm opacity-80">{place.address}</p>
                {place.mapLink && (
                  <a className="text-blue-600 underline" href={place.mapLink} target="_blank" rel="noopener noreferrer">
                    Directions
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
}

export default ChatWindow;

