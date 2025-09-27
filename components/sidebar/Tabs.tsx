"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { MapPin } from "lucide-react";
import type { ComponentType } from "react";

type Tab = {
  key: string;
  label: string;
  panel?: string;
  href?: string;
  threadId?: string;
  context?: string;
  icon?: ComponentType<{ className?: string }>;
};

const DIRECTORY_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_DIRECTORY === "1" || process.env.FEATURE_DIRECTORY === "1";

const baseTabs: Tab[] = [
  ...(DIRECTORY_ENABLED
    ? [{ key: "directory", label: "Directory", href: "/directory", icon: MapPin } satisfies Tab]
    : []),
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

function NavLink({ tab, currentThreadId }: { tab: Tab; currentThreadId?: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const closeSidebar = useMobileUiStore(state => state.closeSidebar);

  let href = tab.href;
  if (!href && tab.panel) {
    const threadId = tab.threadId ?? (tab.panel === "chat" ? currentThreadId : undefined);
    const usp = new URLSearchParams();
    usp.set("panel", tab.panel);
    if (threadId) usp.set("threadId", threadId);
    if (tab.context) usp.set("context", tab.context);
    href = `/?${usp.toString()}`;
  }

  if (!href) return null;

  const isPanelActive = tab.panel
    ? ((params.get("panel") ?? "chat").toLowerCase()) === tab.panel &&
      (tab.threadId ? params.get("threadId") === tab.threadId : !params.get("threadId"))
    : false;
  const isRouteActive = tab.href ? pathname === tab.href : false;
  const active = tab.href ? isRouteActive : isPanelActive;

  const Icon = tab.icon;

  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      onClick={event => {
        closeSidebar();
        event.stopPropagation();
      }}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-muted ${
        active ? "bg-muted font-medium" : ""
      }`}
      data-testid={`nav-${tab.key}`}
      aria-current={active ? "page" : undefined}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{tab.label}</span>
    </Link>
  );
}

export default function Tabs() {
  const params = useSearchParams();
  const currentThreadId = params.get("threadId") || undefined;
  return (
    <ul className="mt-3 space-y-1">
      {baseTabs.map(tab => (
        <li key={tab.key}>
          <NavLink tab={tab} currentThreadId={currentThreadId} />
        </li>
      ))}
    </ul>
  );
}
