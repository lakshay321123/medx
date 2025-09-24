import { useChatStore } from "@/lib/state/chatStore";

export function SidebarThreads() {
  const threads = useChatStore(s => Object.values(s.threads)
    .sort((a,b)=>b.updatedAt - a.updatedAt));

  return (
    <div className="flex flex-1 flex-col gap-1 text-sm text-slate-100 md:text-slate-900">
      {threads.map(t => (
        <a
          key={t.id}
          href={`/chat/${t.id}`}
          className="rounded-xl px-3 py-2 transition hover:bg-slate-800/60 md:hover:bg-muted"
        >
          <div className="truncate font-medium text-slate-50 md:text-slate-900">
            {t.title || "New chat"}
          </div>
          {t.isTemp && <div className="text-xs text-slate-300 md:text-slate-500">saving…</div>}
        </a>
      ))}
    </div>
  );
}

