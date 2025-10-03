"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { SectionShell } from "@/components/profile/SectionShell";
import { useT } from "@/components/hooks/useI18n";
import type { AdvanceDirectives } from "@/types/profile";
import type { AdvanceDirectivesEditorProps } from "@/components/profile/editors/AdvanceDirectivesEditor";

const AdvanceDirectivesEditor = dynamic<AdvanceDirectivesEditorProps>(
  () => import("@/components/profile/editors/AdvanceDirectivesEditor"),
  { ssr: false },
);

type Props = {
  directives?: AdvanceDirectives;
  onSave: (directives: AdvanceDirectives | null) => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
};

export default function AdvanceDirectivesSection({
  directives,
  onSave,
  saving = false,
  disabled = false,
}: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => buildEntries(directives, t), [directives, t]);
  const hasData = entries.length > 0;
  const handlePrimary = useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled]);

  return (
    <>
      <SectionShell
        title={t("profile.advanceDirectives.title")}
        primaryLabel={t(hasData ? "profile.common.edit" : "profile.common.add")}
        onPrimary={handlePrimary}
        primaryDisabled={saving || disabled}
      >
        {hasData ? (
          <ul className="divide-y rounded-lg border">
            {entries.map(entry => (
              <li key={entry.key} className="space-y-1 px-3 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {entry.label}
                </div>
                {entry.isLink ? (
                  <a
                    href={entry.value}
                    className="truncate text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                    title={entry.value}
                  >
                    {entry.value}
                  </a>
                ) : (
                  <div className="truncate" title={entry.value}>
                    {entry.value}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("profile.common.noItems")}</p>
        )}
      </SectionShell>
      <AdvanceDirectivesEditor
        open={open}
        directives={directives}
        onClose={() => setOpen(false)}
        onSave={async data => {
          try {
            await onSave(data);
            setOpen(false);
          } catch (error) {
            console.error(error);
          }
        }}
        saving={saving || disabled}
      />
    </>
  );
}

type Entry = { key: string; label: string; value: string; isLink?: boolean };

type Translator = (key: string) => string;

function buildEntries(directives: AdvanceDirectives | undefined, t: Translator): Entry[] {
  if (!directives) return [];
  const entries: Entry[] = [];
  if (directives.codeStatus) {
    const statusKey = `profile.advanceDirectives.${directives.codeStatus}`;
    const statusLabel = t(statusKey);
    entries.push({
      key: "codeStatus",
      label: t("profile.advanceDirectives.codeStatus"),
      value: statusLabel !== statusKey ? statusLabel : directives.codeStatus,
    });
  }
  if (directives.surrogateName) {
    entries.push({
      key: "surrogateName",
      label: t("profile.advanceDirectives.surrogateName"),
      value: directives.surrogateName,
    });
  }
  if (directives.surrogatePhone) {
    entries.push({
      key: "surrogatePhone",
      label: t("profile.advanceDirectives.surrogatePhone"),
      value: directives.surrogatePhone,
    });
  }
  if (directives.documentUrl) {
    entries.push({
      key: "documentUrl",
      label: t("profile.advanceDirectives.documentUrl"),
      value: directives.documentUrl,
      isLink: true,
    });
  }
  return entries;
}
