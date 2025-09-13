"use client";
import { useRouter, useSearchParams } from "next/navigation";

const tabs = [
  { key: "chat", label: "Chat", panel: "chat" },
  { key: "ai-doc", label: "AI Doc", panel: "ai-doc" },
  { key: "profile", label: "Medical Profile", panel: "profile" },
  { key: "timeline", label: "Timeline", panel: "timeline" },
  { key: "alerts", label: "Alerts", panel: "alerts" },
  { key: "settings", label: "Settings", panel: "settings" },
];

export default function Tabs() {
  const router = useRouter();
  const params = useSearchParams();
  const currentThreadId = params.get("threadId") || undefined;

  function href(panel: string, threadId?: string) {
    return `/?panel=${panel}${threadId ? `&threadId=${encodeURIComponent(threadId)}` : ""}`;
  }

  const activePanel = (params.get("panel") ?? "chat").toLowerCase();

  return (
    <ul className="mt-3 space-y-1">
      {tabs.map((t) => {
        const link = href(t.panel, t.key === "chat" ? currentThreadId : undefined);
        const active = activePanel === t.panel;
        return (
          <li key={t.key}>
            <button
              onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); router.push(link); }}
              className={`w-full rounded-lg px-3 py-2 text-left hover:bg-muted text-sm ${active ? "bg-muted font-medium" : ""}`}
              data-testid={`nav-${t.panel}`}
              aria-current={active ? "page" : undefined}
            >
              {t.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
