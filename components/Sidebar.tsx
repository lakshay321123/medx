"use client";
import clsx from "clsx";
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
    <aside className="sidebar-click-guard flex h-full w-full flex-col gap-5 px-4 pt-6 pb-0 text-medx bg-[var(--panel)] border-r border-[var(--border)]">
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            aria-label={t("threads.systemTitles.new_chat")}
            onClick={handleNewChat}
            className={clsx(
              "flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm leading-5 transition-colors",
              "text-[var(--text)] hover:bg-[var(--hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]",
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center text-[var(--text-muted)]" aria-hidden>
              <IconNewChat title={t("threads.systemTitles.new_chat")} size={16} className="text-current" />
            </span>
            <span className="truncate text-[var(--text)]">{t("threads.systemTitles.new_chat")}</span>
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
          className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 pr-8 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] shadow-sm transition focus:border-[var(--brand)] focus:outline-none focus:ring-0"
          placeholder={t("Search")}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Search size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
      </div>

      {/* Section heading above chat threads */}
      <div className="px-3 pb-0 pt-1">
        <h3 className="text-sm font-medium text-[var(--text-muted)]">
          {t?.("Chats") ?? "Chats"}
        </h3>
      </div>

      <div className="mt-1 flex-1 space-y-1 overflow-y-auto pr-1 pb-16">
        {filtered.map((thread) => {
          const rawTitle = (thread.title ?? "").trim();
          const systemKey = thread.therapy && LEGACY_THERAPY_TITLES.has(rawTitle)
            ? "threads.systemTitles.therapy_session"
            : LEGACY_NEW_CHAT_TITLES.has(rawTitle)
            ? "threads.systemTitles.new_chat"
            : null;
          const displayTitle = systemKey ? t(systemKey) : rawTitle;
          return (() => {
            const active = thread.id === threadId;

            return (
              <div
                key={thread.id}
                className={clsx(
                  "group flex h-9 items-center gap-2 rounded-md px-3 transition-colors focus-within:ring-2 focus-within:ring-offset-0",
                  active
                    ? "bg-[var(--selected)] border border-[var(--brand)] text-[var(--text)]"
                    : "text-[var(--text)] hover:bg-[var(--hover)]",
                )}
                aria-current={active ? "page" : undefined}
                title={displayTitle || rawTitle}
              >
                <span className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path d="M4 5h16v10H8l-3 3V5z" fill="currentColor" />
                  </svg>
                </span>

                <button
                  onClick={() => {
                    closeSidebar();
                    router.push(`/?panel=chat&threadId=${thread.id}`);
                  }}
                  className="my-0 min-w-0 flex-1 truncate py-0 text-left text-sm leading-5 text-[var(--text)]"
                >
                  {displayTitle || t("threads.systemTitles.new_chat")}
                </button>

                <div className="ml-auto leading-none text-[var(--text-muted)] opacity-80 group-hover:opacity-100">
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
          })();
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
        className="fixed bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] shadow-sm hover:bg-[var(--hover)]"
        aria-label={`${t("Preferences")} · ${locale.label}`}
      >
        <Settings size={14} />
        <span>{t("Preferences")}</span>
        <span className="ml-1 whitespace-nowrap text-xs text-[var(--text-muted)]">
          {locale.label}
        </span>
      </button>
    </aside>
  );
}
