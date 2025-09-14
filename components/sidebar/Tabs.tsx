"use client";
import { useRouter, useSearchParams } from "next/navigation";

type Tab = {
  key: string;
  label: string;
  panel: string;
  threadId?: string;
  context?: string;
};

const tabs: Tab[] = [
  { key: "chat", label: "Chat", panel: "chat" },
  {
    key: "ai-doc",
    label: "AI Doc",
    panel: "chat",
    threadId: "med-profile",
    context: "profile",
  },
  { key: "profile", label: "Medical Profile", panel: "profile" },
  { key: "timeline", label: "Timeline", panel: "timeline" },
  { key: "alerts", label: "Alerts", panel: "alerts" },
  { key: "settings", label: "Settings", panel: "settings" },
];

function NavLink({
  panel,
  children,
  threadId: threadIdProp,
  context,
}: {
  panel: string;
  children: React.ReactNode;
  threadId?: string;
  context?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const threadId = threadIdProp;
  const href = `/?panel=${panel}${threadId ? `&threadId=${encodeURIComponent(threadId)}` : ""}${
    context ? `&context=${encodeURIComponent(context)}` : ""
  }`;

  const active =
    ((params.get("panel") ?? "chat").toLowerCase()) === panel &&
    (threadIdProp ? params.get("threadId") === threadIdProp : !params.get("threadId"));

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(href);
      }}
      className={`block w-full text-left rounded-md px-3 py-2 hover:bg-muted text-sm ${active ? "bg-muted font-medium" : ""}`}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}

export default function Tabs() {
  // preserve current threadId when navigating back to Chat
  const params = useSearchParams();
  const currentThreadId = params.get("threadId") || undefined;
  return (
    <ul className="mt-3 space-y-1">
      {tabs.map((t) => (
        <li key={t.key}>
          <NavLink
            panel={t.panel}
            threadId={t.key === "chat" ? (t.threadId ?? currentThreadId) : t.threadId}
            context={t.context}
          >
            {t.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
