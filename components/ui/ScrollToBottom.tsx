"use client";
import { useEffect, useState, type RefObject } from "react";

type Props = {
  /** Ref to the scrollable chat container (div) */
  targetRef: RefObject<HTMLElement>;
  /** Show threshold (px from bottom) before button appears */
  threshold?: number;
  /** optional key to force rebind on thread change */
  rebindKey?: string | number;
};

export default function ScrollToBottom({ targetRef, threshold = 120, rebindKey }: Props) {
  const [show, setShow] = useState(false);
  const [boundEl, setBoundEl] = useState<HTMLElement | null>(null);

  // Bind to the ref element when it becomes available or when rebindKey changes
  useEffect(() => {
    if (targetRef?.current && targetRef.current !== boundEl) {
      setBoundEl(targetRef.current);
    }
    let raf: number | null = null;
    if (!targetRef?.current) {
      const tick = () => {
        if (targetRef?.current) setBoundEl(targetRef.current);
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [targetRef, rebindKey, boundEl]);

  // Listen for scroll to determine when to show the button
  useEffect(() => {
    const el = boundEl ?? document.documentElement;
    const listener = () => {
      const scrollTop = el.scrollTop || document.documentElement.scrollTop || document.body.scrollTop;
      const height = el.scrollHeight || document.documentElement.scrollHeight;
      const client = el.clientHeight || window.innerHeight;
      const distanceFromBottom = height - (scrollTop + client);
      setShow(distanceFromBottom > threshold);
    };
    listener();
    const on: any = boundEl ?? window;
    on.addEventListener("scroll", listener, { passive: true });
    return () => on.removeEventListener("scroll", listener as any);
  }, [boundEl, threshold]);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => {
        (boundEl ?? window).scrollTo({ top: (boundEl?.scrollHeight ?? document.documentElement.scrollHeight), behavior: "smooth" });
      }}
      className="fixed bottom-5 right-5 z-50 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg transition active:scale-95 dark:bg-blue-100 dark:text-blue-900"
      aria-label="Scroll to bottom"
    >
      ↓ New messages
    </button>
  );
}

