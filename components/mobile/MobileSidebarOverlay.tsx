"use client";

import { useEffect, useRef, type TouchEvent as ReactTouchEvent } from "react";

import { SidebarContent } from "@/components/Sidebar";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";

export default function MobileSidebarOverlay() {
  const open = useMobileUiStore(state => state.sidebarOpen);
  const close = useMobileUiStore(state => state.closeSidebar);
  const swipeOrigin = useRef<{ x: number; y: number; time: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const translateRef = useRef(0);
  const velocityRef = useRef(0);
  const lastMoveRef = useRef<{ x: number; time: number } | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          close();
        }
      };
      document.addEventListener("keydown", handleKey);
      return () => {
        document.body.style.overflow = prev;
        document.removeEventListener("keydown", handleKey);
      };
    }
    return undefined;
  }, [open, close]);

  useEffect(() => {
    if (!open && closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transform = "translateX(0px)";
    panel.style.transition = "transform 0.24s ease";
    const id = window.requestAnimationFrame(() => {
      if (panel) {
        panel.style.transition = "";
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    swipeOrigin.current = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
    lastMoveRef.current = { x: touch.clientX, time: event.timeStamp };
    velocityRef.current = 0;
    translateRef.current = 0;
    draggingRef.current = false;
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!swipeOrigin.current) return;
    const panel = panelRef.current;
    if (!panel) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeOrigin.current.x;
    const deltaY = touch.clientY - swipeOrigin.current.y;
    if (!draggingRef.current) {
      if (Math.abs(deltaX) < 24) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      if (deltaX >= 0) {
        swipeOrigin.current = null;
        return;
      }
      draggingRef.current = true;
      panel.style.transition = "none";
    }

    if (!draggingRef.current) return;

    event.preventDefault();
    const clamped = Math.max(deltaX, -panel.offsetWidth);
    translateRef.current = clamped;
    panel.style.transform = `translateX(${clamped}px)`;

    const last = lastMoveRef.current;
    if (last && event.timeStamp > last.time) {
      const dx = touch.clientX - last.x;
      const dt = event.timeStamp - last.time;
      velocityRef.current = (dx / dt) * 1000;
    }
    lastMoveRef.current = { x: touch.clientX, time: event.timeStamp };
  };

  const handleTouchEnd = () => {
    const panel = panelRef.current;
    if (!panel) {
      swipeOrigin.current = null;
      draggingRef.current = false;
      return;
    }

    const width = panel.offsetWidth || 1;
    const travelled = Math.abs(translateRef.current);
    const velocity = velocityRef.current;
    const shouldClose = travelled > width * 0.5 || velocity < -650;

    panel.style.transition = "transform 0.24s ease";

    if (shouldClose) {
      panel.style.transform = `translateX(-${width}px)`;
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      closeTimeoutRef.current = window.setTimeout(() => {
        close();
      }, 180);
    } else {
      panel.style.transform = "translateX(0px)";
    }

    swipeOrigin.current = null;
    draggingRef.current = false;
    translateRef.current = 0;
    velocityRef.current = 0;
    lastMoveRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex md:hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        ref={panelRef}
        className="relative h-full w-[88%] max-w-[320px] -translate-x-full overflow-y-auto bg-white dark:bg-slate-950 md:bg-transparent"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <SidebarContent />
      </div>
      <button
        type="button"
        className="flex-1 bg-black/30"
        aria-label="Close menu"
        onClick={close}
      />
    </div>
  );
}
