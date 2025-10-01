"use client";
import { useRouter } from "next/navigation";
import ThreadKebab from "@/components/chat/ThreadKebab";
import { useT } from "@/components/hooks/useI18n";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { Thread } from "@/lib/chatThreads";

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

type ThreadRowProps = {
  thread: Thread;
  draggable?: boolean;
  active?: boolean;
  onRenamed?: (title: string) => void;
  onDeleted?: () => void;
};

export default function ThreadRow({
  thread,
  draggable = false,
  active = false,
  onRenamed,
  onDeleted,
}: ThreadRowProps) {
  const router = useRouter();
  const { t } = useT();
  const closeSidebar = useMobileUiStore((s) => s.closeSidebar);

  const rawTitle = (thread.title ?? "").trim();
  const systemKey = thread.therapy && LEGACY_THERAPY_TITLES.has(rawTitle)
    ? "threads.systemTitles.therapy_session"
    : LEGACY_NEW_CHAT_TITLES.has(rawTitle)
    ? "threads.systemTitles.new_chat"
    : null;
  const displayTitle = systemKey ? t(systemKey) : rawTitle || t("threads.systemTitles.new_chat");

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white/60 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60 ${active ? "ring-1 ring-blue-500 dark:ring-blue-400" : ""}`}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData("text/thread-id", thread.id);
      }}
    >
      <button
        onClick={() => {
          closeSidebar();
          router.push(`/?panel=chat&threadId=${thread.id}`);
        }}
        className="truncate text-left text-sm font-medium"
        title={displayTitle}
      >
        {displayTitle}
      </button>
      <div className="ml-auto">
        <ThreadKebab
          id={thread.id}
          title={thread.title}
          onRenamed={(title) => onRenamed?.(title)}
          onDeleted={() => onDeleted?.()}
        />
      </div>
    </div>
  );
}
