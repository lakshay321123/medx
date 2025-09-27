"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "@/lib/state/chatStore";
import { ChatInput } from "@/components/ChatInput";
import { persistIfTemp } from "@/lib/chat/persist";
import ScrollToBottom from "@/components/ui/ScrollToBottom";
import { getResearchFlagFromUrl } from "@/utils/researchFlag";
import ChatMarkdown from "@/components/ChatMarkdown";
import { LinkBadge } from "@/components/SafeLink";

type ThinkingPhase = 'idle' | 'sending' | 'analyzing' | 'streaming';

function AnalyzingSteps({ phrases, active }: { phrases: string[]; active: boolean }) {
  if (!active || phrases.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
      {phrases.map((phrase, idx) => (
        <li
          key={`${idx}-${phrase}`}
          className="opacity-0 animate-[analyzing-step_0.5s_ease-forwards]"
          style={{ animationDelay: `${idx * 0.24}s` }}
        >
          {phrase}
        </li>
      ))}
      <style jsx>{`
        @keyframes analyzing-step {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </ul>
  );
}
import ThinkingDots from "@/components/ui/ThinkingDots";
import { parseQuery } from "@/lib/ui/queryParser";
import {
  genericAnalyzing,
  pickAnalyzingPhrases,
  wellnessAnalyzing,
  wellnessResearchAnalyzing,
} from "@/lib/ui/analyzingLibrary";
import { createTypewriter, type TypewriterController } from "@/lib/ui/typewriter";

type ChatWindowMessage = { id: string; role: string; content: string };

function MessageRow({
  m,
  pending,
  thinkingPhase,
  phrases,
  showDots,
}: {
  m: ChatWindowMessage;
  pending?: boolean;
  thinkingPhase?: ThinkingPhase;
  phrases?: string[];
  showDots?: boolean;
}) {
  if (pending) {
    return (
      <div className="p-2 space-y-2 rounded-2xl bg-white/80 dark:bg-zinc-900/70">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
          <span>assistant</span>
          <ThinkingDots active={!!showDots && thinkingPhase !== 'streaming'} />
        </div>
        <ChatMarkdown content={m.content} />
        <AnalyzingSteps phrases={phrases ?? []} active={thinkingPhase === 'analyzing'} />
      </div>
    );
  }

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
  const [thinkingPhase, setThinkingPhase] = useState<ThinkingPhase>('idle');
  const [analyzingPhrases, setAnalyzingPhrases] = useState<string[]>([]);
  const [thinkingDotsVisible, setThinkingDotsVisible] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<{ id: string; content: string } | null>(null);
  const typewriterRef = useRef<TypewriterController | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasScrollableContent = messages.length > 0 || results.length > 0 || !!pendingResponse;
  const resetThinking = useCallback(() => {
    setThinkingPhase('idle');
    setAnalyzingPhrases([]);
    setThinkingDotsVisible(false);
  }, []);
  const visibleMessages = useMemo(() => {
    if (!pendingResponse) return messages;
    return [...messages, { ...pendingResponse, role: 'assistant', pending: true } as any];
  }, [messages, pendingResponse]);

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
    return () => {
      try { abortRef.current?.abort(); } catch {}
      typewriterRef.current?.stop();
      typewriterRef.current = null;
    };
  }, []);

  const handleSend = useCallback(async (content: string, locationToken?: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    await persistIfTemp();

    const research = getResearchFlagFromUrl();

    addMessage({ role: "user", content: trimmed });

    if (locationToken) {
      setThinkingPhase('sending');
      setThinkingDotsVisible(true);
      setAnalyzingPhrases([]);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, locationToken, research }),
        });
        const data = await res.json();
        setResults(data.results || []);
        addMessage({ role: "assistant", content: data.results ? "Here are some places nearby:" : "" });
      } finally {
        resetThinking();
      }
      return;
    }
    const pendingId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pending_${Date.now()}`;
    setPendingResponse({ id: pendingId, content: '' });
    setThinkingPhase('sending');
    setThinkingDotsVisible(true);
    setAnalyzingPhrases([]);

    const insights = parseQuery({ text: trimmed, mode: 'wellness', researchEnabled: research });
    const researchActive = Boolean(research) || insights.needsResearch;
    const library = researchActive ? wellnessResearchAnalyzing : wellnessAnalyzing;
    const phrases = pickAnalyzingPhrases(library.length ? library : genericAnalyzing);
    if (phrases.length > 0) {
      setThinkingPhase('analyzing');
      setAnalyzingPhrases(phrases);
    }
    const needsExtended = insights.complexity === 'complex' || insights.needsCalculators || researchActive;
    const maxTokens = needsExtended ? 1100 : 420;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    typewriterRef.current?.stop();
    const typewriter = createTypewriter(text => {
      setPendingResponse(prev => (prev ? { ...prev, content: text } : prev));
    });
    typewriter.reset('');
    typewriterRef.current = typewriter;

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    let streamStarted = false;
    const handleFirstToken = () => {
      if (streamStarted) return;
      streamStarted = true;
      setThinkingPhase('streaming');
      setThinkingDotsVisible(false);
      setAnalyzingPhrases([]);
    };

    let acc = '';

    try {
      const res = await fetch(`/api/chat/stream${research ? '?research=1' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'patient',
          messages: [...history, { role: 'user', content: trimmed }],
          max_tokens: maxTokens,
        }),
        signal: ctrl.signal,
      });
      if (res.status === 409) {
        resetThinking();
        setPendingResponse(null);
        typewriter.stop();
        typewriterRef.current = null;
        return;
      }
      if (!res.ok || !res.body) throw new Error(`Chat API error ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
          if (line.trim() === 'data: [DONE]') continue;
          try {
            const payload = JSON.parse(line.replace(/^data:\s*/, ''));
            const delta = payload?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              handleFirstToken();
              typewriter.enqueue(delta);
            }
          } catch {}
        }
      }
      typewriter.flush();
      setPendingResponse(null);
      addMessage({ id: pendingId, role: 'assistant', content: acc });
      resetThinking();
    } catch (error: any) {
      const message = `⚠️ ${String(error?.message || 'Request failed')}`;
      typewriter.stop();
      setPendingResponse(null);
      addMessage({ id: pendingId, role: 'assistant', content: message });
      resetThinking();
    } finally {
      abortRef.current = null;
      typewriter.stop();
      typewriterRef.current = null;
    }
  }, [addMessage, messages, resetThinking]);

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
          {visibleMessages.map((m: any) => {
            const isPending = Boolean((m as any).pending);
            const content = typeof m.content === 'string' ? m.content : '';
            return (
              <div key={m.id} className="space-y-2">
                <MessageRow
                  m={{ id: m.id, role: m.role, content }}
                  pending={isPending}
                  thinkingPhase={isPending ? thinkingPhase : 'idle'}
                  phrases={isPending ? analyzingPhrases : []}
                  showDots={isPending ? thinkingDotsVisible : false}
                />
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
      </div>
      <div ref={composerRef} className="mobile-composer md:static md:bg-transparent md:p-0 md:shadow-none">
        <ChatInput onSend={handleSend} />
      </div>
      <ScrollToBottom targetRef={chatRef} rebindKey={currentId} />
    </div>
  );
}

export default ChatWindow;

