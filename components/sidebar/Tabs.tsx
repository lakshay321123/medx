"use client";
import clsx from "clsx";
import type { ComponentType } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";
import type { IconProps } from "@/components/icons";
import { IconDirectory, IconMedicalProfile, IconTimeline } from "@/components/icons";

export type SidebarTab = {
  key: string;
  labelKey: string;
  panel: string;
  context?: string;
  Icon: ComponentType<IconProps>;
};

export const SIDEBAR_TABS: SidebarTab[] = [
  { key: "directory", labelKey: "ui.nav.directory", panel: "directory", Icon: IconDirectory },
  { key: "profile", labelKey: "ui.nav.medical_profile", panel: "profile", Icon: IconMedicalProfile },
  { key: "timeline", labelKey: "ui.nav.timeline", panel: "timeline", Icon: IconTimeline },
];

export function SidebarNavLink({
  panel,
  label,
  Icon,
  context,
}: {
  panel: string;
  label: string;
  Icon: ComponentType<IconProps>;
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
      className={clsx(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        active
          ? "bg-[var(--selected)] border border-[var(--brand)] text-[var(--text)]"
          : "text-[var(--text)] hover:bg-[var(--hover)]",
      )}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon title={label} active={active} className="shrink-0" />
      <span className="truncate text-[var(--text)]">{label}</span>
    </Link>
  );
}

export default function Tabs() {
  const t = useT();
  return (
    <ul className="mt-2 space-y-1">
      {SIDEBAR_TABS.map((tab) => (
        <li key={tab.key}>
          <SidebarNavLink panel={tab.panel} context={tab.context} Icon={tab.Icon} label={t(tab.labelKey)} />
        </li>
      ))}
    </ul>
  );
}
