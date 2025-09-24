"use client";
import { useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";
import { AnalyzingInline } from "@/components/chat/AnalyzingInline";
import ScrollToBottom from "@/components/ui/ScrollToBottom";
import { getResearchFlagFromUrl } from "@/utils/researchFlag";
import ChatMarkdown from "@/components/ChatMarkdown";
import { LinkBadge } from "@/components/SafeLink";

function MessageRow({ m }: { m: { id: string; role: string; content: string } }) {
  return (
    <div className="p-2 space-y-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">{m.role}</div>
      <ChatMarkdown content={m.content} />
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

  const handleSend = async (content: string, locationToken?: string) => {
    // after sending user message, persist thread if needed
    await persistIfTemp();
    setIsThinking(true);
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
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 pb-32 pt-4 md:px-0 md:pb-0 md:pt-0"
      >
        {messages.map((m, idx) => {
          const isLastMessage = idx === messages.length - 1;
          const showThinkingTimer = isLastMessage && isThinking;
          return (
            <div key={m.id} className="space-y-2">
              <MessageRow m={m} />
              {showThinkingTimer ? (
                <div className="px-2">
                  <div className="mt-1 inline-flex items-center gap-3 text-sm text-slate-500">
                    <span>Thinking…</span>
                    <AnalyzingInline active={showThinkingTimer} />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {results.length > 0 && (
          <div className="p-2 space-y-2">
            {results.map((place) => (
              <div key={place.id} className="result-card border p-2 rounded">
                <p>{place.name}</p>
                <p className="text-sm opacity-80">{place.address}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {place.phone && (
                    <a href={`tel:${place.phone}`} className="underline">
                      Call
                    </a>
                  )}
                  {place.mapLink && (
                    <LinkBadge href={place.mapLink}>
                      Directions
                    </LinkBadge>
                  )}
                  <span className="opacity-70">{place.distance_km} km</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mobile-composer md:static md:bg-transparent md:p-0 md:shadow-none">
        <ChatInput onSend={handleSend} />
      </div>
      <ScrollToBottom targetRef={chatRef} rebindKey={currentId} />
    </div>
  );
}

export default ChatWindow;

