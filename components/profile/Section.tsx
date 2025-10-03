"use client";

import type { ReactNode } from "react";

import ProfileSection from "@/components/profile/ProfileSection";

export type SectionProps = {
  title: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
  children?: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
};

export default function Section({
  title,
  ctaLabel,
  onCta,
  ctaDisabled = false,
  children,
  isEmpty = false,
  emptyMessage,
}: SectionProps) {
  return (
    <ProfileSection
      title={title}
      actions={
        onCta && ctaLabel ? (
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={onCta}
            disabled={ctaDisabled}
          >
            {ctaLabel}
          </button>
        ) : null
      }
      isEmpty={isEmpty}
      emptyMessage={emptyMessage}
    >
      {isEmpty ? null : children}
    </ProfileSection>
  );
}
