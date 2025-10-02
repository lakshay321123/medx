"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Menu, MoreHorizontal } from "lucide-react";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useRouter, useSearchParams } from "next/navigation";
import { createNewThreadId } from "@/lib/chatThreads";
import { useModeController } from "@/hooks/useModeController";
import WwwGlobeIcon from "@/components/icons/WwwGlobe";
import { IconNewChat } from "@/components/icons";

export default function MobileHeader() {
  const openSidebar = useMobileUiStore(state => state.openSidebar);
  const openSheet = useMobileUiStore(state => state.openSheet);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    state,
    therapyBusy,
    selectMode,
    toggleResearch,
    researchEnabled,
  } = useModeController();

  const [modeOpen, setModeOpen] = useState(false);
  const modeRef = useRef<HTMLDivElement | null>(null);

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
    if (state.therapy) return "Therapy";
    if (state.base === "aidoc") return "AI Doc";
    if (state.base === "doctor") return "Clinical";
    return "Wellness";
  }, [state.base, state.therapy]);

  useEffect(() => {
    if (!modeOpen) return;

    const handlePointer = (event: MouseEvent | TouchEvent) => {
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

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer, { passive: true });
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [modeOpen]);

  useEffect(() => {
    setModeOpen(false);
  }, [state.base, state.therapy, state.research]);

  type HeaderModeChoice = "wellness" | "therapy" | "doctor" | "aidoc";

  const modeOptions = useMemo(
    () =>
      [
        {
          key: "wellness" as HeaderModeChoice,
          label: "Wellness",
          active: state.base === "patient" && !state.therapy,
          disabled: false,
        },
        {
          key: "therapy" as HeaderModeChoice,
          label: "Therapy",
          active: state.therapy,
          disabled: therapyBusy && !state.therapy,
        },
        {
          key: "doctor" as HeaderModeChoice,
          label: "Clinical",
          active: state.base === "doctor" && !state.therapy,
          disabled: false,
        },
        {
          key: "aidoc" as HeaderModeChoice,
          label: "AI Doc",
          active: state.base === "aidoc",
          disabled: false,
        },
      ] satisfies Array<{
        key: HeaderModeChoice;
        label: string;
        active: boolean;
        disabled: boolean;
      }>,
    [state.base, state.therapy, therapyBusy],
  );

  return (
    <header className="mobile-header md:hidden">
      <div className="mobile-header-left">
        <button
          type="button"
          aria-label="Open menu"
          className="mobile-icon-btn"
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div ref={modeRef} className="mobile-mode-controls">
          <button
            type="button"
            className="mobile-mode-trigger"
            aria-haspopup="menu"
            aria-expanded={modeOpen}
            onClick={() => setModeOpen(open => !open)}
          >
            <span className="mobile-mode-label">{modeLabel}</span>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mobile-icon-btn mobile-www-btn"
            aria-label={state.research ? "Disable research mode" : "Enable research mode"}
            aria-pressed={state.research}
            data-state={state.research ? "on" : "off"}
            data-enabled={researchEnabled}
            onClick={() => {
              if (!researchEnabled) return;
              toggleResearch();
            }}
            disabled={!researchEnabled}
          >
            <WwwGlobeIcon className="h-5 w-5" />
          </button>
          {modeOpen ? (
            <div className="mobile-mode-dropdown" role="menu">
              {modeOptions.map(option => (
                <button
                  key={option.key}
                  type="button"
                  className={[
                    "mobile-mode-option",
                    option.active ? "mobile-mode-option-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    selectMode(option.key);
                    setModeOpen(false);
                  }}
                  disabled={option.disabled}
                  role="menuitemradio"
                  aria-checked={option.active}
                >
                  <span>{option.label}</span>
                  <span className="flex items-center gap-2">
                    {option.key === "therapy" && therapyBusy && !state.therapy ? (
                      <span className="inline-flex h-3 w-3 items-center" aria-hidden="true">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      </span>
                    ) : null}
                    {option.active ? <Check className="h-4 w-4" /> : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mobile-header-actions">
        <button
          type="button"
          aria-label="New chat"
          className="mobile-icon-btn"
          onClick={handleNewChat}
        >
          <IconNewChat
            className="h-5 w-5"
            size={20}
            weight={2}
            activeWeight={2}
            style={{ opacity: 1, transition: "opacity .15s ease, stroke-width .15s ease" }}
          />
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
