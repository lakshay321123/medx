"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChatStore } from "@/lib/state/chatStore";
import { SidebarThreads } from "@/components/SidebarThreads";
import { ChatWindow } from "@/components/ChatWindow";
import { HeaderMobile } from "@/components/Header";
import { SidebarDrawer } from "@/components/Sidebar";
import ModeBar from "@/components/modes/ModeBar";

export default function ChatPage() {
  const pathname = usePathname();
  const router = useRouter();
  const resetToEmpty = useChatStore(s => s.resetToEmpty);
  const startNewThread = useChatStore(s => s.startNewThread);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overflowMenu, setOverflowMenu] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    // fresh landing: no thread id in the url → reset everything
    const isThreadRoute = /^\/chat\/[A-Za-z0-9_-]+$/.test(pathname ?? "");
    if (!isThreadRoute) {
      resetToEmpty();
    }
  }, [pathname, resetToEmpty]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [sidebarOpen]);

  useEffect(() => {
    const handler = () => setOverflowMenu(null);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!overflowMenu) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-overflow-menu]") && !target.closest("[data-overflow-trigger]") ) {
        setOverflowMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [overflowMenu]);

  const handleStartNewChat = () => {
    const id = startNewThread();
    router.push(`/chat/${id}`);
    setSidebarOpen(false);
    setOverflowMenu(null);
  };

  const openOverflow = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    setOverflowMenu({
      top: rect.bottom + 8,
      right: Math.max(window.innerWidth - rect.right - 8, 12),
    });
  };

  const overflowActions = useMemo(
    () => ["Rename", "Duplicate", "Share", "Delete", "Settings"],
    [],
  );

  return (
    <div className="h-dvh flex flex-col overscroll-none bg-slate-950 text-slate-100 md:bg-transparent md:text-inherit">
      <HeaderMobile
        onToggleSidebar={() => setSidebarOpen(true)}
        onStartNewChat={handleStartNewChat}
        onOpenOverflow={openOverflow}
      />

      {overflowMenu && (
        <div
          data-overflow-menu
          className="fixed z-50 w-44 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/95 text-sm shadow-xl backdrop-blur"
          style={{ top: overflowMenu.top, right: overflowMenu.right }}
        >
          <ul className="py-1">
            {overflowActions.map(action => (
              <li key={action}>
                <button
                  type="button"
                  className="flex w-full items-center px-4 py-2 text-left text-slate-200 transition hover:bg-slate-800"
                  onClick={() => {
                    setOverflowMenu(null);
                    if (action === "Settings") {
                      router.push("/?panel=settings");
                    }
                  }}
                >
                  {action}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="flex h-full flex-col gap-4 text-sm">
          <div className="flex items-center justify-between pt-1 text-xs uppercase tracking-wide text-slate-400">
            <span>Conversations</span>
            <button
              type="button"
              onClick={handleStartNewChat}
              className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
            >
              New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <SidebarThreads />
          </div>
        </div>
      </SidebarDrawer>

      <div className="flex flex-1 md:grid md:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-slate-200/60 bg-slate-900/10 md:flex md:flex-col">
          <div className="flex items-center justify-between px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Conversations</span>
            <button
              type="button"
              onClick={handleStartNewChat}
              className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
            >
              New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <SidebarThreads />
          </div>
        </aside>

        <main className="relative flex flex-1 flex-col">
          <div className="md:hidden px-3 pt-2">
            <ModeBar />
          </div>
          <ChatWindow />
        </main>
      </div>
    </div>
  );
}

