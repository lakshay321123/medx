"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

import AdvanceDirectivesEditor from "@/components/profile/editors/AdvanceDirectivesEditor";
import { useT } from "@/components/hooks/useI18n";
import type { AdvanceDirectives } from "@/types/profile";

type AdvanceDirectivesPanelProps = {
  directives?: AdvanceDirectives;
  onSave: (directives: AdvanceDirectives | null) => Promise<void> | void;
  saving?: boolean;
};

export default function AdvanceDirectivesPanel({ directives, onSave, saving = false }: AdvanceDirectivesPanelProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const hasData = Boolean(directives && Object.keys(directives).length);

  return (
    <div className="space-y-3 text-sm">
      {hasData ? (
        <ul className="divide-y rounded-lg border">
          {renderLine("codeStatus", directives?.codeStatus, value => t(`profile.advanceDirectives.${value}`), t)}
          {renderLine("surrogateName", directives?.surrogateName, value => value, t)}
          {renderLine("surrogatePhone", directives?.surrogatePhone, value => value, t)}
          {directives?.documentUrl ? (
            <li className="space-y-1 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("profile.advanceDirectives.documentUrl")}
              </div>
              <a
                href={directives.documentUrl}
                className="inline-flex items-center gap-2 truncate text-primary underline"
                target="_blank"
                rel="noreferrer"
                title={directives.documentUrl}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                {directives.documentUrl}
              </a>
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <span className="text-muted-foreground">{t("profile.common.noItems")}</span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            onClick={() => setOpen(true)}
            aria-label={t("profile.advanceDirectives.add")}
            disabled={saving}
          >
            <FileText className="h-3 w-3" aria-hidden="true" />
            {t("profile.common.add")}
          </button>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm"
          onClick={() => setOpen(true)}
          disabled={saving}
        >
          {t(hasData ? "profile.common.edit" : "profile.common.add")}
        </button>
      </div>
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
        saving={saving}
      />
    </div>
  );
}

type Formatter = (value: string) => string;

function renderLine(
  key: keyof AdvanceDirectives,
  value: string | undefined,
  formatter: Formatter,
  translate: (key: string) => string,
){
  if (!value) return null;
  return (
    <li key={key} className="space-y-1 px-3 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {translate(`profile.advanceDirectives.${key}`)}
      </div>
      <div className="truncate" title={formatter(value)}>
        {formatter(value)}
      </div>
    </li>
  );
}
