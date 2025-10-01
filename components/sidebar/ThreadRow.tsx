"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";

import ThreadKebab from "@/components/chat/ThreadKebab";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import type { Thread } from "@/lib/chatThreads";

type ThreadRowProps = {
  thread: Thread;
  title: string;
  isActive: boolean;
  onRenamed: (newTitle: string) => void;
  onDeleted: () => void;
};

export default function ThreadRow({ thread, title, isActive, onRenamed, onDeleted }: ThreadRowProps) {
  const router = useRouter();
  const closeSidebar = useMobileUiStore((state) => state.closeSidebar);

  const handleSelect = () => {
    closeSidebar();
    router.push(`/?panel=chat&threadId=${thread.id}`);
  };

  return (
    <div
      className={clsx(
        "group flex h-11 w-full items-center gap-2 rounded-lg px-2 text-slate-700 transition dark:text-slate-200",
        isActive
          ? "bg-white/80 font-semibold text-slate-900 shadow-sm ring-1 ring-black/10 backdrop-blur dark:bg-slate-900/60 dark:text-slate-100 dark:ring-white/10"
          : "hover:bg-black/5 dark:hover:bg-white/5",
      )}
    >
      <button
        type="button"
        onClick={handleSelect}
        className="flex-1 truncate text-left text-sm"
        title={title}
        aria-current={isActive ? "true" : undefined}
      >
        {title}
      </button>
      <ThreadKebab id={thread.id} title={thread.title} onRenamed={onRenamed} onDeleted={onDeleted} />
    </div>
  );
}
