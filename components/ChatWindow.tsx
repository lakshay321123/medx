"use client";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import ChatErrorBubble from "@/components/chat/ChatErrorBubble";
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
import WelcomeCard from "@/components/chat/WelcomeCard";
import { useUIStore } from "@/components/hooks/useUIStore";
import type { ChatMessage, AssistantRetrySnapshot } from "@/lib/state/chatStore";
import { newIdempotencyKey } from "@/lib/net/idempotency";
import { retryFetch } from "@/lib/net/retry";
import { normalizeNetworkError } from "@/lib/net/errors";

const CHAT_UX_V2_ENABLED = process.env.NEXT_PUBLIC_CHAT_UX_V2 !== "0";

function MessageRow({ m }: { m: ChatMessage }) {
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
  const removeMessage = useChatStore(s => s.removeMessage);
  const currentId = useChatStore(s => s.currentId);
  const [results, setResults] = useState<any[]>([]);
  const prefs = usePrefs();
  const chatRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [pendingMessage, setPendingMessage] = useState<{ id: string; content: string } | null>(null);
  const [modeChoice, setModeChoice] = useState<AppMode>('wellness');
  const showWelcomeCard = messages.length === 0 && results.length === 0 && !pendingMessage;
  const hasScrollableContent =
    messages.length > 0 || results.length > 0 || !!pendingMessage || showWelcomeCard;
  const openPrefs = useUIStore((state) => state.openPrefs);

  const gotoAccount = useCallback(() => {
    openPrefs("Account");
  }, [openPrefs]);

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
    (messageId: string, finalContent: string, extras?: { error?: string | null; retrySnapshot?: AssistantRetrySnapshot | null }) => {
      setPendingMessage(prev => (prev && prev.id === messageId ? { ...prev, content: finalContent } : prev));
      if (extras?.error && extras.retrySnapshot) {
        setPendingMessage(prev => (prev && prev.id === messageId ? null : prev));
        addMessage({ id: messageId, role: "assistant", content: "", error: true, retrySnapshot: extras.retrySnapshot });
        return;
      }
      addMessage({ id: messageId, role: "assistant", content: finalContent });
      setPendingMessage(prev => (prev && prev.id === messageId ? null : prev));
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

  const handleSend = async (content: string, locationToken?: string, langOverride?: string) => {
    if (!prefs.canSend()) {
      gotoAccount();
      return;
    }

    const lang = langOverride ?? prefs.lang;

    await persistIfTemp();
    const research = getResearchFlagFromUrl();
    const pendingId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `pending-${Date.now()}`;
    setPendingMessage({ id: pendingId, content: "" });
    beginPendingAssistant(pendingId, { mode: modeChoice, research, text: content });
    let counted = false;

    const { useMemoryStore } = await import("@/lib/memory/useMemoryStore");
    const includeFlags = {
      memories: useMemoryStore.getState().enabled,
      chatHistory: prefs.referenceChatHistory,
      recordHistory: prefs.referenceRecordHistory,
    };
    const personalization = {
      enabled: prefs.personalizationEnabled,
      personality: prefs.personality,
      customInstructions: prefs.customInstructions,
      nickname: prefs.nickname,
      occupation: prefs.occupation,
      about: prefs.about,
    };

    const route = "/api/chat";
    const idemKey = newIdempotencyKey();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-lang": lang,
      "x-idempotency-key": idemKey,
    };

    const reqBody = locationToken
      ? {
          query: content,
          locationToken,
          research,
          lang,
          activeThreadId: currentId,
          threadId: currentId,
          mode: modeChoice,
          personalization,
          include: includeFlags,
          idemKey,
        }
      : {
          text: content,
          lang,
          activeThreadId: currentId,
          threadId: currentId,
          mode: modeChoice,
          researchOn: research,
          personalization,
          include: includeFlags,
          idemKey,
        };

    const snapshot: AssistantRetrySnapshot = {
      route,
      req: reqBody,
      headers,
      prompt: content,
      research,
      mode: modeChoice,
    };

    try {
      const res = await retryFetch(
        route,
        {
          method: "POST",
          headers,
          body: JSON.stringify(reqBody),
        },
        { retries: 2 },
      );
      const data = await res.json();
      const resultsList = Array.isArray(data.results) ? data.results : [];
      setResults(resultsList);
      const replyText =
        typeof data.text === "string"
          ? data.text
          : typeof data.reply === "string"
          ? data.reply
          : "";

      markPendingAssistantStreaming(pendingId);
      if (replyText) {
        enqueuePendingAssistant(pendingId, replyText);
      }
      finishPendingAssistant(pendingId, replyText);
      counted = true;
    } catch (error) {
      console.error(error);
      const normalized = normalizeNetworkError(error);
      markPendingAssistantStreaming(pendingId);
      finishPendingAssistant(pendingId, "", { error: normalized.userMessage, retrySnapshot: snapshot });
      setResults([]);
    } finally {
      if (counted) {
        prefs.incUsage();
      }
    }
  };

  const retryTurn = useCallback(
    async (message: ChatMessage) => {
      if (!message.retrySnapshot) return;
      const snapshot = message.retrySnapshot;
      removeMessage(message.id);
      setPendingMessage({ id: message.id, content: "" });
      beginPendingAssistant(message.id, {
        mode: snapshot.mode ?? modeChoice,
        research: snapshot.research,
        text: snapshot.prompt,
      });
      let counted = false;
      try {
        const res = await retryFetch(
          snapshot.route,
          {
            method: "POST",
            headers: snapshot.headers,
            body: JSON.stringify(snapshot.req),
          },
          { retries: 2 },
        );
        const data = await res.json();
        const resultsList = Array.isArray(data.results) ? data.results : [];
        setResults(resultsList);
        const replyText =
          typeof data.text === "string"
            ? data.text
            : typeof data.reply === "string"
            ? data.reply
            : "";
        markPendingAssistantStreaming(message.id);
        if (replyText) {
          enqueuePendingAssistant(message.id, replyText);
        }
        finishPendingAssistant(message.id, replyText);
        counted = true;
      } catch (error) {
        console.error(error);
        const normalized = normalizeNetworkError(error);
        markPendingAssistantStreaming(message.id);
        finishPendingAssistant(message.id, "", { error: normalized.userMessage, retrySnapshot: snapshot });
        setResults([]);
      } finally {
        if (counted) {
          prefs.incUsage();
        }
      }
    },
    [
      beginPendingAssistant,
      enqueuePendingAssistant,
      finishPendingAssistant,
      markPendingAssistantStreaming,
      modeChoice,
      prefs,
      removeMessage,
      setPendingMessage,
      setResults,
    ],
  );

  return (
    <div className="flex h-full flex-col" dir={prefs.dir}>
      <div
        ref={chatRef}
        className={`flex-1 pt-4 md:px-0 md:pt-0 ${
          hasScrollableContent
            ? "overflow-y-auto mobile-chat-scroll"
            : "overflow-hidden mobile-chat-scroll-empty"
        } md:pb-0 md:overflow-y-auto`}
      >
        <div className="px-4">
          {showWelcomeCard ? (
            <div className="py-10">
              <WelcomeCard />
            </div>
          ) : null}
          {messages.map(m => {
            if (m.role === "assistant" && m.error && m.retrySnapshot) {
              return (
                <div key={m.id} className="my-2 flex justify-start">
                  <ChatErrorBubble
                    compact={m.retrySnapshot.compact}
                    onRetry={() => retryTurn(m)}
                  />
                </div>
              );
            }
            return (
              <div key={m.id} className="space-y-2">
                <MessageRow m={m} />
              </div>
            );
          })}
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
        <ChatInput onSend={handleSend} canSend={prefs.canSend} />
      </div>
      <ScrollToBottom targetRef={chatRef} rebindKey={currentId} />
    </div>
  );
}

export default ChatWindow;

