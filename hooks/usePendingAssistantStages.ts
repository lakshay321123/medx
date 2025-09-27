import { useCallback, useEffect, useRef, useState } from "react";
import type { AppMode } from "@/lib/welcomeMessages";
import { loadAnalyzingPhrases } from "@/lib/ui/analyzingPhrases";
import { parsePendingIntent, type PendingIntent } from "@/lib/chat/pendingIntent";

export type PendingAssistantStage = "thinking" | "reflecting" | "analyzing" | "streaming";

export type PendingAssistantState = {
  id: string;
  stage: PendingAssistantStage;
  analyzingPhrase: string | null;
  thinkingLabel: string | null;
};

export type PendingAssistantExtras = {
  followUps?: unknown;
  citations?: unknown;
  error?: string | null;
};

type TypewriterState = {
  messageId: string | null;
  queue: string;
  displayed: string;
  raf: number | null;
  streaming: boolean;
  lastTimestamp: number;
  onDrain: (() => void) | null;
};

type Options = {
  enabled: boolean;
  onContentUpdate: (messageId: string, next: string) => void;
  onFinalize: (messageId: string, finalContent: string, extras?: PendingAssistantExtras) => void;
};

type BeginConfig = {
  mode: AppMode;
  research: boolean;
  text: string;
};

type PendingMeta = PendingIntent & { messageId: string };

const ANALYZING_DELAY_MS = 900;
const ANALYZING_ROTATE_MS = 800;
const ANALYZING_MAX_PHRASES = 2;
const TYPEWRITER_SPEED = 50;
const TYPEWRITER_MIN_BATCH = 4;
const TYPEWRITER_MAX_BATCH = 8;
const THINKING_LABEL = "Working…";
const THERAPY_LABEL = "Reflecting…";

