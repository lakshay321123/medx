"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createNewThreadId, listThreads, type Thread } from "@/lib/chatThreads";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";
import { useUIStore } from "@/components/hooks/useUIStore";
import { usePrefs } from "@/components/hooks/usePrefs";
import { useProfile } from "@/lib/hooks/useAppData";
import { IconDirectory, IconMedicalProfile, IconNewChat, IconTimeline } from "@/components/icons";

import ThreadRow from "./sidebar/ThreadRow";

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

type SidebarState = {
  threads: Thread[];
  threadId: string;
  activePanel: string;
  handleNewChat: () => void;
  openDirectory: () => void;
  openMedicalProfile: () => void;
  openTimeline: () => void;
  openPreferences: () => void;
  onThreadRenamed: (id: string, title: string) => void;
  onThreadDeleted: (id: string) => void;
  t: ReturnType<typeof useT>;
  userName: string | null;
  planLabel: string;
};

function useSidebarState(): SidebarState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get("threadId") ?? "";
  const [threads, setThreads] = useState<Thread[]>([]);
  const closeSidebar = useMobileUiStore((state) => state.closeSidebar);
  const t = useT();
  const openPrefs = useUIStore((state) => state.openPrefs);
  const { plan } = usePrefs();
  const { data: profile } = useProfile();

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

  const goToPanel = (panel: string) => {
    const params = new URLSearchParams();
    params.set("panel", panel);
    closeSidebar();
    router.push(`/?${params.toString()}`);
  };

  const openDirectory = () => goToPanel("directory");
  const openMedicalProfile = () => goToPanel("profile");
  const openTimeline = () => goToPanel("timeline");
  const openPreferences = () => {
    closeSidebar();
    openPrefs();
  };

  const onThreadRenamed = (id: string, title: string) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === id ? { ...thread, title, updatedAt: Date.now() } : thread,
      ),
    );
  };

  const onThreadDeleted = (id: string) => {
    setThreads((prev) => prev.filter((thread) => thread.id !== id));
  };

  const planLabel = useMemo(() => {
    if (plan === "pro") return "Pro";
    if (plan === "free") return "Free";
    return plan ?? "Free";
  }, [plan]);

  const userName = useMemo(() => {
    const data = profile as
      | { profile?: { fullName?: string | null; name?: string | null }; user?: { name?: string | null }; name?: string | null }
      | undefined;
    return (
      data?.profile?.fullName ||
      data?.profile?.name ||
      data?.user?.name ||
      data?.name ||
      null
    );
  }, [profile]);

  return {
    threads,
    threadId,
    activePanel: (searchParams.get("panel") ?? "chat").toLowerCase(),
    handleNewChat,
    openDirectory,
    openMedicalProfile,
    openTimeline,
    openPreferences,
    onThreadRenamed,
    onThreadDeleted,
    t,
    userName,
    planLabel,
  };
}

type SidebarContentBodyProps = SidebarState & {
  className?: string;
  paddingBottomClass?: string;
};

