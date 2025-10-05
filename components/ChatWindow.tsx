"use client";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useChatStore, type ChatMessage } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import type { ComposerMeta } from "@/types/chat";
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
import ChatErrorBubble from "@/components/chat/ChatErrorBubble";
import { newIdempotencyKey } from "@/lib/net/idempotency";
import { retryFetch } from "@/lib/net/retry";
import { normalizeNetworkError } from "@/lib/net/errors";
import { pollJob } from "@/lib/net/pollJob";

const CHAT_UX_V2_ENABLED = process.env.NEXT_PUBLIC_CHAT_UX_V2 !== "0";
const JOB_STORAGE_KEY = "lastJob";

type ApiRoute = "/api/chat" | "/api/therapy" | "/api/ai-doc";

function storeJobSafe(meta: {
  route: ApiRoute;
  jobId: string;
  threadId: string | null;
  messageId?: string;
}) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const serialized = JSON.stringify(meta);
    if (serialized.length <= 50_000) {
      window.sessionStorage.setItem(JOB_STORAGE_KEY, serialized);
    }
  } catch {
    // ignore storage errors
  }
}

type AssistantRequestSnapshot = {
  route: ApiRoute;
  url: string;
  req: Record<string, unknown>;
  headers: Record<string, string>;
  meta: {
    mode: AppMode;
    research: boolean;
    text: string;
  };
};

function isAppMode(value: unknown): value is AppMode {
  return (
    value === "wellness" || value === "therapy" || value === "clinical" || value === "aidoc"
  );
}

function inferModeFromRequest(route: ApiRoute, req: Record<string, unknown>): AppMode {
  const raw = req["mode"];
  if (isAppMode(raw)) {
    return raw;
  }

  switch (route) {
    case "/api/therapy":
      return "therapy";
    case "/api/ai-doc":
      return "aidoc";
    default:
      return "wellness";
  }
}

function inferResearchFlag(req: Record<string, unknown>): boolean {
  if (typeof req["researchOn"] === "boolean") {
    return req["researchOn"] as boolean;
  }
  if (typeof req["research"] === "boolean") {
    return req["research"] as boolean;
  }
  return false;
}

