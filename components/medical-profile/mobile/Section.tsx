"use client";

import type { ReactNode } from "react";
import Button from "./Button";
import Divider from "./Divider";

type SectionProps = {
  title: string;
  actionLabel?: string;
  primary?: boolean;
  children: ReactNode;
  onActionClick?: () => void;
  actionAriaLabel?: string;
};

export default function Section({
  title,
  actionLabel,
  primary,
  children,
  onActionClick,
  actionAriaLabel,
}: SectionProps) {
  const actionVariant = primary ? "solid" : "outline";

  return (
    <section className="rounded-2xl bg-white dark:bg-[#12141a] shadow-lg shadow-black/5 ring-1 ring-black/5 dark:ring-white/5">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {actionLabel ? (
          <Button
            variant={actionVariant}
            primary={primary}
            small
            onClick={onActionClick}
            aria-label={actionAriaLabel || actionLabel}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
      <div className="px-4 pt-2">
        <Divider />
      </div>
      <div className="space-y-3 px-4 py-4">{children}</div>
    </section>
  );
}
