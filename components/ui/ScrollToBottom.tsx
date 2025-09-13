"use client";
import { useEffect, useState } from "react";

type Props = {
  /** The scrollable container; if not provided, uses window */
  target?: HTMLElement | null;
  /** Show threshold (px from bottom) before button appears */
  threshold?: number;
};

export default function ScrollToBottom({ target, threshold = 120 }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = target ?? document.documentElement;
    const listener = () => {
      const scrollTop = el.scrollTop || document.documentElement.scrollTop || document.body.scrollTop;
      const height = el.scrollHeight || document.documentElement.scrollHeight;
      const client = el.clientHeight || window.innerHeight;
      const distanceFromBottom = height - (scrollTop + client);
      setShow(distanceFromBottom > threshold);
    };
    listener();
    const on = target ?? window;
    on.addEventListener("scroll", listener, { passive: true });
    return () => on.removeEventListener("scroll", listener as any);
  }, [target, threshold]);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => {
        (target ?? window).scrollTo({ top: (target?.scrollHeight ?? document.documentElement.scrollHeight), behavior: "smooth" });
      }}
      className="fixed bottom-5 right-5 z-50 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg transition active:scale-95 dark:bg-neutral-100 dark:text-neutral-900"
      aria-label="Scroll to bottom"
    >
      ↓ New messages
    </button>
  );
}

