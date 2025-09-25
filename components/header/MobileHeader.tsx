"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type TouchEvent,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Menu,
  Globe2,
  PlusCircle,
  MoreVertical,
  Check,
  ChevronRight,
  ChevronDown,
  Search,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Logo from "@/components/brand/Logo";
import { useModeController } from "@/hooks/useModeController";
import { useTheme } from "next-themes";
import { useCountry } from "@/lib/country";
import { COUNTRIES } from "@/data/countries";

const DRAWER_WIDTH = 320;
const SHEET_HEIGHT = 460;
const TRANSITION_DURATION = 260;

const MODES = [
  { key: "wellness", label: "Wellness" },
  { key: "therapy", label: "Therapy" },
  { key: "clinical", label: "Clinical" },
  { key: "aidoc", label: "AI Doc" },
] as const;

type ModeKey = typeof MODES[number]["key"];

const modeFromState = (state: ReturnType<typeof useModeController>["state"]): ModeKey => {
  if (state.base === "aidoc") return "aidoc";
  if (state.base === "doctor") return "clinical";
  if (state.therapy) return "therapy";
  return "wellness";
};

const modeLabel = (mode: ModeKey) =>
  MODES.find(m => m.key === mode)?.label ?? "Wellness";

export default function MobileHeader() {
  const { state, apply, therapyBusy, isAidoc } = useModeController();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const { country, setCountry } = useCountry();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_WIDTH);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [drawerDrag, setDrawerDrag] = useState(0);
  const [sheetDrag, setSheetDrag] = useState(0);
  const drawerTouch = useRef<number | null>(null);
  const sheetTouch = useRef<number | null>(null);
  const drawerHideTimer = useRef<number | null>(null);
  const sheetHideTimer = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetScrollRef = useRef<HTMLDivElement | null>(null);
  const modeSectionRef = useRef<HTMLDivElement | null>(null);
  const [sheetHeight, setSheetHeight] = useState(SHEET_HEIGHT);
  const [sheetSection, setSheetSection] = useState<"root" | "mode">("root");

  const runNextFrame = useCallback((cb: () => void) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(cb);
    } else {
      cb();
    }
  }, []);

  const currentMode = useMemo(() => modeFromState(state), [state]);
  const modeName = useMemo(() => modeLabel(currentMode), [currentMode]);

  useEffect(() => {
    setDrawerOpen(false);
    setSheetOpen(false);
    setDrawerDrag(0);
    setSheetDrag(0);
    setDrawerVisible(false);
    setSheetVisible(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!sheetOpen) {
      setCountryOpen(false);
      setCountryQuery("");
      setSheetDrag(0);
      setSheetSection("root");
    }
  }, [sheetOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateWidth = () => {
      setDrawerWidth(Math.min(window.innerWidth, DRAWER_WIDTH));
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!sheetVisible) return;
    const node = sheetRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSheetHeight(Math.max(rect.height, SHEET_HEIGHT));
    };

    measure();

    if (typeof window !== "undefined" && "ResizeObserver" in window) {
      const observer = new ResizeObserver(() => {
        measure();
      });
      observer.observe(node);
      return () => {
        observer.disconnect();
      };
    }

    return undefined;
  }, [sheetVisible]);

  useEffect(() => {
    if (!sheetOpen || sheetSection !== "mode") return;
    const scroller = sheetScrollRef.current;
    const target = modeSectionRef.current;
    if (!scroller || !target) return;
    const offset = target.offsetTop - scroller.offsetTop;
    if (typeof scroller.scrollTo === "function") {
      scroller.scrollTo({ top: offset, behavior: "smooth" });
    } else {
      scroller.scrollTop = offset;
    }
  }, [sheetOpen, sheetSection]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code3.toLowerCase().includes(q),
    );
  }, [countryQuery]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerDrag(0);
    if (drawerHideTimer.current) {
      window.clearTimeout(drawerHideTimer.current);
      drawerHideTimer.current = null;
    }
    drawerHideTimer.current = window.setTimeout(() => {
      setDrawerVisible(false);
      drawerHideTimer.current = null;
    }, TRANSITION_DURATION);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetDrag(0);
    if (sheetHideTimer.current) {
      window.clearTimeout(sheetHideTimer.current);
      sheetHideTimer.current = null;
    }
    sheetHideTimer.current = window.setTimeout(() => {
      setSheetVisible(false);
      sheetHideTimer.current = null;
    }, TRANSITION_DURATION);
  }, []);

  const openDrawer = useCallback(() => {
    if (drawerHideTimer.current) {
      window.clearTimeout(drawerHideTimer.current);
      drawerHideTimer.current = null;
    }
    setDrawerDrag(0);
    setDrawerVisible(true);
    runNextFrame(() => {
      setDrawerOpen(true);
    });
  }, [runNextFrame]);

  const openSheet = useCallback(
    (section: "root" | "mode") => {
      if (sheetHideTimer.current) {
        window.clearTimeout(sheetHideTimer.current);
        sheetHideTimer.current = null;
      }
      setSheetSection(section);
      setSheetDrag(0);
      setSheetVisible(true);
      runNextFrame(() => {
        setSheetOpen(true);
      });
    },
    [runNextFrame],
  );

  useEffect(() => () => {
    if (drawerHideTimer.current) {
      window.clearTimeout(drawerHideTimer.current);
      drawerHideTimer.current = null;
    }
    if (sheetHideTimer.current) {
      window.clearTimeout(sheetHideTimer.current);
      sheetHideTimer.current = null;
    }
  }, []);

  const handleDrawerTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    drawerTouch.current = event.touches[0]?.clientX ?? null;
  };

  const handleDrawerTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (drawerTouch.current === null) return;
    const delta = event.touches[0]?.clientX ?? 0;
    const diff = delta - drawerTouch.current;
    if (diff < 0) {
      setDrawerDrag(Math.max(diff, -drawerWidth));
    } else {
      setDrawerDrag(0);
    }
  };

  const handleDrawerTouchEnd = () => {
    if (Math.abs(drawerDrag) > drawerWidth * 0.4) {
      closeDrawer();
    } else {
      setDrawerDrag(0);
    }
    drawerTouch.current = null;
  };

  const handleSheetTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    sheetTouch.current = event.touches[0]?.clientY ?? null;
  };

  const handleSheetTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (sheetTouch.current === null) return;
    const delta = event.touches[0]?.clientY ?? 0;
    const diff = delta - sheetTouch.current;
    const limit = Math.max(sheetHeight, SHEET_HEIGHT);
    if (diff > 0) {
      setSheetDrag(Math.min(diff, limit));
    } else {
      setSheetDrag(0);
    }
  };

  const handleSheetTouchEnd = () => {
    const limit = Math.max(sheetHeight, SHEET_HEIGHT);
    if (sheetDrag > limit * 0.35) {
      closeSheet();
    } else {
      setSheetDrag(0);
    }
    sheetTouch.current = null;
  };

  const researchEnabled =
    (state.base === "patient" && !state.therapy) || state.base === "doctor";

  const toggleResearch = () => {
    if (!researchEnabled) return;
    apply({ type: "toggle/research" });
  };

  const handleModeSelect = (target: ModeKey) => {
    switch (target) {
      case "wellness":
        if (state.base !== "patient" || state.therapy) {
          apply({ type: "toggle/patient" });
        }
        break;
      case "therapy":
        if (!state.therapy) {
          apply({ type: "toggle/therapy" });
        }
        break;
      case "clinical":
        if (state.base !== "doctor") {
          apply({ type: "toggle/doctor" });
        }
        break;
      case "aidoc":
        if (state.base !== "aidoc") {
          apply({ type: "toggle/aidoc" });
        }
        break;
    }
    closeSheet();
  };

  const handleNewChat = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("panel", "chat");
    params.delete("threadId");
    params.delete("context");
    router.push(`/?${params.toString()}`);
    if (drawerVisible || drawerOpen) {
      closeDrawer();
    }
    if (sheetVisible || sheetOpen) {
      closeSheet();
    }
    window.dispatchEvent(new CustomEvent("focus-chat-input"));
  };

  const handleSettings = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("panel", "settings");
    router.push(`/?${params.toString()}`);
    closeSheet();
    closeDrawer();
  };

  const themeName = (resolvedTheme ?? "light") as "light" | "dark";

  const toggleTheme = () => {
    setTheme(themeName === "dark" ? "light" : "dark");
  };

  const sheetThemeLabel = themeName === "dark" ? "Light mode" : "Dark mode";

  useEffect(() => {
    if (drawerVisible || sheetVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerVisible, sheetVisible]);

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-3 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={openDrawer}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Logo width={128} height={32} className="text-white [&>img]:h-8 [&>img]:w-auto" />
          <button
            type="button"
            onClick={() => openSheet("mode")}
            className="inline-flex min-w-0 items-center gap-1 rounded-full border border-transparent px-2 py-1 text-sm font-semibold text-slate-900 transition hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-100 dark:hover:bg-slate-900/60"
            aria-haspopup="menu"
            aria-expanded={sheetOpen && sheetSection === "mode"}
          >
            <span className="truncate">{modeName}</span>
            <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-300" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleResearch}
          disabled={!researchEnabled}
          aria-pressed={researchEnabled && state.research}
          className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 text-slate-700 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-white/10 dark:text-slate-100 ${
            researchEnabled
              ? state.research
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-white/80 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900"
              : "bg-slate-200/60 text-slate-400 opacity-70 dark:bg-slate-800/40 dark:text-slate-500"
          }`}
          aria-label={
            researchEnabled
              ? state.research
                ? "Disable research"
                : "Enable research"
              : "Research unavailable"
          }
        >
          <Globe2 className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={handleNewChat}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/90 text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
          aria-label="Start new chat"
        >
          <PlusCircle className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => openSheet("root")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/90 text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
          aria-label="More options"
          aria-expanded={sheetOpen}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {drawerVisible ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-out ${
              drawerOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeDrawer}
          />
          <div
            className="absolute inset-y-0 left-0 flex max-w-full transition-transform duration-300 ease-out"
            style={{
              width: drawerWidth,
              transform: `translateX(${drawerDrag + (drawerOpen ? 0 : -drawerWidth)}px)`,
            }}
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
          >
            <div
              className="flex w-full flex-col overflow-hidden rounded-r-3xl border border-black/10 bg-white/95 shadow-xl ring-1 ring-black/10 dark:border-white/10 dark:bg-slate-950/90 dark:ring-white/10"
            >
              <div
                className="flex-1 overflow-y-auto"
                style={{
                  paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
                  paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
                }}
              >
                <Sidebar onNavigate={closeDrawer} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {sheetVisible ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-out ${
              sheetOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeSheet}
          />
          <div
            ref={sheetRef}
            className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl border-t border-black/10 bg-white/95 shadow-2xl transition-transform duration-300 ease-out dark:border-white/10 dark:bg-slate-950/95"
            style={{
              transform: `translateY(${sheetOpen ? sheetDrag : Math.max(sheetHeight, SHEET_HEIGHT) + 40}px)`,
            }}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-black/10 dark:bg-white/20" aria-hidden="true" />
            <div
              ref={sheetScrollRef}
              className="max-h-[75vh] overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom,24px))] pt-4 text-slate-800 dark:text-slate-100"
            >
              <section ref={modeSectionRef} className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mode</div>
                <div className="mt-3 space-y-2">
                  {MODES.map(option => {
                    const active = option.key === currentMode;
                    const disabled =
                      (option.key === "therapy" && (isAidoc || therapyBusy)) ||
                      (option.key === "aidoc" && therapyBusy);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleModeSelect(option.key)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                          active
                            ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-100"
                            : "border-black/10 bg-white/80 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-900"
                        } ${disabled ? "opacity-60" : ""}`}
                        aria-pressed={active}
                      >
                        <span>{option.label}</span>
                        {active ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Appearance
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="mt-3 flex w-full items-center justify-between rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  {sheetThemeLabel}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </section>

              <section className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Country
                </div>
                <button
                  type="button"
                  onClick={() => setCountryOpen(v => !v)}
                  className="mt-3 flex w-full items-center justify-between rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-900"
                  aria-expanded={countryOpen}
                >
                  <span className="inline-flex items-center gap-2">
                    <Globe2 className="h-4 w-4" />
                    <span className="tabular-nums">{country.code3}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${countryOpen ? "rotate-180" : ""}`} />
                </button>

                {countryOpen ? (
                  <div className="mt-3 rounded-2xl border border-black/10 bg-white/90 p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
                    <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-slate-900/60">
                      <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <input
                        value={countryQuery}
                        onChange={event => setCountryQuery(event.target.value)}
                        placeholder="Search country or code…"
                        className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
                      {filteredCountries.map(option => (
                        <button
                          key={option.code3}
                          type="button"
                          onClick={() => {
                            setCountry(option.code3);
                            setCountryOpen(false);
                            setCountryQuery("");
                            closeSheet();
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-900 ${
                            option.code3 === country.code3 ? "bg-slate-100/80 dark:bg-slate-900/60" : ""
                          }`}
                        >
                          <span className="text-lg" aria-hidden="true">
                            {option.flag}
                          </span>
                          <span className="flex-1 truncate text-sm">{option.name}</span>
                          <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                            {option.code3}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section>
                <button
                  type="button"
                  onClick={handleSettings}
                  className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Settings
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
