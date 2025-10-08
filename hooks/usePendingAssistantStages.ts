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
const THINKING_LABEL = "Analyzing";
const THERAPY_LABEL = "Reflecting…";

export function usePendingAssistantStages({ enabled, onContentUpdate, onFinalize }: Options) {
  const [state, setState] = useState<PendingAssistantState | null>(null);
  const stateRef = useRef<PendingAssistantState | null>(null);
  type TimerHandle = ReturnType<typeof setTimeout> | number;

  const analyzeStartRef = useRef<TimerHandle | null>(null);
  const analyzeRotateRef = useRef<TimerHandle | null>(null);
  const analyzingQueueRef = useRef<string[]>([]);
  const pendingMetaRef = useRef<PendingMeta | null>(null);
  const streamingContentRef = useRef<Map<string, string>>(new Map());

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
      pendingMetaRef.current = null;
      streamingContentRef.current.delete(messageId);

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
    [enabled, clearAnalyzingTimers, scheduleNextAnalyzing],
  );

  const markStreaming = useCallback(
    (messageId: string) => {
      if (!enabled) return;
      clearAnalyzingTimers();
      analyzingQueueRef.current = [];
      pendingMetaRef.current = null;
      streamingContentRef.current.set(messageId, streamingContentRef.current.get(messageId) ?? "");
      setState(prev => {
        if (!prev || prev.id !== messageId) return prev;
        return { id: messageId, stage: "streaming", analyzingPhrase: null, thinkingLabel: prev.thinkingLabel };
      });
    },
    [enabled, clearAnalyzingTimers],
  );

  const enqueue = useCallback(
    (messageId: string, chunk: string) => {
      if (!enabled || !chunk) return;
      const current = streamingContentRef.current.get(messageId) ?? "";
      const next = current + chunk;
      streamingContentRef.current.set(messageId, next);
      onContentUpdate(messageId, next);
    },
    [enabled, onContentUpdate],
  );

  const reset = useCallback(
    (messageId: string, text: string) => {
      if (!enabled) {
        onContentUpdate(messageId, text);
        return;
      }
      clearAnalyzingTimers();
      streamingContentRef.current.set(messageId, text);
      onContentUpdate(messageId, text);
    },
    [enabled, onContentUpdate, clearAnalyzingTimers],
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
      streamingContentRef.current.delete(messageId);
      onFinalize(messageId, finalContent, extras);
      setState(prev => (prev && prev.id === messageId ? null : prev));
    },
    [enabled, onFinalize, clearAnalyzingTimers],
  );

  const cancel = useCallback(
    (messageId: string) => {
      if (!enabled) return;
      clearAnalyzingTimers();
      pendingMetaRef.current = null;
      setState(prev => (prev && prev.id === messageId ? null : prev));
      streamingContentRef.current.delete(messageId);
    },
    [enabled, clearAnalyzingTimers],
  );

  useEffect(
    () => () => {
      clearAnalyzingTimers();
      streamingContentRef.current.clear();
      pendingMetaRef.current = null;
    },
    [clearAnalyzingTimers],
  );

  return {
    state,
    begin,
    markStreaming,
    enqueue,
    reset,
    finish,
    cancel,
  } as const;
}
