"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";

type Tab = {
  key: string;
  labelKey: string;
  panel: string;
  context?: string;
};

const tabs: Tab[] = [
  { key: "directory", labelKey: "Directory", panel: "directory" },
  { key: "profile", labelKey: "Medical Profile", panel: "profile" },
  { key: "timeline", labelKey: "Timeline", panel: "timeline" },
  { key: "alerts", labelKey: "Alerts", panel: "alerts" },
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
  const t = useT();
  return (
    <ul className="mt-2 space-y-1">
      {tabs.map((tab) => (
        <li key={tab.key}>
          <NavLink panel={tab.panel} context={tab.context}>
            {t(tab.labelKey)}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
