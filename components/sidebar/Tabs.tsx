"use client";
import type { ComponentType } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMobileUiStore } from "@/lib/state/mobileUiStore";
import { useT } from "@/components/hooks/useI18n";
import type { IconProps } from "@/components/icons";
import { IconDirectory, IconMedicalProfile, IconTimeline } from "@/components/icons";

type Tab = {
  key: string;
  labelKey: string;
  panel: string;
  context?: string;
  Icon: ComponentType<IconProps>;
};

const TAB_DEFS: Tab[] = [
  { key: "directory", labelKey: "ui.nav.directory", panel: "directory", Icon: IconDirectory },
  { key: "profile", labelKey: "ui.nav.medical_profile", panel: "profile", Icon: IconMedicalProfile },
  { key: "timeline", labelKey: "ui.nav.timeline", panel: "timeline", Icon: IconTimeline },
];

function NavLink({
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
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-blue-600/10 font-semibold text-blue-600 dark:bg-sky-500/20 dark:text-sky-300"
          : "text-slate-600 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-white/5"
      }`}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon title={label} active={active} className="shrink-0" />
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
          <NavLink panel={tab.panel} context={tab.context} Icon={tab.Icon} label={t(tab.labelKey)} />
        </li>
      ))}
    </ul>
  );
}
