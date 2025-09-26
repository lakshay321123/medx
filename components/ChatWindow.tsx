"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";
import ScrollToBottom from "@/components/ui/ScrollToBottom";
import { getResearchFlagFromUrl } from "@/utils/researchFlag";
import ChatMarkdown from "@/components/ChatMarkdown";
import { LinkBadge } from "@/components/SafeLink";
import ThinkingDots from "@/components/ui/ThinkingDots";
import { buildAnalyzingSequence } from "@/lib/ui/queryParser";
import { createTypewriter, type TypewriterController } from "@/lib/ui/typewriter";

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
  const [isThinking, setIsThinking] = useState(false);
  const [pendingAssistant, setPendingAssistant] = useState<{ id: string; content: string } | null>(null);
  const [pendingThinking, setPendingThinking] = useState<{
    id: string;
    steps: string[];
    index: number;
    showDots: boolean;
    showAnalyzing: boolean;
  } | null>(null);
  const typewriterRef = useRef<TypewriterController | null>(null);
  const hasScrollableContent = messages.length > 0 || results.length > 0 || !!pendingAssistant;

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
    if (!pendingThinking || !pendingThinking.showAnalyzing) return;
    if (pendingThinking.steps.length <= 1) return;
    const { id, index, steps } = pendingThinking;
    if (index >= steps.length - 1) return;
    const timeout = window.setTimeout(() => {
      setPendingThinking(prev => {
        if (!prev || prev.id !== id || !prev.showAnalyzing) return prev;
        const nextIndex = Math.min(prev.index + 1, prev.steps.length - 1);
        if (nextIndex === prev.index) return prev;
        return { ...prev, index: nextIndex };
      });
    }, 500 + Math.random() * 500);
    return () => window.clearTimeout(timeout);
  }, [pendingThinking]);

  const handleSend = async (content: string, locationToken?: string) => {
    if (isThinking) return;
    await persistIfTemp();
    setIsThinking(true);

    const research = getResearchFlagFromUrl();
    const pendingId = `assistant_${Date.now()}`;
    const analyzingSteps = buildAnalyzingSequence(content, { mode: "wellness", research });
    setPendingAssistant({ id: pendingId, content: "" });
    setPendingThinking({
      id: pendingId,
      steps: analyzingSteps,
      index: 0,
      showDots: true,
      showAnalyzing: analyzingSteps.length > 0,
    });

    const ensureTypewriter = () => {
      if (!typewriterRef.current) {
        typewriterRef.current = createTypewriter(value => {
          setPendingAssistant(prev =>
            prev && prev.id === pendingId ? { ...prev, content: value } : prev,
          );
        });
      }
      return typewriterRef.current!;
    };

    const cleanup = () => {
      typewriterRef.current?.cancel();
      typewriterRef.current = null;
      setPendingAssistant(null);
      setPendingThinking(null);
      setIsThinking(false);
    };

    try {
      if (locationToken) {
        const controller = ensureTypewriter();
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: content, locationToken, research }),
        });
        const data = await res.json();
        setResults(data.results || []);
        const message = data.results ? "Here are some places nearby:" : "";
        if (message) {
          controller.enqueue(message);
          await controller.flush().catch(() => {});
        }
        setPendingThinking(prev => (prev && prev.id === pendingId ? null : prev));
        addMessage({ role: "assistant", content: message });
        cleanup();
        return;
      }

      setResults([]);

      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content });

      const response = await fetch("/api/chat/stream-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: research ? "clinical" : "wellness", messages: history }),
      });
      if (!response.ok || !response.body) {
        throw new Error(`Chat API error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const controller = ensureTypewriter();
      let acc = "";
      let sawFirstDelta = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.startsWith("data: "));
        for (const line of lines) {
          if (line.trim() === "data: [DONE]") continue;
          try {
            const payload = JSON.parse(line.replace(/^data:\s*/, ""));
            const delta = payload?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              if (!sawFirstDelta) {
                sawFirstDelta = true;
                setPendingThinking(prev => (prev && prev.id === pendingId ? null : prev));
              }
              controller.enqueue(delta);
            }
          } catch {}
        }
      }

      await controller.flush().catch(() => {});
      setPendingThinking(prev => (prev && prev.id === pendingId ? null : prev));
      addMessage({ role: "assistant", content: acc });
      cleanup();
    } catch (err: any) {
      const message = `⚠️ ${String(err?.message || err)}`;
      addMessage({ role: "assistant", content: message });
      cleanup();
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
          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              <MessageRow m={m} />
            </div>
          ))}
          {pendingAssistant ? (
            <div className="space-y-2">
              <div className="p-2 space-y-1">
                <div className="text-xs uppercase tracking-wide text-slate-500">assistant</div>
                {pendingAssistant.content ? (
                  <ChatMarkdown content={pendingAssistant.content} />
                ) : (
                  <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      {pendingThinking?.showDots ? <ThinkingDots /> : null}
                      <span>
                        {pendingThinking?.showAnalyzing
                          ? pendingThinking.steps[pendingThinking.index] ?? pendingThinking.steps[pendingThinking.steps.length - 1]
                          : "Analyzing…"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
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

