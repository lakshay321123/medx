"use client";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const tabs = [
  { key: "chat", label: "Chat" },
  { key: "profile", label: "Medical Profile" },
  { key: "timeline", label: "Timeline" },
  { key: "alerts", label: "Alerts" },
  { key: "settings", label: "Settings" },
];

function NavLink({ panel, children }: { panel: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const threadId = params.get("threadId") ?? undefined;
  const href = { pathname, query: threadId ? { panel, threadId } : { panel } };

  const active = ((params.get("panel") ?? "chat").toLowerCase()) === panel;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();                         // ensure client-side nav fires
    router.push(href as any, { scroll: false });
    if (panel === "chat") window.dispatchEvent(new Event("focus-chat-input"));
  };

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={handleClick}
      className={`block w-full text-left rounded-md px-3 py-2 hover:bg-muted text-sm ${active ? "bg-muted font-medium" : ""}`}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
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

