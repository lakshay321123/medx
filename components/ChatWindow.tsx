"use client";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";
import { AnalyzingInline } from "@/components/chat/AnalyzingInline";
import ScrollToBottom from "@/components/ui/ScrollToBottom";
import { getResearchFlagFromUrl } from "@/utils/researchFlag";
import { LinkBadge } from "@/components/SafeLink";
import Message from "@/components/chat/Message";

export function ChatWindow() {
  const messages = useChatStore(s => s.currentId ? s.threads[s.currentId]?.messages ?? [] : []);
  const addMessage = useChatStore(s => s.addMessage);
  const currentId = useChatStore(s => s.currentId);
  const [results, setResults] = useState<any[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, { url: string; name: string }[]>>({});

  useEffect(() => {
    return () => {
      Object.values(attachments).forEach(group => {
        group.forEach(item => URL.revokeObjectURL(item.url));
      });
    };
  }, [attachments]);

  useEffect(() => {
    Object.values(attachments).forEach(group => {
      group.forEach(item => URL.revokeObjectURL(item.url));
    });
    setAttachments({});
  }, [currentId]);

  const handleScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setShowJump(distance > 200);
  };

  useEffect(() => {
    handleScroll();
  }, [messages.length]);

  const handleSend = async (content: string, locationToken?: string, files?: File[], messageId?: string) => {
    // after sending user message, persist thread if needed
    await persistIfTemp();
    setIsThinking(true);

    if (files?.length && messageId) {
      const previews = files
        .filter(file => file.type.startsWith("image/"))
        .map(file => ({ url: URL.createObjectURL(file), name: file.name }));
      if (previews.length) {
        setAttachments(prev => ({ ...prev, [messageId]: previews }));
      }
    }

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
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-3 pt-3 pb-32 md:px-6 md:pt-6 md:pb-6"
        onScroll={handleScroll}
      >
        <div className="mx-auto flex w-full max-w-screen-md flex-col gap-2">
          {messages.map((m, idx) => {
            const isLastMessage = idx === messages.length - 1;
            const showThinkingTimer = isLastMessage && isThinking;
            const attachmentUrls = attachments[m.id]?.map(item => item.url) ?? [];

            return (
              <div key={m.id} className="relative">
                <Message message={{ ...(m as any), attachments: attachmentUrls }} />
                {showThinkingTimer ? (
                  <div className="mt-1 flex justify-start px-2 text-sm text-slate-400">
                    <AnalyzingInline active={showThinkingTimer} />
                  </div>
                ) : null}
              </div>
            );
          })}

          {results.length > 0 && (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3 text-sm text-slate-200 md:border-slate-200/70 md:bg-white/80 md:text-slate-900">
              <div className="mb-2 font-semibold">Nearby places</div>
              <div className="space-y-3">
                {results.map((place) => (
                  <div key={place.id} className="rounded-xl border border-white/5 bg-slate-950/40 p-3 md:border-slate-200/60 md:bg-white/70">
                    <p className="font-medium">{place.name}</p>
                    <p className="text-xs opacity-80">{place.address}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      {place.phone && (
                        <a href={`tel:${place.phone}`} className="text-blue-300 underline md:text-blue-600">
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
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <div className="pointer-events-none fixed inset-x-0 bottom-[64px] z-10 h-12 bg-gradient-to-t from-slate-950/95 to-transparent" />
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => {
            const el = chatRef.current;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            setShowJump(false);
          }}
          className="fixed bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-lg md:hidden"
        >
          <span className="inline-flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12l6 6 6-6" />
            </svg>
            Jump to latest
          </span>
        </button>
      )}

      <ChatInput onSend={handleSend} />
      <ScrollToBottom targetRef={chatRef} rebindKey={currentId} />
    </div>
  );
}

export default ChatWindow;

