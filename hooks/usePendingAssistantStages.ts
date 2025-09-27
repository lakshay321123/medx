import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyzingKey } from "@/lib/ui/analyzingPhrases";
import { loadAnalyzingPhrases } from "@/lib/ui/analyzingPhrases";

export type PendingAssistantStage = "thinking" | "analyzing" | "streaming";

export type PendingAssistantState = {
  id: string;
  stage: PendingAssistantStage;
  analyzingPhrase: string | null;
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

const ANALYZING_DELAY_MS = 900;
const ANALYZING_ROTATE_MS = 900;
const TYPEWRITER_SPEED = 52;
const TYPEWRITER_MIN_BATCH = 4;
const TYPEWRITER_MAX_BATCH = 8;

export function usePendingAssistantStages({
  enabled,
  onContentUpdate,
  onFinalize,
}: Options) {
  const [state, setState] = useState<PendingAssistantState | null>(null);
  const stateRef = useRef<PendingAssistantState | null>(null);
  const analyzeStartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyzeRotateRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const rotatePhrases = useCallback(
    (messageId: string, phrases: string[], index: number) => {
      if (!enabled || typeof window === "undefined") return;
      if (index >= phrases.length) return;
      analyzeRotateRef.current = window.setTimeout(() => {
        if (!stateRef.current || stateRef.current.id !== messageId || stateRef.current.stage !== "analyzing") {
          return;
        }
        const nextPhrase = phrases[index] ?? null;
        setState(prev => {
          if (!prev || prev.id !== messageId || prev.stage !== "analyzing") return prev;
          return { ...prev, analyzingPhrase: nextPhrase };
        });
        if (index + 1 < phrases.length) {
          rotatePhrases(messageId, phrases, index + 1);
        }
      }, ANALYZING_ROTATE_MS);
    },
    [enabled],
  );

  const begin = useCallback(
    (messageId: string, key: AnalyzingKey) => {
      if (!enabled) return;
      clearAnalyzingTimers();
      cancelTypewriter();
      typewriterRef.current = {
        messageId,
        queue: "",
        displayed: "",
        raf: null,
        streaming: false,
        lastTimestamp: 0,
        onDrain: null,
      };
      setState({ id: messageId, stage: "thinking", analyzingPhrase: null });
      if (typeof window === "undefined") return;
      analyzeStartRef.current = window.setTimeout(() => {
        void (async () => {
          try {
            const phrases = await loadAnalyzingPhrases(key);
            if (!phrases.length) return;
            if (!stateRef.current || stateRef.current.id !== messageId || stateRef.current.stage !== "thinking") return;
            setState({ id: messageId, stage: "analyzing", analyzingPhrase: phrases[0] ?? null });
            if (phrases.length > 1) rotatePhrases(messageId, phrases, 1);
          } catch {
            /* noop */
          }
        })();
      }, ANALYZING_DELAY_MS);
    },
    [enabled, cancelTypewriter, clearAnalyzingTimers, rotatePhrases],
  );

  const markStreaming = useCallback(
    (messageId: string) => {
      if (!enabled) return;
      clearAnalyzingTimers();
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
        return { id: messageId, stage: "streaming", analyzingPhrase: null };
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
      setState(prev => (prev && prev.id === messageId ? null : prev));
      cancelTypewriter(messageId);
    },
    [enabled, clearAnalyzingTimers, cancelTypewriter],
  );

  useEffect(() => () => {
    clearAnalyzingTimers();
    cancelTypewriter();
  }, [clearAnalyzingTimers, cancelTypewriter]);

  return {
    state,
    begin,
    markStreaming,
    enqueue,
    finish,
    cancel,
  } as const;
}
