"use client";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import type { ChatMessage } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";
import { AnalyzingInline } from "@/components/chat/AnalyzingInline";
import ScrollToBottom from "@/components/ui/ScrollToBottom";
import { getResearchFlagFromUrl } from "@/utils/researchFlag";
import ChatMarkdown from "@/components/ChatMarkdown";
import { LinkBadge } from "@/components/SafeLink";

function MessageRow({ m }: { m: ChatMessage }) {
  if (m.kind === "image" && m.imageUrl) {
    return (
      <div className="p-2 space-y-1">
        <div className="text-xs uppercase tracking-wide text-slate-500">{m.role}</div>
        <div className={`my-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[65%] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <img
              src={m.imageUrl}
              alt="uploaded"
              className="block max-h-[360px] w-auto object-contain"
            />
            {m.pending ? <div className="p-2 text-xs opacity-70">Analyzing…</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">{m.role}</div>
      <ChatMarkdown content={m.content ?? ""} />
    </div>
  );
}

export function ChatWindow() {
  const messages = useChatStore(s => s.currentId ? s.threads[s.currentId]?.messages ?? [] : []);
  const addMessage = useChatStore(s => s.addMessage);
  const updateMessage = useChatStore(s => s.updateMessage);
  const currentId = useChatStore(s => s.currentId);
  const [results, setResults] = useState<any[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    function onPush(event: Event) {
      const ce = event as CustomEvent<Partial<ChatMessage>>;
      const msg = ce.detail;
      if (!msg || !msg.role) return;
      const state = useChatStore.getState();
      if (!state.currentId) {
        state.startNewThread();
      }
      const payload = {
        ...msg,
        ts: typeof msg.createdAt === "number" ? msg.createdAt : msg.ts,
      } as Omit<ChatMessage, "id" | "ts"> & { id?: string; ts?: number; createdAt?: number };
      state.addMessage(payload);
    }

    function onUpdate(event: Event) {
      const ce = event as CustomEvent<{ id?: string; updates?: Partial<ChatMessage> }>;
      const detail = ce.detail;
      if (!detail?.id || !detail.updates) return;
      updateMessage(detail.id, detail.updates);
    }

    window.addEventListener("medx:chat:push", onPush as EventListener);
    window.addEventListener("medx:chat:update", onUpdate as EventListener);
    return () => {
      window.removeEventListener("medx:chat:push", onPush as EventListener);
      window.removeEventListener("medx:chat:update", onUpdate as EventListener);
    };
  }, [updateMessage]);

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
    <div className="flex flex-col h-full">
      <div ref={chatRef} className="flex-1 overflow-auto">
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
      <ChatInput onSend={handleSend} />
      <ScrollToBottom targetRef={chatRef} rebindKey={currentId} />
    </div>
  );
}

export default ChatWindow;

