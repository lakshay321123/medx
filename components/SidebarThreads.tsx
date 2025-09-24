"use client";
import { useMemo } from "react";
import { useChatStore } from "@/lib/state/chatStore";

export function SidebarThreads() {
  const threadsMap = useChatStore(s => s.threads);
  const threads = useMemo(() => {
    const list = Object.values(threadsMap ?? {});
    return list
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [threadsMap]);

  return (
    <div className="flex flex-1 flex-col gap-1 text-sm text-[#0F172A] dark:text-[#E6EDF7]">
      {threads.map(t => (
        <a
          key={t.id}
          href={`/chat/${t.id}`}
          className="rounded-xl border border-transparent px-3 py-2 transition hover:border-[#2563EB] hover:bg-[#2563EB]/10 dark:hover:border-[#3B82F6] dark:hover:bg-[#3B82F6]/10"
        >
          <div className="truncate font-medium">
            {t.title || "New chat"}
          </div>
          {t.isTemp && <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">saving…</div>}
        </a>
      ))}
    </div>
  );
}

