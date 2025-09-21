"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  /** Auto hide timeout */
  autohideMs?: number;
};

export default function ScrollToBottom({
  targetRef,
  container: containerProp,
  rebindKey,
  unread = 0,
  onJump,
  autohideMs = 2500,
}: Props) {
  const [container, setContainer] = useState<HTMLElement | null>(containerProp ?? targetRef?.current ?? null);
  const [visible, setVisible] = useState(false);
  const lastScrollTop = useRef(0);
  const hideTimer = useRef<number | null>(null);

  const isNearBottom = useCallback((el: HTMLElement) => {
    return el.scrollHeight - (el.scrollTop + el.clientHeight) < 24;
  }, []);

  const show = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), autohideMs);
  }, [autohideMs]);

  useEffect(() => {
    if (containerProp !== undefined) {
      setContainer(containerProp);
      lastScrollTop.current = containerProp?.scrollTop ?? 0;
      return;
    }

    if (!targetRef) {
      setContainer(null);
      return;
    }

    if (targetRef.current) {
      setContainer(targetRef.current);
      lastScrollTop.current = targetRef.current.scrollTop;
      return;
    }

    let raf: number | null = null;
    const tick = () => {
      if (targetRef.current) {
        setContainer(targetRef.current);
        lastScrollTop.current = targetRef.current.scrollTop;
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
    return () => {
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!container) return;

    const el = container;
    const onScroll = () => {
      const curr = el.scrollTop;
      const goingUp = curr < lastScrollTop.current;
      lastScrollTop.current = curr;

      if (!isNearBottom(el)) {
        if (goingUp) show();
        else setVisible(true);
      } else {
        setVisible(false);
        if (hideTimer.current) {
          window.clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }
        onJump?.();
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [container, isNearBottom, onJump, show]);

  useEffect(() => {
    if (!container) return;
    if (unread > 0 && !isNearBottom(container)) show();
  }, [unread, container, isNearBottom, show]);

  const scrollToBottom = () => {
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    onJump?.();
    setVisible(false);
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  if (!container) return null;

  return (
    <div
      className={[
        "pointer-events-none fixed left-1/2 z-[60] -translate-x-1/2 transition-all",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      ].join(" ")}
      style={{ bottom: 96 }}
      aria-hidden={!visible}
    >
      <Button
        size="icon"
        className="pointer-events-auto h-9 w-9 rounded-full shadow-lg bg-primary text-primary-foreground hover:opacity-90"
        aria-label="Jump to newest messages"
        onClick={scrollToBottom}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
