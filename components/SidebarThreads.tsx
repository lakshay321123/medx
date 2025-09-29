import { useChatStore } from "@/lib/state/chatStore";
import { useT } from "@/components/hooks/useI18n";

const LEGACY_UNTITLED_TITLES = new Set([
  "New chat",
  "Nueva conversación",
  "Nouvelle discussion",
  "नई चैट",
  "محادثة جديدة",
]);

export function SidebarThreads() {
  const { t } = useT();
  const threads = useChatStore(s =>
    Object.values(s.threads).sort((a, b) => b.updatedAt - a.updatedAt),
  );

  return (
    <div className="flex flex-col">
      {threads.map(thread => {
        const title = (thread.title ?? "").trim();
        const displayTitle =
          !title || LEGACY_UNTITLED_TITLES.has(title) ? t("New chat") : title;

        return (
          <a key={thread.id} href={`/chat/${thread.id}`} className="px-3 py-2 hover:bg-muted">
            <div className="truncate">{displayTitle}</div>
            {thread.isTemp && (
              <div className="text-xs opacity-60">{t("saving…")}</div>
            )}
          </a>
        );
      })}
    </div>
  );
}

