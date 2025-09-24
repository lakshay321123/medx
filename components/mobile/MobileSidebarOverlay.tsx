"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";

export default function MobileSidebarOverlay() {
  const open = useMobileUiStore(state => state.sidebarOpen);
  const close = useMobileUiStore(state => state.closeSidebar);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  return (
    <div className="mobile-sidebar-overlay md:hidden">
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
