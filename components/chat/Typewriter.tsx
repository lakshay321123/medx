import { useEffect, useRef, useState } from "react";

const DEFAULT_SPEED = Number(process.env.NEXT_PUBLIC_TYPEWRITER_SPEED) || 130;

type Props = {
  text: string;
  speed?: number; // chars per second
  onDone?: () => void;
  fast?: boolean;
};

export default function Typewriter({ text, speed = DEFAULT_SPEED, onDone, fast }: Props) {
  const [idx, setIdx] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (fast || reduceMotion || text.length < 120) {
      setIdx(text.length);
      onDone?.();
      return;
    }
    const charsPerMs = speed / 1000;
    const step = (ts: number) => {
      if (start.current == null) start.current = ts;
      const next = Math.min(text.length, Math.floor((ts - start.current) * charsPerMs));
      if (next !== idx) setIdx(next);
      if (next < text.length) raf.current = requestAnimationFrame(step);
      else onDone?.();
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [text, speed, fast, reduceMotion, idx, onDone]);

  return <span>{text.slice(0, idx)}</span>;
}

