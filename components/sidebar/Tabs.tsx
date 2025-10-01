"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";
import {
  IconDirectory,
  IconMedicalProfile,
  IconTimeline,
} from "@/components/icons/SidebarIcons";
import type { IconProps } from "@/components/icons/SidebarIcons";

type Tab = {
  key: string;
  labelKey: string;
  panel: string;
  context?: string;
  icon?: (props: IconProps) => JSX.Element;
};

const TAB_DEFS: Tab[] = [
  {
    key: "directory",
    labelKey: "ui.nav.directory",
    panel: "directory",
    icon: IconDirectory,
  },
  {
    key: "profile",
    labelKey: "ui.nav.medical_profile",
    panel: "profile",
    icon: IconMedicalProfile,
  },
  {
    key: "timeline",
    labelKey: "ui.nav.timeline",
    panel: "timeline",
    icon: IconTimeline,
  },
  { key: "alerts", labelKey: "ui.nav.alerts", panel: "alerts" },
];

function NavLink({
  panel,
  label,
  context,
  icon: Icon,
}: {
  panel: string;
  label: string;
  context?: string;
  icon?: Tab["icon"];
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
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-muted ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
    >
      {Icon ? (
        <Icon
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          title={label}
          className={active ? "text-foreground" : "text-muted-foreground"}
        />
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Tabs() {
  const t = useT();
  return (
    <ul className="mt-2 space-y-1">
      {TAB_DEFS.map((tab) => (
        <li key={tab.key}>
          <NavLink
            panel={tab.panel}
            context={tab.context}
            icon={tab.icon}
            label={t(tab.labelKey)}
          />
        </li>
      ))}
    </ul>
  );
}