export function usePendingAssistantStages({ enabled, onContentUpdate, onFinalize }: Options) {
  const [state, setState] = useState<PendingAssistantState | null>(null);
  const stateRef = useRef<PendingAssistantState | null>(null);
  type TimerHandle = ReturnType<typeof setTimeout> | number;

  const analyzeStartRef = useRef<TimerHandle | null>(null);
  const analyzeRotateRef = useRef<TimerHandle | null>(null);
  const analyzingQueueRef = useRef<string[]>([]);
  const pendingMetaRef = useRef<PendingMeta | null>(null);
  const typewriterRef = useRef<TypewriterState>({
    messageId: null,
    queue: "",
    displayed: "",
    raf: null,
    streaming: false,
    lastTimestamp: 0,
    onDrain: null,
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearAnalyzingTimers = useCallback(() => {
    if (analyzeStartRef.current) {
      clearTimeout(analyzeStartRef.current);
      analyzeStartRef.current = null;
    }
    if (analyzeRotateRef.current) {
      clearTimeout(analyzeRotateRef.current);
      analyzeRotateRef.current = null;
    }
    analyzingQueueRef.current = [];
  }, []);

  const cancelTypewriter = useCallback((messageId?: string) => {
    const tw = typewriterRef.current;
    if (typeof window !== "undefined" && tw.raf != null) {
      window.cancelAnimationFrame(tw.raf);
    }
    if (!messageId || tw.messageId === messageId) {
      typewriterRef.current = {
        messageId: null,
        queue: "",
        displayed: "",
        raf: null,
        streaming: false,
        lastTimestamp: 0,
        onDrain: null,
      };
    }
  }, []);

  const runTypewriter = useCallback(
    (timestamp: number) => {
      const tw = typewriterRef.current;
      if (!enabled || !tw.messageId) {
        tw.raf = null;
        return;
      }
      if (tw.queue.length === 0) {
        tw.lastTimestamp = 0;
        tw.raf = null;
        if (!tw.streaming && tw.onDrain) {
          const finalize = tw.onDrain;
          tw.onDrain = null;
          finalize();
        }
        return;
      }
      if (tw.lastTimestamp === 0) tw.lastTimestamp = timestamp;
      const elapsed = timestamp - tw.lastTimestamp;
      let count = Math.floor((elapsed / 1000) * TYPEWRITER_SPEED);
      if (count < TYPEWRITER_MIN_BATCH) {
        count = tw.queue.length < TYPEWRITER_MIN_BATCH ? tw.queue.length : TYPEWRITER_MIN_BATCH;
      }
      count = Math.min(count, TYPEWRITER_MAX_BATCH, tw.queue.length);
      if (count <= 0) {
        tw.raf = window.requestAnimationFrame(runTypewriter);
        return;
      }
      const chunk = tw.queue.slice(0, count);
      tw.queue = tw.queue.slice(count);
      tw.displayed += chunk;
      tw.lastTimestamp = timestamp;
      onContentUpdate(tw.messageId, tw.displayed);
      if (tw.queue.length > 0) {
        tw.raf = window.requestAnimationFrame(runTypewriter);
      } else {
        tw.lastTimestamp = 0;
        tw.raf = null;
        if (!tw.streaming && tw.onDrain) {
          const finalize = tw.onDrain;
          tw.onDrain = null;
          finalize();
        }
      }
    },
    [enabled, onContentUpdate],
  );

  const scheduleNextAnalyzing = useCallback(
    (messageId: string) => {
      if (!enabled || typeof window === "undefined") return;
      if (analyzingQueueRef.current.length === 0) return;
      if (analyzeRotateRef.current) {
        clearTimeout(analyzeRotateRef.current);
      }
      analyzeRotateRef.current = window.setTimeout(() => {
        if (!stateRef.current || stateRef.current.id !== messageId || stateRef.current.stage !== "analyzing") {
          return;
        }
        const nextPhrase = analyzingQueueRef.current.shift();
        if (!nextPhrase) {
          return;
        }
        setState(prev => {
          if (!prev || prev.id !== messageId) return prev;
          return { ...prev, analyzingPhrase: nextPhrase };
        });
        if (analyzingQueueRef.current.length > 0) {
          scheduleNextAnalyzing(messageId);
        }
      }, ANALYZING_ROTATE_MS);
    },
    [enabled],
  );

  const begin = useCallback(
    (messageId: string, config: BeginConfig) => {
      if (!enabled) return;
      clearAnalyzingTimers();
      cancelTypewriter();
      pendingMetaRef.current = null;
      typewriterRef.current = {
        messageId,
        queue: "",
        displayed: "",
        raf: null,
        streaming: false,
        lastTimestamp: 0,
        onDrain: null,
      };

      const pendingIntent = parsePendingIntent(config);
      pendingMetaRef.current = { ...pendingIntent, messageId };

      const stage: PendingAssistantStage = pendingIntent.isTherapy ? "reflecting" : "thinking";
      const label = pendingIntent.isTherapy ? THERAPY_LABEL : THINKING_LABEL;

      setState({ id: messageId, stage, analyzingPhrase: null, thinkingLabel: label });

      if (pendingIntent.isTherapy || typeof window === "undefined") {
        return;
      }

      analyzeStartRef.current = window.setTimeout(() => {
        void (async () => {
          try {
            const meta = pendingMetaRef.current;
            if (!meta || meta.messageId !== messageId) return;
            if (!stateRef.current || stateRef.current.id !== messageId || stateRef.current.stage !== "thinking") return;
            const selection = await loadAnalyzingPhrases(meta.modeKey, {
              keywords: meta.topicKeywords,
              primaryKeyword: meta.primaryKeyword,
              intentBucket: meta.intentBucket,
              max: ANALYZING_MAX_PHRASES,
              requireTopicOverlap: true,
              researchRequested: meta.needsResearch,
            });
            if (!selection.phrases.length) {
              return;
            }
            analyzingQueueRef.current = selection.phrases.slice(1);
            if (selection.finalizer) {
              analyzingQueueRef.current.push(selection.finalizer);
            }
            setState({ id: messageId, stage: "analyzing", analyzingPhrase: selection.phrases[0] ?? null, thinkingLabel: label });
            if (analyzingQueueRef.current.length > 0) {
              scheduleNextAnalyzing(messageId);
            }
          } catch {
            /* no-op */
          }
        })();
      }, ANALYZING_DELAY_MS);
    },
    [enabled, cancelTypewriter, clearAnalyzingTimers, scheduleNextAnalyzing],
  );

  const markStreaming = useCallback(
    (messageId: string) => {
      if (!enabled) return;
      clearAnalyzingTimers();
      analyzingQueueRef.current = [];
      pendingMetaRef.current = null;
      const tw = typewriterRef.current;
      if (!tw.messageId || tw.messageId !== messageId) {
        cancelTypewriter();
        typewriterRef.current = {
          messageId,
          queue: "",
          displayed: "",
          raf: null,
          streaming: true,
          lastTimestamp: 0,
          onDrain: null,
        };
      } else {
        tw.streaming = true;
        tw.lastTimestamp = 0;
      }
      setState(prev => {
        if (!prev || prev.id !== messageId) return prev;
        return { id: messageId, stage: "streaming", analyzingPhrase: null, thinkingLabel: prev.thinkingLabel };
      });
    },
    [enabled, cancelTypewriter, clearAnalyzingTimers],
  );

  const enqueue = useCallback(
    (messageId: string, chunk: string) => {
      if (!enabled || !chunk) return;
      if (!chunk.trim() && chunk.length === 0) return;
      let tw = typewriterRef.current;
      if (!tw.messageId || tw.messageId !== messageId) {
        cancelTypewriter();
        tw = typewriterRef.current = {
          messageId,
          queue: "",
          displayed: "",
          raf: null,
          streaming: true,
          lastTimestamp: 0,
          onDrain: null,
        };
      }
      tw.queue += chunk;
      if (typeof window === "undefined") {
        tw.displayed += tw.queue;
        const full = tw.displayed;
        tw.queue = "";
        onContentUpdate(messageId, full);
        return;
      }
      if (tw.raf == null) {
        tw.raf = window.requestAnimationFrame(runTypewriter);
      }
    },
    [enabled, cancelTypewriter, onContentUpdate, runTypewriter],
  );

  const finish = useCallback(
    (messageId: string, finalContent: string, extras?: PendingAssistantExtras) => {
      if (!enabled) {
        setState(prev => (prev && prev.id === messageId ? null : prev));
        onFinalize(messageId, finalContent, extras);
        return;
      }
      clearAnalyzingTimers();
      pendingMetaRef.current = null;
      const finalize = () => {
        onFinalize(messageId, finalContent, extras);
        setState(prev => (prev && prev.id === messageId ? null : prev));
        cancelTypewriter(messageId);
      };
      const tw = typewriterRef.current;
      if (!tw.messageId || tw.messageId !== messageId) {
        finalize();
        return;
      }
      tw.streaming = false;
      tw.onDrain = finalize;
      if (tw.queue.length === 0) {
        finalize();
      } else if (typeof window !== "undefined") {
        if (tw.raf == null) {
          tw.raf = window.requestAnimationFrame(runTypewriter);
        }
      } else {
        finalize();
      }
    },
    [enabled, onFinalize, clearAnalyzingTimers, cancelTypewriter, runTypewriter],
  );

  const cancel = useCallback(
    (messageId: string) => {
      if (!enabled) return;
      clearAnalyzingTimers();
      pendingMetaRef.current = null;
      setState(prev => (prev && prev.id === messageId ? null : prev));
      cancelTypewriter(messageId);
    },
    [enabled, clearAnalyzingTimers, cancelTypewriter],
  );

  useEffect(
    () => () => {
      clearAnalyzingTimers();
      cancelTypewriter();
      pendingMetaRef.current = null;
    },
    [clearAnalyzingTimers, cancelTypewriter],
  );

  return {
    state,
    begin,
    markStreaming,
    enqueue,
    finish,
    cancel,
  } as const;
}
