"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Menu, MoreHorizontal, PlusCircle } from "lucide-react";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useModeController } from "@/hooks/useModeController";
import { createNewThreadId } from "@/lib/chatThreads";
import WwwGlobeIcon from "@/components/icons/WwwGlobe";

export default function MobileHeader() {
  const openSidebar = useMobileUiStore(state => state.openSidebar);
  const openSheet = useMobileUiStore(state => state.openSheet);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, selectMode, toggleResearch, researchEnabled, therapyBusy } = useModeController();
  const [modeOpen, setModeOpen] = useState(false);
  const modeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!modeOpen) return;
    const handlePointer = (event: Event) => {
      if (!modeRef.current) return;
      const target = event.target as Node | null;
      if (target && modeRef.current.contains(target)) return;
      setModeOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModeOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [modeOpen]);

  useEffect(() => {
    setModeOpen(false);
  }, [state.base, state.therapy]);

  const handleNewChat = useCallback(() => {
    const id = createNewThreadId();
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("panel", "chat");
    params.set("threadId", id);
    router.push(`/?${params.toString()}`);
    window.setTimeout(() => {
      window.dispatchEvent(new Event("focus-chat-input"));
    }, 150);
  }, [router, searchParams]);

  const modeLabel = useMemo(() => {
    if (state.base === "aidoc") return "AI Doc";
    if (state.therapy) return "Therapy";
    if (state.base === "doctor") return "Clinical";
    return "Wellness";
  }, [state.base, state.therapy]);

  const modeOptions = [
    { key: "wellness" as const, label: "Wellness" },
    { key: "therapy" as const, label: "Therapy", disabled: therapyBusy },
    { key: "doctor" as const, label: "Clinical" },
    { key: "aidoc" as const, label: "AI Doc" },
  ];

  const researchActive = researchEnabled && state.research;

  return (
    <header className="mobile-header md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        className="mobile-icon-btn"
        onClick={openSidebar}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="mobile-mode-controls" ref={modeRef}>
        <button
          type="button"
          aria-label="Select mode"
          className="mobile-mode-trigger"
          onClick={() => setModeOpen(prev => !prev)}
          aria-haspopup="menu"
          aria-expanded={modeOpen}
        >
          <span className="mobile-mode-label" aria-live="polite">{modeLabel}</span>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </button>
        <button
          type="button"
          aria-label={researchActive ? "Disable research mode" : "Enable research mode"}
          className="mobile-icon-btn mobile-www-btn"
          data-state={researchActive ? "on" : "off"}
          data-enabled={researchEnabled ? "true" : "false"}
          onClick={() => {
            if (researchEnabled) toggleResearch();
          }}
          disabled={!researchEnabled}
          aria-pressed={researchActive}
          title={
            researchEnabled
              ? researchActive
                ? "Research mode on"
                : "Research mode off"
              : "Research mode unavailable"
          }
        >
          <WwwGlobeIcon className="h-[21px] w-[21px]" />
        </button>
        {modeOpen ? (
          <div className="mobile-mode-dropdown" role="menu">
            {modeOptions.map(option => {
              const isActive = modeLabel === option.label;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  className={`mobile-mode-option${isActive ? " mobile-mode-option-active" : ""}`}
                  onClick={() => {
                    selectMode(option.key);
                    setModeOpen(false);
                  }}
                  disabled={option.disabled}
                >
                  <span>{option.label}</span>
                  {option.key === "therapy" && therapyBusy && !state.therapy ? (
                    <span className="inline-flex h-3 w-3 items-center justify-center" aria-hidden="true">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    </span>
                  ) : isActive ? (
                    <span aria-hidden="true">•</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mobile-header-actions">
        <button
          type="button"
          aria-label="New chat"
          className="mobile-icon-btn"
          onClick={handleNewChat}
        >
          <PlusCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Open options"
          className="mobile-icon-btn"
          onClick={() => openSheet("main")}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
