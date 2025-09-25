"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode, TouchEvent as ReactTouchEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Globe2, Moon, Search, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useCountry } from "@/lib/country";
import { COUNTRIES } from "@/data/countries";
import { fromSearchParams, toQuery } from "@/lib/modes/url";
import { canonicalize } from "@/lib/modes/modeMachine";
import type { ModeState } from "@/lib/modes/types";

const MODE_OPTIONS = [
  { key: "wellness", label: "Wellness" },
  { key: "wellness-research", label: "Wellness + Research" },
  { key: "doctor", label: "Doctor" },
  { key: "doctor-research", label: "Doctor + Research" },
  { key: "aidoc", label: "AI Doc" },
] as const;

type ModeKey = (typeof MODE_OPTIONS)[number]["key"];

function deriveModeLabel(state: ModeState): string {
  if (state.base === "aidoc") return "AI Doc";
  if (state.base === "doctor") {
    return state.research ? "Doctor + Research" : "Doctor";
  }
  if (state.research) return "Wellness + Research";
  return "Wellness";
}

function nextStateForMode(current: ModeState, mode: ModeKey): ModeState {
  const base: ModeState = { ...current };
  switch (mode) {
    case "wellness":
      return canonicalize({ ...base, base: "patient", therapy: false, research: false });
    case "wellness-research":
      return canonicalize({ ...base, base: "patient", therapy: false, research: true });
    case "doctor":
      return canonicalize({ ...base, base: "doctor", therapy: false, research: false });
    case "doctor-research":
      return canonicalize({ ...base, base: "doctor", therapy: false, research: true });
    case "aidoc":
      return canonicalize({ ...base, base: "aidoc", therapy: false, research: false });
    default:
      return base;
  }
}

