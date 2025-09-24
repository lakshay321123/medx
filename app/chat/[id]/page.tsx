'use client';
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { hydrateFromLocalStorage } from "@/lib/state/hydrate";
import ThreadView from "@/components/ThreadView";
import { HeaderMobile } from "@/components/Header";
import Sidebar, { SidebarDrawer } from "@/components/Sidebar";
import ModeBar from "@/components/modes/ModeBar";
import { useChatStore } from "@/lib/state/chatStore";
import ThemeToggle from "@/components/ThemeToggle";
import CountryGlobe from "@/components/CountryGlobe";
import ChatErrorBoundary from "@/components/ChatErrorBoundary";
import FeatureDebug from "@/components/FeatureDebug";

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const startNewThread = useChatStore(s => s.startNewThread);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overflowMenu, setOverflowMenu] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    hydrateFromLocalStorage(id);
  }, [id]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (sidebarOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("overflow-hidden");
      }
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setOverflowMenu(null);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!overflowMenu || typeof document === "undefined") return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-overflow-menu]") && !target.closest("[data-overflow-trigger]")) {
        setOverflowMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [overflowMenu]);

  const handleStartNewChat = () => {
    const nextId = startNewThread();
    router.push(`/chat/${nextId}`);
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
      console.error('Failed to open overflow menu', error);
    }
  };

  const overflowActions = useMemo(
    () => ["Rename", "Duplicate", "Share", "Delete", "Settings", "Dark Mode", "Country"],
    [],
  );

  return (
    <ChatErrorBoundary>
      <div className="h-dvh flex flex-col overscroll-none bg-[#FFFFFF] text-[#0F172A] dark:bg-[#0B1220] dark:text-[#E6EDF7]">
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
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#334155] dark:text-[#94A3B8]" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="md:hidden">
          <SidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
            <Sidebar />
          </SidebarDrawer>
        </div>

        <main className="relative flex flex-1 flex-col">
          <div className="md:hidden">
            <ModeBar />
          </div>
          <ThreadView id={id} />
        </main>
      </div>
    </ChatErrorBoundary>
  );
}

