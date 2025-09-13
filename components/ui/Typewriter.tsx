"use client";
import { useEffect, useState } from "react";

type Props = {
  text: string;
  /** characters per second (default ~40 cps feels natural) */
  cps?: number;
  /** start immediately or wait for prop to flip true */
  active?: boolean;
  /** optional: onDone callback */
  onDone?: () => void;
  /** show a blinking caret at the end */
  caret?: boolean;
};

export default function Typewriter({ text, cps = 40, active = true, onDone, caret = true }: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (i >= text.length) {
      onDone?.();
      return;
    }
    const delay = 1000 / Math.max(1, cps);
    const id = window.setTimeout(() => setI(prev => Math.min(text.length, prev + 1)), delay);
    return () => window.clearTimeout(id);
  }, [active, cps, i, text.length, onDone]);

  return (
    <span className="whitespace-pre-wrap">
      {text.slice(0, i)}
      {caret && i < text.length ? <span className="ml-[1px] inline-block w-[1px] animate-caret bg-current align-[-0.1em]" /> : null}
    </span>
  );
}

