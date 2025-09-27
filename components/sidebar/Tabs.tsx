"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";

type Tab = {
  key: string;
  label: string;
  panel: string;
  context?: string;
};

const tabs: Tab[] = [
  { key: "directory", label: "Directory", panel: "directory" },
  { key: "ai-doc", label: "AI Doc", panel: "ai-doc" },
  { key: "profile", label: "Medical Profile", panel: "profile" },
  { key: "timeline", label: "Timeline", panel: "timeline" },
  { key: "alerts", label: "Alerts", panel: "alerts" },
  { key: "settings", label: "Settings", panel: "settings" },
];

function NavLink({
  panel,
  children,
  context,
}: {
  panel: string;
  children: React.ReactNode;
  context?: string;
}) {
  const params = useSearchParams();
  const closeSidebar = useMobileUiStore((s) => s.closeSidebar);

  const href = `/?panel=${panel}${context ? `&context=${encodeURIComponent(context)}` : ""}`;
  const active = ((params.get("panel") ?? "chat").toLowerCase()) === panel && !params.get("threadId");

  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      onClick={(event) => {
        closeSidebar();
        event.stopPropagation();
      }}
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
    <ul className="mt-2 space-y-1">
      {tabs.map((t) => (
        <li key={t.key}>
          <NavLink panel={t.panel} context={t.context}>
            {t.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
