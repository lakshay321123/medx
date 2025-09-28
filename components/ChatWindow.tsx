"use client";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";
import ScrollToBottom from "@/components/ui/ScrollToBottom";
import { getResearchFlagFromUrl } from "@/utils/researchFlag";
import ChatMarkdown from "@/components/ChatMarkdown";
import { LinkBadge } from "@/components/SafeLink";
import { AssistantPendingMessage } from "@/components/chat/AssistantPendingMessage";
import { usePendingAssistantStages } from "@/hooks/usePendingAssistantStages";
import type { AppMode } from "@/lib/welcomeMessages";
import { usePrefs } from "@/components/providers/PreferencesProvider";

const CHAT_UX_V2_ENABLED = process.env.NEXT_PUBLIC_CHAT_UX_V2 !== "0";

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
  const composerRef = useRef<HTMLDivElement>(null);
  const [pendingMessage, setPendingMessage] = useState<{ id: string; content: string } | null>(null);
  const [modeChoice, setModeChoice] = useState<AppMode>('wellness');
  const hasScrollableContent = messages.length > 0 || results.length > 0 || !!pendingMessage;
  const prefs = usePrefs();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectToAccount = useCallback(() => {
    const q = new URLSearchParams(searchParams?.toString() || "");
    const threadId = q.get("threadId");
    q.set("panel", "settings");
    q.set("tab", "Account");
    if (threadId) {
      q.set("threadId", threadId);
    }
    router.push(`/?${q.toString()}`);
  }, [router, searchParams]);

  const canSend = () => {
    prefs.resetWindowIfNeeded();
    return prefs.plan === "pro" || prefs.promptsUsed < 10;
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const composer = composerRef.current;
    if (!composer) return;
    const root = document.documentElement;
    const previousHeight = root.style.getPropertyValue("--mobile-composer-height");
    const hadPreviousHeight = previousHeight.trim().length > 0;

    const restore = () => {
      if (hadPreviousHeight) {
        root.style.setProperty("--mobile-composer-height", previousHeight);
      } else {
        root.style.removeProperty("--mobile-composer-height");
      }
    };

    const updateMetrics = () => {
      const rect = composer.getBoundingClientRect();
      const height = Math.max(64, Math.round(rect.height));
      root.style.setProperty("--mobile-composer-height", `${height}px`);
    };

    updateMetrics();

    const handleFooterMetrics = () => {
      updateMetrics();
    };

    window.addEventListener("mobile-footer-height-change", handleFooterMetrics);
    window.addEventListener("resize", updateMetrics);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("mobile-footer-height-change", handleFooterMetrics);
        window.removeEventListener("resize", updateMetrics);
        restore();
      };
    }

    const observer = new ResizeObserver(() => {
      updateMetrics();
    });
    observer.observe(composer);

    return () => {
      observer.disconnect();
      window.removeEventListener("mobile-footer-height-change", handleFooterMetrics);
      window.removeEventListener("resize", updateMetrics);
      restore();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("panel") === "ai-doc") {
      setModeChoice("aidoc");
      return;
    }
    const modeParam = params.get("mode");
    if (modeParam === "doctor") {
      setModeChoice("clinical");
    } else if (params.get("therapy") === "1") {
      setModeChoice("therapy");
    } else {
      setModeChoice("wellness");
    }
  }, []);

  const handlePendingContentUpdate = useCallback((messageId: string, text: string) => {
    setPendingMessage(prev => (prev && prev.id === messageId ? { ...prev, content: text } : prev));
  }, []);

  const handlePendingFinalize = useCallback(
    (messageId: string, finalContent: string) => {
      setPendingMessage(prev => (prev && prev.id === messageId ? { ...prev, content: finalContent } : prev));
      addMessage({ role: "assistant", content: finalContent });
      setPendingMessage(null);
    },
    [addMessage],
  );

  const {
    state: pendingAssistantState,
    begin: beginPendingAssistant,
    markStreaming: markPendingAssistantStreaming,
    enqueue: enqueuePendingAssistant,
    finish: finishPendingAssistant,
  } = usePendingAssistantStages({
    enabled: CHAT_UX_V2_ENABLED,
    onContentUpdate: handlePendingContentUpdate,
    onFinalize: handlePendingFinalize,
  });

  const handleSend = async (content: string, locationToken?: string) => {
    if (!canSend()) {
      redirectToAccount();
      return;
    }

    // after sending user message, persist thread if needed
    await persistIfTemp();
    const research = getResearchFlagFromUrl();
    const pendingId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `pending-${Date.now()}`;
    setPendingMessage({ id: pendingId, content: "" });
    beginPendingAssistant(pendingId, { mode: modeChoice, research, text: content });
    if (!locationToken) {
      setResults([]);
    }
    try {
      const payload: Record<string, unknown> = { query: content, lang: prefs.lang, research };
      if (locationToken) {
        payload.locationToken = locationToken;
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": prefs.lang,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Chat request failed: ${res.status}`);
      }
      const data = await res.json();
      if (locationToken && Array.isArray(data?.results)) {
        setResults(data.results);
        const text = data.results.length > 0 ? "Here are some places nearby:" : "";
        markPendingAssistantStreaming(pendingId);
        if (text) {
          enqueuePendingAssistant(pendingId, text);
        }
        finishPendingAssistant(pendingId, text);
      } else {
        const reply = typeof data?.reply === "string" ? data.reply : `You said: ${content}`;
        markPendingAssistantStreaming(pendingId);
        enqueuePendingAssistant(pendingId, reply);
        finishPendingAssistant(pendingId, reply);
      }
    } catch (error) {
      console.error(error);
      const fallback = "We couldn't complete that. Please try again.";
      markPendingAssistantStreaming(pendingId);
      enqueuePendingAssistant(pendingId, fallback);
      finishPendingAssistant(pendingId, fallback);
      setResults([]);
    } finally {
      prefs.incUsage();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={chatRef}
        className={`flex-1 pt-4 md:px-0 md:pt-0 ${
          hasScrollableContent
            ? "overflow-y-auto mobile-chat-scroll"
            : "overflow-hidden mobile-chat-scroll-empty"
        } md:pb-0 md:overflow-y-auto`}
      >
        <div className="px-4">
          {messages.map(m => (
            <div key={m.id} className="space-y-2">
              <MessageRow m={m} />
            </div>
          ))}
          {pendingMessage ? (
            <div className="space-y-2">
              {pendingAssistantState && pendingAssistantState.id === pendingMessage.id ? (
                <AssistantPendingMessage
                  stage={pendingAssistantState.stage}
                  analyzingPhrase={pendingAssistantState.analyzingPhrase}
                  thinkingLabel={pendingAssistantState.thinkingLabel}
                  content={pendingMessage.content}
                />
              ) : (
                <AssistantPendingMessage
                  stage={modeChoice === "therapy" ? "reflecting" : "thinking"}
                  analyzingPhrase={null}
                  thinkingLabel={modeChoice === "therapy" ? "Reflecting…" : undefined}
                  content={pendingMessage.content}
                />
              )}
            </div>
          ) : null}
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
      </div>
      <div ref={composerRef} className="mobile-composer md:static md:bg-transparent md:p-0 md:shadow-none">
        <ChatInput onSend={handleSend} />
      </div>
      <ScrollToBottom targetRef={chatRef} rebindKey={currentId} />
    </div>
  );
}

export default ChatWindow;