export default function MobileActionsSheet() {
  const { sheetOpen, sheetView, closeSheet, setSheetView } = useMobileUiStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { country, setCountry } = useCountry();
  const [query, setQuery] = useState("");
  const titleId = useId();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const startScrollRef = useRef(0);
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const lastMoveRef = useRef<{ y: number; time: number } | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) {
      setQuery("");
      dragOffsetRef.current = 0;
      setDragOffset(0);
      setIsDragging(false);
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      return;
    }

    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      if (panelRef.current) {
        panelRef.current.style.transform = "translateY(0px)";
      }
    });
  }, [sheetOpen, sheetView]);

  const modeState = useMemo(() => {
    const currentTheme = (theme as "light" | "dark") ?? "light";
    return fromSearchParams(searchParams, currentTheme);
  }, [searchParams, theme]);

  const modeLabel = deriveModeLabel(modeState);

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code3.toLowerCase().includes(q),
    );
  }, [query]);

  if (!sheetOpen) return null;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const goToSettings = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("panel", "settings");
    router.push(`/?${params.toString()}`);
    closeSheet();
  };

  const buildHeader = (title: string, onBack?: () => void): JSX.Element => (
    <div className="mobile-sheet-header">
      {onBack ? (
        <button type="button" className="mobile-icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <span className="mobile-sheet-handle" aria-hidden="true" />
      )}
      <div className="mobile-sheet-title" id={titleId}>
        {title}
      </div>
      <button type="button" className="mobile-icon-btn" onClick={closeSheet} aria-label="Close sheet">
        <XIcon />
      </button>
    </div>
  );

  let header: JSX.Element;
  let body: ReactNode;

  switch (sheetView) {
    case "mode":
      header = buildHeader("Mode", () => setSheetView("main"));
      body = (
        <div className="mobile-sheet-section">
          {MODE_OPTIONS.map(option => {
            const next = nextStateForMode(modeState, option.key);
            const isActive = deriveModeLabel(modeState) === option.label;
            return (
              <button
                key={option.key}
                type="button"
                className="mobile-sheet-item"
                onClick={() => {
                  router.push(toQuery(next, searchParams));
                  closeSheet();
                }}
              >
                <div className="mobile-sheet-item-label">{option.label}</div>
                <div className="mobile-sheet-item-icon">{isActive ? <Check className="h-4 w-4" /> : null}</div>
              </button>
            );
          })}
        </div>
      );
      break;
    case "country":
      header = buildHeader("Country", () => setSheetView("main"));
      body = (
        <div className="mobile-sheet-section">
          <div className="mobile-sheet-search">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search country or code"
            />
          </div>
          <div className="mobile-sheet-list">
            {filteredCountries.map(c => (
              <button
                key={c.code3}
                type="button"
                className="mobile-sheet-item"
                onClick={() => {
                  setCountry(c.code3);
                  closeSheet();
                }}
              >
                <div className="mobile-sheet-country">
                  <span className="text-xl">{c.flag}</span>
                  <span className="truncate">{c.name}</span>
                </div>
                <div className="mobile-sheet-item-icon">
                  {country.code3 === c.code3 ? <Check className="h-4 w-4" /> : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
      break;
    default:
      header = buildHeader("Menu");
      body = (
        <div className="mobile-sheet-section">
          <button type="button" className="mobile-sheet-item" onClick={() => setSheetView("mode")}>
            <div className="mobile-sheet-item-label">Mode</div>
            <div className="mobile-sheet-item-value">{modeLabel}</div>
          </button>
          <button type="button" className="mobile-sheet-item" onClick={goToSettings}>
            <div className="mobile-sheet-item-label">Settings</div>
            <div className="mobile-sheet-item-icon">
              <Settings className="h-4 w-4" />
            </div>
          </button>
          <button
            type="button"
            className="mobile-sheet-item"
            onClick={() => {
              toggleTheme();
              closeSheet();
            }}
          >
            <div className="mobile-sheet-item-label">{theme === "dark" ? "Light Mode" : "Dark Mode"}</div>
            <div className="mobile-sheet-item-icon">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </div>
          </button>
          <button type="button" className="mobile-sheet-item" onClick={() => setSheetView("country")}>
            <div className="mobile-sheet-item-label">Country</div>
            <div className="mobile-sheet-item-value inline-flex items-center gap-2">
              <Globe2 className="h-4 w-4" />
              <span className="font-medium">{country.code3}</span>
            </div>
          </button>
        </div>
      );
  }

  const sheetLabel =
    sheetView === "mode"
      ? "Mode options"
      : sheetView === "country"
        ? "Country selector"
        : "Menu";

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    startYRef.current = touch?.clientY ?? null;
    startScrollRef.current = scrollRef.current?.scrollTop ?? 0;
    draggingRef.current = false;
    velocityRef.current = 0;
    lastMoveRef.current = { y: touch?.clientY ?? 0, time: event.timeStamp };
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (startYRef.current === null) return;
    const touch = event.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - startYRef.current;
    if (deltaY <= 0) {
      if (draggingRef.current) {
        draggingRef.current = false;
        dragOffsetRef.current = 0;
        setDragOffset(0);
        setIsDragging(false);
      }
      return;
    }

    const currentScroll = scrollRef.current?.scrollTop ?? 0;
    if (!draggingRef.current) {
      if (startScrollRef.current > 0 || currentScroll > 0 || deltaY < 24) {
        return;
      }
      draggingRef.current = true;
      setIsDragging(true);
    }

    const panelHeight = panelRef.current?.offsetHeight ?? 640;
    const offset = Math.min(deltaY, panelHeight);
    dragOffsetRef.current = offset;
    setDragOffset(offset);
    event.preventDefault();

    const last = lastMoveRef.current;
    if (last && event.timeStamp > last.time) {
      const dy = touch.clientY - last.y;
      const dt = event.timeStamp - last.time;
      velocityRef.current = (dy / dt) * 1000;
    }
    lastMoveRef.current = { y: touch.clientY, time: event.timeStamp };
  };

  const handleTouchEnd = () => {
    const panelHeight = panelRef.current?.offsetHeight ?? 640;
    const travelled = dragOffsetRef.current;
    const velocity = velocityRef.current;
    const shouldClose =
      draggingRef.current && (travelled > panelHeight * 0.5 || velocity > 850);

    draggingRef.current = false;
    startYRef.current = null;
    startScrollRef.current = 0;

    if (shouldClose) {
      const exitOffset = panelHeight;
      dragOffsetRef.current = exitOffset;
      setIsDragging(false);
      setDragOffset(exitOffset);
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      closeTimeoutRef.current = window.setTimeout(() => {
        closeSheet();
      }, 200);
      return;
    }

    if (dragOffsetRef.current !== 0) {
      dragOffsetRef.current = 0;
      setDragOffset(0);
    }
    setIsDragging(false);
  };

  return (
    <div className="mobile-sheet-root md:hidden">
      <div className="mobile-sheet-backdrop" aria-hidden="true" onClick={closeSheet} />
      <div
        ref={panelRef}
        className="mobile-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={sheetLabel}
        aria-labelledby={titleId}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ transform: `translateY(${dragOffset}px)`, transition: isDragging ? "none" : undefined }}
      >
        {header}
        <div ref={scrollRef} className="mobile-sheet-content">
          {body}
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M6 6l12 12M18 6l-12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