function SidebarContentBody({
  threads,
  threadId,
  activePanel,
  handleNewChat,
  openDirectory,
  openMedicalProfile,
  openTimeline,
  openPreferences,
  onThreadRenamed,
  onThreadDeleted,
  t,
  userName,
  planLabel,
  className,
  paddingBottomClass,
}: SidebarContentBodyProps) {
  const newChatLabel = t("threads.systemTitles.new_chat") || "New Chat";

  const navItems = [
    {
      key: "directory",
      label: t("ui.nav.directory") || t("Directory") || "Directory",
      Icon: IconDirectory,
      onClick: openDirectory,
      active: activePanel === "directory" && !threadId,
    },
    {
      key: "profile",
      label: t("ui.nav.medical_profile") || t("Medical Profile") || "Medical Profile",
      Icon: IconMedicalProfile,
      onClick: openMedicalProfile,
      active: activePanel === "profile" && !threadId,
    },
    {
      key: "timeline",
      label: t("ui.nav.timeline") || t("Timeline") || "Timeline",
      Icon: IconTimeline,
      onClick: openTimeline,
      active: activePanel === "timeline" && !threadId,
    },
  ];

  const chatsLabel = t("Chats") || "Chats";
  const preferencesLabel = t("Preferences") || "Preferences";
  const planLabelText = t("Plan") || "Plan";
  const planValue = planLabel || "Free";

  return (
    <div
      className={clsx(
        "flex h-full w-full flex-col bg-transparent",
        className,
        paddingBottomClass,
      )}
    >
      <div className="mb-2">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label={newChatLabel}
          title={newChatLabel}
        >
          <IconNewChat title={newChatLabel} active size={18} className="text-white" />
          <span className="truncate">{newChatLabel}</span>
        </button>
      </div>

      <div className="border-t border-black/10 dark:border-white/10" />

      <nav className="mt-2 grid gap-1">
        {navItems.map(({ key, label, Icon, onClick, active }) => (
          <button
            key={key}
            onClick={onClick}
            className={clsx(
              "flex h-11 items-center gap-2 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20",
              active
                ? "bg-blue-600/10 font-semibold text-blue-700 dark:bg-sky-500/20 dark:text-sky-200"
                : "hover:bg-black/5 dark:hover:bg-white/5",
            )}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center">
              <Icon title={label} active={active} className="h-5 w-5" />
            </span>
            <span className="truncate text-sm font-medium">{label}</span>
          </button>
        ))}
      </nav>

      <div className="my-2 border-t border-black/10 dark:border-white/10" />

      <div className="px-2 text-[11px] uppercase tracking-wide opacity-60">{chatsLabel}</div>

      <div className="mt-1 flex-1 space-y-1 overflow-y-auto pr-1">
        {threads.map((thread) => {
          const rawTitle = (thread.title ?? "").trim();
          const systemKey = thread.therapy && LEGACY_THERAPY_TITLES.has(rawTitle)
            ? "threads.systemTitles.therapy_session"
            : LEGACY_NEW_CHAT_TITLES.has(rawTitle)
            ? "threads.systemTitles.new_chat"
            : null;
          const displayTitle = systemKey ? t(systemKey) : rawTitle || newChatLabel;

          return (
            <ThreadRow
              key={thread.id}
              thread={thread}
              title={displayTitle}
              isActive={thread.id === threadId}
              onRenamed={(newTitle) => onThreadRenamed(thread.id, newTitle)}
              onDeleted={() => onThreadDeleted(thread.id)}
            />
          );
        })}
      </div>

      <div className="mt-2 border-t border-black/10 dark:border-white/10" />
      <button
        onClick={openPreferences}
        className="mt-2 flex items-center gap-3 rounded-xl border border-black/10 bg-white p-2 shadow-sm transition hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-slate-900 md:bg-white/60 md:backdrop-blur md:dark:bg-slate-900/60 dark:hover:bg-slate-900"
        aria-label={preferencesLabel}
        title={preferencesLabel}
      >
        <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{userName || "You"}</div>
          <div className="text-xs opacity-70">
            {planLabelText}: {planValue}
          </div>
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" stroke="currentColor" fill="none" />
          <path d="M19 12a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" fill="none" />
        </svg>
      </button>
    </div>
  );
}

type SidebarContentProps = {
  className?: string;
  paddingBottomClass?: string;
};

export function SidebarContent({ className, paddingBottomClass }: SidebarContentProps = {}) {
  const state = useSidebarState();
  return (
    <SidebarContentBody
      {...state}
      className={className}
      paddingBottomClass={
        paddingBottomClass ?? "pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
      }
    />
  );
}

export default function Sidebar() {
  const state = useSidebarState();
  return (
    <aside
      role="navigation"
      aria-label="Primary"
      className="flex h-full w-full flex-col bg-transparent px-3 pt-3 pb-2"
    >
      <SidebarContentBody {...state} paddingBottomClass="pb-0" />
    </aside>
  );
}
