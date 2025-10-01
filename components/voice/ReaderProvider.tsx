"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { chunkText, hasSpeech, loadVoices, preferVoiceForLang } from "@/lib/tts";

type ReaderStatus = "idle" | "loading" | "speaking" | "paused";

type ReaderCtx = {
  status: ReaderStatus;
  lang: string;
  speed: number;
  reason?: string;
  canUse: boolean;
  setSpeed: (value: number) => void;
  read: (opts: { text: string; lang?: string }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

const noop = () => {};

export const ReaderContext = createContext<ReaderCtx>({
  status: "idle",
  lang: "en",
  speed: 1,
  canUse: false,
  setSpeed: noop,
  read: async () => {},
  pause: noop,
  resume: noop,
  stop: noop,
});

type ProviderProps = {
  children: React.ReactNode;
  appLang?: string;
};

const SPEED_KEY = "medx:tts:speed";
const MIN_SPEED = 0.6;
const MAX_SPEED = 1.8;

export function ReaderProvider({ children, appLang }: ProviderProps) {
  const pathname = usePathname();
  const [status, setStatus] = useState<ReaderStatus>("idle");
  const [speed, setSpeedState] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const stored = window.localStorage.getItem(SPEED_KEY);
      if (!stored) return 1;
      const parsed = parseFloat(stored);
      if (Number.isNaN(parsed)) return 1;
      return Math.min(MAX_SPEED, Math.max(MIN_SPEED, parsed));
    } catch {
      return 1;
    }
  });
  const [reason, setReason] = useState<string | undefined>(undefined);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<SpeechSynthesisUtterance[]>([]);

  const enabledFlag = process.env.NEXT_PUBLIC_TTS_ENABLED;
  const canUse =
    typeof window !== "undefined" &&
    hasSpeech() &&
    (enabledFlag === undefined || enabledFlag?.toLowerCase() !== "false");

  const lang = appLang || (typeof window !== "undefined" ? ((window as any).__APP_LANG__ as string | undefined) : undefined) || "en";

  const stop = useCallback(() => {
    if (!canUse) return;
    try {
      synthRef.current?.cancel();
    } catch {
      // ignore cancellation errors
    }
    queueRef.current = [];
    setStatus("idle");
  }, [canUse]);

  const pause = useCallback(() => {
    if (!canUse) return;
    try {
      synthRef.current?.pause();
      setStatus("paused");
    } catch {
      // ignore pause errors
    }
  }, [canUse]);

  const resume = useCallback(() => {
    if (!canUse) return;
    try {
      synthRef.current?.resume();
      setStatus("speaking");
    } catch {
      // ignore resume errors
    }
  }, [canUse]);

  const setSpeed = useCallback((value: number) => {
    const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
    setSpeedState(clamped);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SPEED_KEY, String(clamped));
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const read = useCallback(
    async ({ text, lang: overrideLang }: { text: string; lang?: string }) => {
      if (!canUse) return;
      const trimmed = text?.trim();
      if (!trimmed) return;

      stop();
      setStatus("loading");

      const voices = await loadVoices();
      const pick = preferVoiceForLang(voices, overrideLang || lang);
      voiceRef.current = pick.voice;
      setReason(pick.reason);

      const chunks = chunkText(trimmed, 1800);
      if (!chunks.length) {
        setStatus("idle");
        return;
      }

      queueRef.current = chunks.map(chunk => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.rate = speed;
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.onstart = () => {
          setStatus("speaking");
        };
        utterance.onend = () => {
          queueRef.current.shift();
          if (queueRef.current.length === 0) {
            setStatus("idle");
          }
        };
        utterance.onerror = () => {
          queueRef.current = [];
          setStatus("idle");
        };
        return utterance;
      });

      setStatus("speaking");
      const synth = synthRef.current;
      if (!synth) {
        setStatus("idle");
        return;
      }

      setTimeout(() => {
        queueRef.current.forEach(utterance => {
          try {
            synth.speak(utterance);
          } catch {
            setStatus("idle");
          }
        });
      }, 0);
    },
    [canUse, stop, speed, lang],
  );

  useEffect(() => {
    if (!canUse) return;
    synthRef.current = window.speechSynthesis;
    let mounted = true;

    (async () => {
      setStatus(prev => (prev === "idle" ? "loading" : prev));
      const voices = await loadVoices();
      if (!mounted) return;
      const pick = preferVoiceForLang(voices, lang);
      voiceRef.current = pick.voice;
      setReason(pick.reason);
      setStatus("idle");
    })();

    return () => {
      mounted = false;
      try {
        synthRef.current?.cancel();
      } catch {
        // ignore cancellation errors
      }
      queueRef.current = [];
    };
  }, [lang, canUse]);

  useEffect(() => {
    queueRef.current.forEach(utterance => {
      utterance.rate = speed;
    });
  }, [speed]);

  useEffect(() => {
    if (!pathname) return;
    stop();
  }, [pathname, stop]);

  const value = useMemo<ReaderCtx>(
    () => ({ status, lang, speed, reason, canUse, setSpeed, read, pause, resume, stop }),
    [status, lang, speed, reason, canUse, setSpeed, read, pause, resume, stop],
  );

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}
