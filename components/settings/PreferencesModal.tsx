"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

import { useScrollLock } from "@/components/hooks/useScrollLock";
import SettingsPane from "@/components/panels/SettingsPane";
import { useT } from "@/components/hooks/useI18n";
import { useUIStore } from "@/components/hooks/useUIStore";

export default function PreferencesModal() {
  const open = useUIStore((state) => state.prefsOpen);
  const defaultTab = useUIStore((state) => state.prefsTab);
  const close = useUIStore((state) => state.closePrefs);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const t = useT();

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      titleRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;

    const selector = [
      "button",
      "[href]",
      "input",
      "select",
      "textarea",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const getFocusables = () =>
      Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute("disabled")
      );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusables = getFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-[var(--backdrop)] transition-opacity sm:bg-black/50"
        aria-hidden="true"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            close();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preferences-title"
        ref={dialogRef}
        className={clsx(
          "fixed inset-x-0 bottom-0 z-[70]",
          "sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "w-full sm:w-[min(96vw,980px)]",
          "bg-[var(--surface-2)] text-[var(--text)]",
          "rounded-t-2xl sm:rounded-2xl shadow-xl",
          "grid grid-rows-[auto,1fr,auto] overflow-hidden",
          "min-h-[40svh] max-h-[85svh] [@supports(height:100dvh)]:max-h-[85dvh] sm:h-[min(92vh,620px)]"
        )}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2
            id="preferences-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-base font-semibold outline-none"
          >
            {t("Preferences")}
          </h2>
          <button
            type="button"
            aria-label={t("Close")}
            className="rounded-lg p-2 hover:opacity-80 focus-visible:ring-2"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <SettingsPane defaultTab={defaultTab} onClose={close} asMobile />
        </div>
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/85 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 backdrop-blur">
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={close}>
              {t("Cancel")}
            </button>
            <button type="submit" form="preferences-form" className="btn-primary flex-1">
              {t("Save changes")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
