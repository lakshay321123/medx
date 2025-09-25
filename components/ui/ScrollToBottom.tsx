"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type Props = {
  /** Ref to the scrollable chat container (div) */
  targetRef?: RefObject<HTMLElement>;
  /** Optional container override */
  container?: HTMLElement | null;
  /** optional key to force rebind on thread change */
  rebindKey?: string | number;
  /** Unread messages count */
  unread?: number;
  /** Callback fired when user jumps to bottom */
  onJump?: () => void;
  /** Auto hide timeout — unused in new FAB but kept for API compatibility */
  autohideMs?: number;
  /** Distance from the bottom of the viewport */
  offsetBottom?: number;
};

export default function ScrollToBottom({
  targetRef,
  container: containerProp,
  rebindKey,
  unread = 0,
  onJump,
  autohideMs = 2500, // eslint-disable-line @typescript-eslint/no-unused-vars
  offsetBottom = 88,
}: Props) {
  const [container, setContainer] = useState<HTMLElement | null>(containerProp ?? targetRef?.current ?? null);
  const [showFab, setShowFab] = useState(false);

  const distanceFromBottom = useCallback((el: HTMLElement) => {
    return el.scrollHeight - (el.scrollTop + el.clientHeight);
  }, []);

  useEffect(() => {
    if (containerProp !== undefined) {
      setContainer(containerProp);
      return;
    }

    if (!targetRef) {
      setContainer(null);
      return;
    }

    if (targetRef.current) {
      setContainer(targetRef.current);
      return;
    }

    let raf: number | null = null;
    const tick = () => {
      if (targetRef.current) {
        setContainer(targetRef.current);
      } else {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [containerProp, targetRef, rebindKey]);

  useEffect(() => {
    if (!container) return;

    const el = container;
    const onScroll = () => {
      const distance = distanceFromBottom(el);
      const nearBottom = distance < 140;
      if (el.scrollTop > 220 && !nearBottom) {
        setShowFab(true);
      } else {
        setShowFab(false);
        if (nearBottom) {
          onJump?.();
        }
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [container, distanceFromBottom, onJump]);

  useEffect(() => {
    if (!container) return;
    const distance = distanceFromBottom(container);
    const nearBottom = distance < 140;
    if (unread > 0 && distance > 220 && !nearBottom) {
      setShowFab(true);
    }
  }, [unread, container, distanceFromBottom]);

  const scrollToBottom = () => {
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    onJump?.();
    setShowFab(false);
  };

  if (!container) return null;

  return (
    <div
      className={`pointer-events-none fixed left-1/2 z-[60] -translate-x-1/2 transition-all duration-200 ${showFab ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      style={{ bottom: offsetBottom }}
      aria-hidden={!showFab}
    >
      <button
        type="button"
        className="pointer-events-auto h-11 w-11 rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-500"
        aria-label="Jump to newest messages"
        onClick={scrollToBottom}
      >
        ↓
      </button>
    </div>
  );
}
