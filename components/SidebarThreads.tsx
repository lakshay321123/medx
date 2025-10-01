"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Keep existing ordering (recent first)
  const threads = useChatStore((s) =>
    Object.values(s.threads).sort((a, b) => b.updatedAt - a.updatedAt)
  );

  return (
    <nav aria-label={t("Chat threads")} className="flex flex-col px-2 pt-2 space-y-1">
      {threads.map((thread) => {
        const raw = (thread.title ?? "").trim();
        const displayTitle = !raw || LEGACY_UNTITLED_TITLES.has(raw) ? t("New chat") : raw;
        const isActive = pathname === `/chat/${thread.id}`;

        return (
          <Link
            key={thread.id}
            href={`/chat/${thread.id}`}
            className={[
              "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              isActive
                ? "bg-blue-600/10 font-semibold text-blue-600 dark:bg-sky-500/20 dark:text-sky-300"
                : "text-slate-600 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-white/5",
            ].join(" ")}
            aria-current={isActive ? "page" : undefined}
            title={displayTitle}
          >
            {/* Icon box (keep family style w/ other sidebar icons) */}
            <span className="shrink-0 h-5 w-5" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path d="M4 5h16v10H8l-3 3V5z" fill="currentColor" />
              </svg>
            </span>

            {/* Title: single-line truncate to avoid sidebar stretch */}
            <span className="min-w-0 flex-1 truncate text-sm">{displayTitle}</span>

            {/* Optional right meta (preserve existing semantics) */}
            {thread.isTemp && (
              <span className="ml-auto text-xs opacity-60">{t("saving…")}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

