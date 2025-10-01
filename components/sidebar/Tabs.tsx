"use client";

import type { ComponentType } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { IconDirectory } from "@/components/icons/IconDirectory";
import { IconMedicalProfile } from "@/components/icons/IconMedicalProfile";
import { IconTimeline } from "@/components/icons/IconTimeline";
import { IconProps } from "@/components/icons/Glyph";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";

type Tab = {
  key: string;
  labelKey: string;
  panel: string;
  context?: string;
  icon: ComponentType<IconProps>;
};

const TAB_DEFS: Tab[] = [
  { key: "directory", labelKey: "ui.nav.directory", panel: "directory", icon: IconDirectory },
  { key: "profile", labelKey: "ui.nav.medical_profile", panel: "profile", icon: IconMedicalProfile },
  { key: "timeline", labelKey: "ui.nav.timeline", panel: "timeline", icon: IconTimeline },
];

type NavLinkProps = {
  panel: string;
  context?: string;
  label: string;
  Icon: ComponentType<IconProps>;
};

function NavLink({ panel, context, label, Icon }: NavLinkProps) {
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
      className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-muted ${
        active ? "bg-muted font-medium text-foreground" : "text-foreground/80 hover:text-foreground"
      }`}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        width={20}
        height={20}
        title={label}
        active={active}
        className="h-5 w-5 opacity-70 group-aria-[current=page]:opacity-100"
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function Tabs() {
  const t = useT();
  return (
    <ul className="mt-2 space-y-1">
      {TAB_DEFS.map((tab) => {
        const label = t(tab.labelKey);
        return (
          <li key={tab.key}>
            <NavLink panel={tab.panel} context={tab.context} label={label} Icon={tab.icon} />
          </li>
        );
      })}
    </ul>
  );
}