function MessageRow({ m }: { m: ChatMessage }) {
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
  const removeMessage = useChatStore(s => s.removeMessage);
  const currentId = useChatStore(s => s.currentId);
  const [results, setResults] = useState<any[]>([]);
  const prefs = usePrefs();
  const chatRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [pendingMessage, setPendingMessage] = useState<{
    id: string;
    content: string;
    snapshot: AssistantRequestSnapshot | null;
  } | null>(null);
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
    (messageId: string, finalContent: string) => {
      setPendingMessage(prev => (prev && prev.id === messageId ? { ...prev, content: finalContent } : prev));
      addMessage({ id: messageId, role: "assistant", content: finalContent });
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
    cancel: cancelPendingAssistant,
  } = usePendingAssistantStages({
    enabled: CHAT_UX_V2_ENABLED,
    onContentUpdate: handlePendingContentUpdate,
    onFinalize: handlePendingFinalize,
  });

  const resumePendingJob = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.sessionStorage.getItem(JOB_STORAGE_KEY);
    if (!raw) {
      return;
    }

    let payload: {
      route: ApiRoute;
      jobId: string;
      threadId: string | null;
      messageId?: string;
    } | null = null;

    try {
      payload = JSON.parse(raw);
    } catch {
      window.sessionStorage.removeItem(JOB_STORAGE_KEY);
      return;
    }

    if (!payload || typeof payload.jobId !== "string" || typeof payload.route !== "string") {
      window.sessionStorage.removeItem(JOB_STORAGE_KEY);
      return;
    }

    if (payload.threadId && currentId && payload.threadId !== currentId) {
      return;
    }

    const snapshot = pendingMessage?.snapshot ?? null;
    const messageId = payload.messageId ?? pendingMessage?.id ?? null;

    if (!snapshot || !messageId) {
      window.sessionStorage.removeItem(JOB_STORAGE_KEY);
      return;
    }

    if (!pendingMessage || pendingMessage.id !== messageId) {
      setPendingMessage({ id: messageId, content: pendingMessage?.content ?? "", snapshot });
      if (!pendingAssistantState || pendingAssistantState.id !== messageId) {
        beginPendingAssistant(messageId, snapshot.meta);
      }
    }

    try {
      const text = await pollJob(payload.route, payload.jobId);
      setResults([]);
      markPendingAssistantStreaming(messageId);
      if (text) {
        enqueuePendingAssistant(messageId, text);
      }
      finishPendingAssistant(messageId, text);
    } catch (error) {
      console.error(error);
      normalizeNetworkError(error);
      cancelPendingAssistant(messageId);
      setPendingMessage(null);
      setResults([]);
      addMessage({
        id: messageId,
        role: "assistant",
        content: "",
        error: true,
        route: snapshot.route,
        req: snapshot.req,
        headers: snapshot.headers,
        retryMeta: snapshot.meta,
      });
    } finally {
      window.sessionStorage.removeItem(JOB_STORAGE_KEY);
    }
  }, [
    addMessage,
    beginPendingAssistant,
    cancelPendingAssistant,
    currentId,
    enqueuePendingAssistant,
    finishPendingAssistant,
    markPendingAssistantStreaming,
    pendingAssistantState,
    pendingMessage,
    setPendingMessage,
    setResults,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void resumePendingJob();
      }
    };

    void resumePendingJob();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [resumePendingJob]);

  const runAssistantRequest = useCallback(
    async (messageId: string, snapshot: AssistantRequestSnapshot, threadId: string | null) => {
      try {
        const response = await retryFetch(
          snapshot.url,
          {
            method: "POST",
            headers: snapshot.headers,
            body: JSON.stringify(snapshot.req),
          },
          { retries: 2 },
        );

        let data: any;
        try {
          data = await response.json();
        } catch {
          throw new Error("Network error");
        }

        if (!response.ok && !data?.pending) {
          throw new Error("Network error");
        }

        const jobId = typeof data?.jobId === "string" ? data.jobId : null;

        if (jobId) {
          storeJobSafe({ route: snapshot.route, jobId, threadId, messageId });
        }

        let replyText = "";
        let results: any[] = Array.isArray(data?.results) ? data.results : [];

        if (data?.pending && jobId) {
          const resolvedText = await pollJob(snapshot.route, jobId);
          replyText = typeof resolvedText === "string" ? resolvedText : "";
          results = [];
        } else {
          replyText =
            typeof data?.text === "string"
              ? data.text
              : typeof data?.reply === "string"
              ? data.reply
              : "";
        }

        return { replyText, results } as const;
      } finally {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(JOB_STORAGE_KEY);
        }
      }
    },
    [],
  );

  const handleSend = async (
    content: string,
    locationToken?: string,
    langOverride?: string,
    meta: ComposerMeta = null,
  ) => {
    if (!prefs.canSend()) {
      gotoAccount();
      return;
    }

    const lang = langOverride ?? prefs.lang;
    const researchFromUrl = getResearchFlagFromUrl();
    const metaLabel = meta?.label ?? null;
    const qs = new URLSearchParams();

    if (metaLabel === "study") {
      qs.set("research", "1");
      qs.set("format", "essay");
    }

    if (metaLabel === "thinking") {
      qs.set("thinking", "balanced");
    }

    const baseRoute: ApiRoute = "/api/chat";
    const queryString = qs.toString();
    const requestUrl = `${baseRoute}${queryString ? `?${queryString}` : ""}`;
    const researchOverride = metaLabel === "study";
    const effectiveResearch = researchOverride || researchFromUrl;

    const snapshotState = useChatStore.getState();
    const draftTitleFromStore = snapshotState.currentId
      ? snapshotState.threads[snapshotState.currentId]?.title
      : undefined;
    const computedTitle =
      draftTitleFromStore && draftTitleFromStore.trim().length > 0
        ? draftTitleFromStore
        : content.split(/\s+/).slice(0, 6).join(" ") || "New chat";

    await persistIfTemp({ title: computedTitle });
    const persistedThreadId = useChatStore.getState().currentId;
    const effectiveThreadId = persistedThreadId ?? currentId;
    const pendingId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `pending-${Date.now()}`;

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

    const idem = newIdempotencyKey();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-lang": lang,
      "x-idempotency-key": idem,
    };

    const baseBody = locationToken
      ? {
          query: content,
          locationToken,
          research: effectiveResearch,
          lang,
          activeThreadId: effectiveThreadId,
          threadId: effectiveThreadId,
          mode: modeChoice,
          personalization,
          include: includeFlags,
        }
      : {
          text: content,
          lang,
          activeThreadId: effectiveThreadId,
          threadId: effectiveThreadId,
          mode: modeChoice,
          researchOn: effectiveResearch,
          personalization,
          include: includeFlags,
        };

    const req = { ...baseBody, idemKey: idem } as Record<string, unknown>;

    if (metaLabel === "study") {
      req.formatDefault = "essay";
      req.format = "essay";
    }
    if (metaLabel === "thinking") {
      req.thinkingProfile = "balanced";
    }

    const snapshot: AssistantRequestSnapshot = {
      route: baseRoute,
      url: requestUrl,
      req,
      headers,
      meta: {
        mode: modeChoice,
        research: effectiveResearch,
        text: content,
      },
    };

    setPendingMessage({ id: pendingId, content: "", snapshot });
    beginPendingAssistant(pendingId, snapshot.meta);

    let counted = false;
    try {
      const { replyText, results: nextResults } = await runAssistantRequest(
        pendingId,
        snapshot,
        effectiveThreadId,
      );
      setResults(nextResults);
      markPendingAssistantStreaming(pendingId);
      if (replyText) {
        enqueuePendingAssistant(pendingId, replyText);
      }
      finishPendingAssistant(pendingId, replyText);
      counted = true;
    } catch (error) {
      console.error(error);
      normalizeNetworkError(error);
      cancelPendingAssistant(pendingId);
      setPendingMessage(null);
      setResults([]);
      addMessage({
        id: pendingId,
        role: "assistant",
        content: "",
        error: true,
        route: snapshot.route,
        url: snapshot.url,
        req: snapshot.req,
        headers: snapshot.headers,
        retryMeta: snapshot.meta,
      });
    } finally {
      if (counted) {
        prefs.incUsage();
      }
    }
  };

  const retryTurn = useCallback(
    async (message: ChatMessage) => {
      if (!message.route || !message.req || !message.headers) {
        return;
      }

      const reqData = message.req as Record<string, unknown>;
      const route = message.route as ApiRoute;
      const requestUrl = typeof message.url === "string" ? message.url : route;
      let originalText = "";
      if (typeof reqData.text === "string") {
        originalText = reqData.text;
      } else if (typeof reqData.query === "string") {
        originalText = reqData.query;
      }

      const storedMeta = message.retryMeta ?? {
        mode: inferModeFromRequest(route, reqData),
        research: inferResearchFlag(reqData),
        text: originalText,
      };

      const snapshot: AssistantRequestSnapshot = {
        route,
        url: requestUrl,
        req: reqData,
        headers: message.headers as Record<string, string>,
        meta: storedMeta,
      };

      removeMessage(message.id);
      setPendingMessage({ id: message.id, content: "", snapshot });
      beginPendingAssistant(message.id, snapshot.meta);

      try {
        const { replyText, results: nextResults } = await runAssistantRequest(
          message.id,
          snapshot,
          currentId,
        );
        setResults(nextResults);
        markPendingAssistantStreaming(message.id);
        if (replyText) {
          enqueuePendingAssistant(message.id, replyText);
        }
        finishPendingAssistant(message.id, replyText);
        prefs.incUsage();
      } catch (error) {
        console.error(error);
        normalizeNetworkError(error);
        cancelPendingAssistant(message.id);
        setPendingMessage(null);
        setResults([]);
        addMessage({
          id: message.id,
          role: "assistant",
          content: "",
          error: true,
          route: snapshot.route,
          url: snapshot.url,
          req: snapshot.req,
          headers: snapshot.headers,
          retryMeta: snapshot.meta,
        });
      }
    },
    [
      addMessage,
      beginPendingAssistant,
      cancelPendingAssistant,
      currentId,
      enqueuePendingAssistant,
      markPendingAssistantStreaming,
      prefs.incUsage,
      removeMessage,
      finishPendingAssistant,
      runAssistantRequest,
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
            if (m.role === "assistant" && m.error) {
              return (
                <div key={m.id} className="my-2 flex justify-start">
                  <ChatErrorBubble onRetry={() => retryTurn(m)} />
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

