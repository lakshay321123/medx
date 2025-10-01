"use client";
import { Search, Settings } from "lucide-react";
import { SIDEBAR_TABS, SidebarNavLink } from "./sidebar/Tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createNewThreadId, listThreads, Thread } from "@/lib/chatThreads";
import ThreadKebab from "@/components/chat/ThreadKebab";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";
import { useLocale } from "@/components/hooks/useLocale";
import { useUIStore } from "@/components/hooks/useUIStore";
import { IconNewChat } from "@/components/icons";

const LEGACY_NEW_CHAT_TITLES = new Set([
  "New chat",
  "Nueva conversación",
  "Nouvelle discussion",
  "Nuova chat",
  "新建对话",
  "नई चैट",
  "محادثة جديدة",
]);

const LEGACY_THERAPY_TITLES = new Set([
  "Therapy session",
  "Sesión de terapia",
  "Sessione di terapia",
  "治疗会话",
  "थेरेपी सत्र",
  "جلسة علاج",
]);

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get("threadId") ?? "";
  const [threads, setThreads] = useState<Thread[]>([]);
  const [q, setQ] = useState("");
  const closeSidebar = useMobileUiStore((state) => state.closeSidebar);
  const t = useT();
  const openPrefs = useUIStore((state) => state.openPrefs);
  const locale = useLocale();

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
    <div className="sidebar-click-guard flex h-full w-full flex-col gap-5 px-4 pt-6 pb-0 text-medx">
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            aria-label={t("threads.systemTitles.new_chat")}
            onClick={handleNewChat}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:text-slate-300 dark:hover:bg-white/5 dark:focus-visible:outline-slate-500"
          >
            <IconNewChat
              title={t("threads.systemTitles.new_chat")}
              size={20}
              className="shrink-0 text-slate-500 transition group-hover:text-slate-700 dark:text-slate-300 dark:group-hover:text-slate-100"
            />
            <span className="truncate">{t("threads.systemTitles.new_chat")}</span>
          </button>
        </li>
        {SIDEBAR_TABS.map((tab) => (
          <li key={tab.key}>
            <SidebarNavLink
              panel={tab.panel}
              context={tab.context}
              Icon={tab.Icon}
              label={t(tab.labelKey)}
            />
          </li>
        ))}
      </ul>

      <div className="relative">
        <input
          className="h-10 w-full rounded-full border border-slate-200 bg-white/80 px-3 pr-8 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-300 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400"
          placeholder={t("Search")}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Search size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-1 pb-16">
        {filtered.map((thread) => {
          const rawTitle = (thread.title ?? "").trim();
          const systemKey = thread.therapy && LEGACY_THERAPY_TITLES.has(rawTitle)
            ? "threads.systemTitles.therapy_session"
            : LEGACY_NEW_CHAT_TITLES.has(rawTitle)
            ? "threads.systemTitles.new_chat"
            : null;
          const displayTitle = systemKey ? t(systemKey) : rawTitle;
          return (
            <div
              key={thread.id}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/60 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
            >
              <button
                onClick={() => {
                  closeSidebar();
                  router.push(`/?panel=chat&threadId=${thread.id}`);
                }}
                className="truncate text-left text-sm font-medium"
                title={displayTitle || rawTitle}
              >
                {displayTitle || t("threads.systemTitles.new_chat")}
              </button>
            <div className="ml-auto">
              <ThreadKebab
                id={thread.id}
                title={thread.title}
                onRenamed={(nt) => {
                  setThreads((prev) =>
                    prev.map((x) => (x.id === thread.id ? { ...x, title: nt, updatedAt: Date.now() } : x))
                  );
                }}
                onDeleted={() => {
                  setThreads((prev) => prev.filter((x) => x.id !== thread.id));
                }}
              />
            </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto" />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeSidebar?.();
          openPrefs();
        }}
        className="fixed bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-md border border-black/10 bg-white/70 px-3 py-2 text-sm shadow-sm hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/70 dark:hover:bg-slate-900"
        aria-label={`${t("Preferences")} · ${locale.label}`}
      >
        <Settings size={14} />
        <span>{t("Preferences")}</span>
        <span className="ml-1 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
          {locale.label}
        </span>
      </button>
    </div>
  );
}
