import { useChatStore } from "@/lib/state/chatStore";

export function SidebarThreads() {
  const threads = useChatStore(s => Object.values(s.threads)
    .sort((a,b)=>b.updatedAt - a.updatedAt));

  return (
    <div className="flex flex-col">
      {threads.map(t => (
        <a key={t.id} href={`/chat/${t.id}`} className="px-3 py-2 hover:bg-muted">
          <div className="truncate">{t.title || "New chat"}</div>
          {t.isTemp && <div className="text-xs opacity-60">saving…</div>}
        </a>
      ))}
    </div>
  );
}

