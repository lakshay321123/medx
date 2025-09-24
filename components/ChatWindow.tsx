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
import { ENABLE_MOBILE_UI } from "@/env";

const EMPTY_MESSAGES: ReadonlyArray<any> = [];

export function ChatWindow() {
  const messages = useChatStore(state => {
    const id = state.currentId;
    if (!id) return EMPTY_MESSAGES;
    const thread = state.threads[id];
    const list = thread?.messages;
    return Array.isArray(list) ? list : EMPTY_MESSAGES;
  });
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
        className="flex-1 overflow-y-auto px-3 pt-4 pb-32 md:px-8 md:pt-8 md:pb-10"
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
                  <div className="mt-1 flex justify-start px-2 text-sm text-[#64748B] dark:text-[#CBD5F5]">
                    <AnalyzingInline active={showThinkingTimer} />
                  </div>
                ) : null}
              </div>
            );
          })}

          {results.length > 0 && (
            <div className="rounded-2xl border border-[#1E3A5F] bg-[#13233D] p-4 text-sm text-[#E6EDF7] md:border-[#E2E8F0] md:bg-[#F8FAFC] md:text-[#0F172A]">
              <div className="mb-2 font-semibold">Nearby places</div>
              <div className="space-y-3">
                {results.map((place) => (
                  <div key={place.id} className="rounded-xl border border-[#1E3A5F] bg-[#0F1B2D] p-3 text-[#E6EDF7] md:border-[#E2E8F0] md:bg-white md:text-[#0F172A]">
                    <p className="font-medium leading-6">{place.name}</p>
                    <p className="text-xs opacity-80">{place.address}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      {place.phone && (
                        <a href={`tel:${place.phone}`} className="text-[#3B82F6] underline md:text-[#2563EB]">
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

      {ENABLE_MOBILE_UI ? (
        <div className="md:hidden">
          <div className="pointer-events-none fixed inset-x-0 bottom-[64px] z-10 h-12 bg-gradient-to-t from-white/95 via-white/40 to-transparent dark:from-[#0B1220]/95 dark:via-[#0B1220]/40" />
        </div>
      ) : null}

      {ENABLE_MOBILE_UI && showJump && (
        <button
          type="button"
          onClick={() => {
            const el = chatRef.current;
            if (!el) return;
            el.scrollTo?.({ top: el.scrollHeight, behavior: "smooth" });
            setShowJump(false);
          }}
          className="fixed bottom-28 right-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg transition hover:bg-[#1D4ED8] md:hidden dark:bg-[#3B82F6] dark:hover:bg-[#2563EB]"
          aria-label="Jump to latest"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 10l6 6 6-6" />
          </svg>
        </button>
      )}

      <ChatInput onSend={handleSend} />
      <ScrollToBottom targetRef={chatRef} rebindKey={currentId} />
    </div>
  );
}

export default ChatWindow;

