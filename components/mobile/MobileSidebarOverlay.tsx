"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type TouchEvent as ReactTouchEvent } from "react";
import Sidebar from "@/components/Sidebar";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";

export default function MobileSidebarOverlay() {
  const open = useMobileUiStore(state => state.sidebarOpen);
  const close = useMobileUiStore(state => state.closeSidebar);
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null);

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

  if (!open) return null;

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    swipeOrigin.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!swipeOrigin.current) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeOrigin.current.x;
    const deltaY = touch.clientY - swipeOrigin.current.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -80) {
      swipeOrigin.current = null;
      close();
    }
  };

  const handleTouchEnd = () => {
    swipeOrigin.current = null;
  };

  return (
    <div
      className="mobile-sidebar-overlay md:hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <button
        type="button"
        className="mobile-sidebar-backdrop"
        aria-label="Close menu"
        onClick={close}
      />
      <div className="mobile-sidebar-panel" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div className="mobile-sidebar-header">
          <button
            type="button"
            className="mobile-icon-btn"
            aria-label="Close menu"
            onClick={close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mobile-sidebar-content">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
