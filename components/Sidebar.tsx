"use client";
import { Search, Settings, PenSquare, FileText, User, Activity } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createNewThreadId, listThreads, Thread } from "@/lib/chatThreads";
import ThreadKebab from "@/components/chat/ThreadKebab";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";
import { useLocale } from "@/components/hooks/useLocale";
import { useUIStore } from "@/components/hooks/useUIStore";

const LEGACY_NEW_CHAT_TITLES = new Set([
  "New chat", "Nueva conversación", "Nouvelle discussion", "Nuova chat",
  "新建对话", "नई चैट", "محادثة جديدة",
]);

const LEGACY_THERAPY_TITLES = new Set([
  "Therapy session", "Sesión de terapia", "Sessione di terapia",
  "治疗会话", "थेरेपी सत्र", "جلسة علاج",
]);

export default function Sidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get("threadId") ?? "";
  const currentPanel = (searchParams.get("panel") ?? "chat").toLowerCase();
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

  const filtered = threads.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));

  const navItems = [
    { key: "new-chat", label: t("threads.systemTitles.new_chat"), icon: PenSquare, action: handleNewChat },
    { key: "directory", label: t("ui.nav.directory"), icon: FileText, panel: "directory" },
    { key: "profile", label: t("ui.nav.medical_profile"), icon: User, panel: "profile" },
    { key: "timeline", label: t("ui.nav.timeline"), icon: Activity, panel: "timeline" },
  ];

  const navigate = (panel: string) => {
    closeSidebar();
    router.push(`/?panel=${panel}`);
  };

  return (
    <div className="flex h-full w-full flex-col px-2 py-3">

      {/* Nav items */}
      <nav className="flex flex-col gap-px mb-3">
        {navItems.map((item) => {
          const isActive = item.panel ? currentPanel === item.panel && !threadId : false;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => item.action ? item.action() : item.panel ? navigate(item.panel) : null}
              className={[
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-[rgba(6,182,212,0.08)] text-[var(--so-accent,#06B6D4)] font-semibold dark:bg-[rgba(34,211,238,0.12)] dark:text-[#22D3EE]"
                  : "text-[#3C3C43] opacity-70 hover:opacity-100 hover:bg-[rgba(0,0,0,0.04)] dark:text-[#98989D] dark:hover:bg-[rgba(255,255,255,0.05)]",
              ].join(" ")}
            >
              <Icon size={17} strokeWidth={1.5} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Search */}
      <div className="relative mb-3 px-1">
        <input
          className="w-full rounded-xl border border-[var(--so-border,#E5E5EA)] bg-white/80 px-3 py-1.5 text-[12px] outline-none transition focus:border-[var(--so-accent,#06B6D4)] dark:bg-[#2C2C2E] dark:border-[#3A3A3C] dark:text-white placeholder:text-[#8E8E93]"
          placeholder={t("Search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Search size={13} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
      </div>

      {/* CHATS label */}
      <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8E8E93]">
        Chats
      </div>

      {/* Thread list — scrollable, takes remaining space */}
      <div className="flex-1 overflow-y-auto space-y-px min-h-0">
        {filtered.map((thread) => {
          const rawTitle = (thread.title ?? "").trim();
          const systemKey = thread.therapy && LEGACY_THERAPY_TITLES.has(rawTitle)
            ? "threads.systemTitles.therapy_session"
            : LEGACY_NEW_CHAT_TITLES.has(rawTitle)
            ? "threads.systemTitles.new_chat"
            : null;
          const displayTitle = systemKey ? t(systemKey) : rawTitle;
          const active = thread.id === threadId;

          return (
            <div
              key={thread.id}
              className={[
                "group flex items-center rounded-lg px-3 py-1.5 transition-colors cursor-pointer",
                active
                  ? "bg-[rgba(6,182,212,0.06)] font-medium text-[var(--so-text,#000)] dark:text-white"
                  : "text-[#8E8E93] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[rgba(255,255,255,0.03)]",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <button
                onClick={() => { closeSidebar(); router.push(`/?panel=chat&threadId=${thread.id}`); }}
                className="min-w-0 flex-1 truncate text-left text-[12px] leading-5"
              >
                {displayTitle || t("threads.systemTitles.new_chat")}
              </button>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <ThreadKebab
                  id={thread.id}
                  title={thread.title}
                  onRenamed={(nt) => setThreads((prev) => prev.map((x) => (x.id === thread.id ? { ...x, title: nt, updatedAt: Date.now() } : x)))}
                  onDeleted={() => setThreads((prev) => prev.filter((x) => x.id !== thread.id))}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom: Preferences only */}
      <div className="border-t border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E] pt-2 mt-2">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeSidebar?.(); openPrefs(); }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[#8E8E93] transition hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)]"
        >
          <Settings size={17} strokeWidth={1.5} />
          <span>{t("Preferences")}</span>
          <span className="ml-auto text-[11px] opacity-60">{locale.label}</span>
        </button>
      </div>
    </div>
  );
}
