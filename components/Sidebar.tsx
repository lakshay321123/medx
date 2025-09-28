"use client";
import { Search, Settings } from "lucide-react";
import Tabs from "./sidebar/Tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createNewThreadId, listThreads, Thread } from "@/lib/chatThreads";
import ThreadKebab from "@/components/chat/ThreadKebab";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get("threadId") ?? "";
  const [threads, setThreads] = useState<Thread[]>([]);
  const [q, setQ] = useState("");
  const closeSidebar = useMobileUiStore((state) => state.closeSidebar);
  const t = useT();

  useEffect(() => {
    const load = () => setThreads(listThreads());
    load();
    window.addEventListener("storage", load);
    window.addEventListener("chat-threads-updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("chat-threads-updated", load);
    };
  }, []);
  const handleNewChat = () => {
    const id = createNewThreadId();
    closeSidebar();
    router.push(`/?panel=chat&threadId=${id}`);
  };

  const handleSearch = (value: string) => {
    setQ(value);
    window.dispatchEvent(new CustomEvent("search-chats", { detail: value }));
  };
  const filtered = threads.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="sidebar-click-guard flex h-full w-full flex-col gap-4 px-4 pt-6 pb-0 text-medx">
      <button
        type="button"
        aria-label={t("New chat")}
        onClick={handleNewChat}
        className="w-full rounded-full bg-blue-600 px-4 py-2.5 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
      >
        + {t("New chat")}
      </button>

      <div>
        <div className="relative">
          <input
            className="w-full h-10 rounded-full border border-slate-200 bg-white/80 px-3 pr-8 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder={t("Search")}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
        </div>
        <Tabs />
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1 pb-16">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/60 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
          >
            <button
              onClick={() => {
                closeSidebar();
                router.push(`/?panel=chat&threadId=${t.id}`);
              }}
              className="truncate text-left text-sm font-medium"
              title={t.title}
            >
              {t.title}
            </button>
            <div className="ml-auto">
              <ThreadKebab
                id={t.id}
                title={t.title}
                onRenamed={(nt) => {
                  setThreads((prev) =>
                    prev.map((x) => (x.id === t.id ? { ...x, title: nt, updatedAt: Date.now() } : x))
                  );
                }}
                onDeleted={() => {
                  setThreads((prev) => prev.filter((x) => x.id !== t.id));
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto" />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeSidebar?.();
          const params = new URLSearchParams(
            typeof window !== "undefined" ? window.location.search : searchParams?.toString() || "",
          );
          const tid = params.get("threadId");
          params.set("panel", "settings");
          params.delete("tab");
          if (tid) {
            params.set("threadId", tid);
          }
          router.push(`/?${params.toString()}`);
        }}
        className="fixed bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-md border border-black/10 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/70 dark:hover:bg-slate-900"
        aria-label={t("Preferences")}
      >
        <Settings size={14} /> {t("Preferences")}
      </button>
    </div>
  );
}
