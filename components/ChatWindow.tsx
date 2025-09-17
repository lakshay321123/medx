"use client";
import { useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";
import ThinkingTimer from "@/components/ui/ThinkingTimer";
import ScrollToBottom from "@/components/ui/ScrollToBottom";
import { getResearchFlagFromUrl } from "@/utils/researchFlag";

function MessageRow({ m }: { m: { id: string; role: string; content: string } }) {
  return (
    <div className="p-2">
      <strong>{m.role}:</strong>{" "}
      {m.content}
    </div>
  );
}

export function ChatWindow() {
  const messages = useChatStore(s => s.currentId ? s.threads[s.currentId]?.messages ?? [] : []);
  const addMessage = useChatStore(s => s.addMessage);
  const currentId = useChatStore(s => s.currentId);
  const [results, setResults] = useState<any[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | null>(null);

  const handleSend = async (content: string, locationToken?: string) => {
    // after sending user message, persist thread if needed
    await persistIfTemp();
    setIsThinking(true);
    setThinkingStartedAt(Date.now());
    if (locationToken) {
      const research = getResearchFlagFromUrl();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: content, locationToken, research }),
      });
      const data = await res.json();
      setResults(data.results || []);
      addMessage({ role: "assistant", content: data.results ? "Here are some places nearby:" : "" });
    } else {
      // For now, echo the user's message as the assistant reply
      // In a real implementation, replace this with a call to your backend/AI service
      addMessage({ role: "assistant", content: `You said: ${content}` });
    }
    setIsThinking(false);
    setThinkingStartedAt(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={chatRef} className="flex-1 overflow-auto">
        {messages.map(m => (
          <MessageRow key={m.id} m={m} />
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
      {isThinking && thinkingStartedAt && (
        <div className="p-2">
          <ThinkingTimer label="Analyzing" startedAt={thinkingStartedAt} />
        </div>
      )}
      <ChatInput onSend={handleSend} />
      <ScrollToBottom targetRef={chatRef} rebindKey={currentId} />
    </div>
  );
}

export default ChatWindow;

