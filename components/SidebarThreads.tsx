import { useChatStore } from "@/lib/state/chatStore";
import { useT } from "@/components/hooks/useI18n";

export function SidebarThreads() {
  const t = useT();
  const threads = useChatStore(s => Object.values(s.threads)
    .sort((a,b)=>b.updatedAt - a.updatedAt));

  return (
    <div className="flex flex-col">
      {threads.map(thread => (
        <a key={thread.id} href={`/chat/${thread.id}`} className="px-3 py-2 hover:bg-muted">
          <div className="truncate">{thread.title || t("New chat")}</div>
          {thread.isTemp && <div className="text-xs opacity-60">saving…</div>}
        </a>
      ))}
    </div>
  );
}

