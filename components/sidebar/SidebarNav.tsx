"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { IconDirectory } from "@/components/icons/IconDirectory";
import { IconMedicalProfile } from "@/components/icons/IconMedicalProfile";
import { IconTimeline } from "@/components/icons/IconTimeline";
import type { IconProps } from "@/components/icons/Glyph";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";

type Tab = {
  key: string;
  labelKey: string;
  panel: string;
  context?: string;
  Icon: (props: IconProps) => JSX.Element;
};

const TAB_DEFS: Tab[] = [
  { key: "directory", labelKey: "ui.nav.directory", panel: "directory", Icon: IconDirectory },
  { key: "profile", labelKey: "ui.nav.medical_profile", panel: "profile", Icon: IconMedicalProfile },
  { key: "timeline", labelKey: "ui.nav.timeline", panel: "timeline", Icon: IconTimeline },
];

function NavLink({ panel, context, label, Icon }: {
  panel: string;
  context?: string;
  label: string;
  Icon: (props: IconProps) => JSX.Element;
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
      className={`sidebar-item w-full rounded-md text-left text-sm transition ${
        active ? "bg-muted font-medium" : "hover:bg-muted"
      }`}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        active={active}
        aria-hidden="true"
        className="flex-shrink-0"
        title={label}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function SidebarNav() {
  const t = useT();
  return (
    <ul className="mt-2 space-y-1">
      {TAB_DEFS.map(({ key, labelKey, Icon, panel, context }) => {
        const label = t(labelKey);
        return (
          <li key={key}>
            <NavLink panel={panel} context={context} label={label} Icon={Icon} />
          </li>
        );
      })}
    </ul>
  );
}
