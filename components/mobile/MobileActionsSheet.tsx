"use client";

import { useEffect, useId, useMemo, useState } from "react";
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

type ModeKey = typeof MODE_OPTIONS[number]["key"];

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
    }
  }, [sheetOpen]);

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

  const renderHeader = (title: string, onBack?: () => void) => (
    <div className="mobile-sheet-header">
      {onBack ? (
        <button type="button" className="mobile-icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <span className="mobile-sheet-handle" aria-hidden="true" />
      )}
      <div className="mobile-sheet-title" id={titleId}>{title}</div>
      <button type="button" className="mobile-icon-btn" onClick={closeSheet} aria-label="Close sheet">
        <XIcon />
      </button>
    </div>
  );

  const sheetLabel = sheetView === "mode"
    ? "Mode options"
    : sheetView === "country"
      ? "Country selector"
      : "Menu";

  return (
    <div className="mobile-sheet-root md:hidden">
      <div className="mobile-sheet-backdrop" aria-hidden="true" onClick={closeSheet} />
      <div className="mobile-sheet-panel" role="dialog" aria-modal="true" aria-label={sheetLabel} aria-labelledby={titleId}>
        {sheetView === "main" ? (
          <>
            {renderHeader("Menu")}
            <div className="mobile-sheet-section">
              <button
                type="button"
                className="mobile-sheet-item"
                onClick={() => setSheetView("mode")}
              >
                <div className="mobile-sheet-item-label">Mode</div>
                <div className="mobile-sheet-item-value">{modeLabel}</div>
              </button>
              <button
                type="button"
                className="mobile-sheet-item"
                onClick={goToSettings}
              >
                <div className="mobile-sheet-item-label">Settings</div>
                <div className="mobile-sheet-item-icon"><Settings className="h-4 w-4" /></div>
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
              <button
                type="button"
                className="mobile-sheet-item"
                onClick={() => setSheetView("country")}
              >
                <div className="mobile-sheet-item-label">Country</div>
                <div className="mobile-sheet-item-value inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4" />
                  <span className="font-medium">{country.code3}</span>
                </div>
              </button>
            </div>
          </>
        ) : null}

        {sheetView === "mode" ? (
          <>
            {renderHeader("Mode", () => setSheetView("main"))}
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
                    <div className="mobile-sheet-item-icon">
                      {isActive ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {sheetView === "country" ? (
          <>
            {renderHeader("Country", () => setSheetView("main"))}
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
          </>
        ) : null}
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
