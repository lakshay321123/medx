"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const tabs = [
  { key: "chat", label: "Chat" },
  { key: "profile", label: "Medical Profile" },
  { key: "timeline", label: "Timeline" },
  { key: "alerts", label: "Alerts" },
  { key: "settings", label: "Settings" },
];

function NavLink({ panel, children }: { panel: string; children: React.ReactNode }) {
  const params = useSearchParams();
  const threadId = params.get("threadId");
  const qp = new URLSearchParams();
  qp.set("panel", panel);
  if (threadId) qp.set("threadId", threadId);
  const active = (params.get("panel") ?? "chat") === panel;

  return (
    <Link
      href={"?" + qp.toString()}
      prefetch={false}
      className={`block w-full text-left rounded-md px-3 py-2 hover:bg-muted text-sm ${active ? "bg-muted font-medium" : ""}`}
      data-testid={`nav-${panel}`}
      onClick={() => {
        if (panel === "chat") window.dispatchEvent(new Event("focus-chat-input"));
      }}
    >
      {children}
    </Link>
  );
}

export default function Tabs() {
  return (
    <ul className="mt-3 space-y-1">
      {tabs.map((t) => (
        <li key={t.key}>
          <NavLink panel={t.key}>{t.label}</NavLink>
        </li>
      ))}
    </ul>
  );
}
