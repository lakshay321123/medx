"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";
import AiDocPane from "@/components/panels/AiDocPane";
import { HeaderMobile } from "@/components/Header";
import { SidebarDrawer } from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import CountryGlobe from "@/components/CountryGlobe";
import FeatureDebug from "@/components/FeatureDebug";
import Sidebar from "@/components/Sidebar";
import { createNewThreadId } from "@/lib/chatThreads";

type Search = Record<string, string | string[] | undefined>;

export default function Page({ searchParams }: { searchParams: Search }) {
  const panelParam = searchParams.panel;
  const panelValue = Array.isArray(panelParam) ? panelParam[0] : panelParam;
  const panel = panelValue?.toLowerCase() || "chat";
  const chatInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overflowMenu, setOverflowMenu] = useState<{ top: number; right: number } | null>(null);
  const threadParam = searchParams.threadId;
  const threadId = Array.isArray(threadParam) ? threadParam[0] : threadParam;

  useEffect(() => {
    if (!sidebarOpen) return;
    if (typeof document === "undefined") return;
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [sidebarOpen]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [threadId, panel]);

  useEffect(() => {
    if (!overflowMenu) return;
    if (typeof document === "undefined") return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-overflow-menu]") && !target.closest("[data-overflow-trigger]")) {
        setOverflowMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [overflowMenu]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setOverflowMenu(null);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  const overflowActions = useMemo(
    () => ["Rename", "Duplicate", "Share", "Delete", "Settings", "Dark Mode", "Country"],
    [],
  );

  const handleStartNewChat = () => {
    const id = createNewThreadId();
    const params = new URLSearchParams();
    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (typeof value === "string") {
        params.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach(v => {
          if (typeof v === "string") params.append(key, v);
        });
      }
    });
    params.set("panel", "chat");
    params.set("threadId", id);
    router.push(`/?${params.toString()}`);
    setSidebarOpen(false);
    setOverflowMenu(null);
  };

  const openOverflow = (anchor: HTMLElement) => {
    try {
      const rect = anchor.getBoundingClientRect();
      const win = typeof window !== "undefined" ? window : undefined;
      setOverflowMenu({
        top: rect.bottom + 8,
        right: Math.max((win?.innerWidth ?? 0) - rect.right - 8, 12),
      });
    } catch (error) {
      console.error("Failed to open overflow menu", error);
    }
  };

  const renderPane = () => {
    switch (panel) {
      case "profile":
        return <MedicalProfile />;
      case "timeline":
        return <Timeline />;
      case "alerts":
        return <AlertsPane />;
      case "settings":
        return <SettingsPane />;
      case "ai-doc":
        return <AiDocPane />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-[#FFFFFF] text-[#0F172A] dark:bg-[#0B1220] dark:text-[#E6EDF7]">
      {panel === "chat" ? (
        <>
          <HeaderMobile
            onToggleSidebar={() => setSidebarOpen(true)}
            onStartNewChat={handleStartNewChat}
            onOpenOverflow={openOverflow}
          />

          {process.env.NODE_ENV === "development" ? <FeatureDebug /> : null}

          {overflowMenu && (
            <div
              data-overflow-menu
              className="fixed z-50 w-48 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/95 text-sm text-[#0F172A] shadow-2xl backdrop-blur dark:border-[#1E3A5F] dark:bg-[#0F1B2D]/95 dark:text-[#E6EDF7]"
              style={{ top: overflowMenu.top, right: overflowMenu.right }}
            >
              <ul className="divide-y divide-[#E2E8F0]/70 dark:divide-[#1E3A5F]/80">
                {overflowActions.map(action => (
                  <li key={action} className="px-3 py-2">
                    {action === "Dark Mode" ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">Dark mode</span>
                        <ThemeToggle className="h-8 px-3 text-xs" />
                      </div>
                    ) : action === "Country" ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">Country</span>
                        <CountryGlobe />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm font-medium transition hover:bg-[#E2E8F0]/60 dark:hover:bg-[#13233D]"
                        onClick={() => {
                          setOverflowMenu(null);
                          if (action === "Settings") {
                            router.push("/?panel=settings");
                          }
                        }}
                      >
                        <span>{action}</span>
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-[#334155] dark:text-[#94A3B8]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
            <Sidebar />
          </SidebarDrawer>

          <ResearchFiltersProvider>
            <ChatPane inputRef={chatInputRef} />
          </ResearchFiltersProvider>
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="m-6 rounded-2xl bg-white/80 p-6 ring-1 ring-black/5 dark:bg-slate-900/60 dark:ring-white/10">
            {renderPane()}
          </div>
        </div>
      )}
    </div>
  );
}
