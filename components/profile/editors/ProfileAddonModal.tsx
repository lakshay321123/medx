"use client";

import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

import { useT } from "@/components/hooks/useI18n";

export type ProfileAddonModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export default function ProfileAddonModal({
  open,
  title,
  onClose,
  children,
  footer,
}: ProfileAddonModalProps) {
  const { t } = useT();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const dialogNode = dialogRef.current;
    if (dialogNode) {
      const focusable = getFocusable(dialogNode);
      requestAnimationFrame(() => {
        if (focusable[0]) {
          focusable[0].focus();
        } else {
          dialogNode.focus();
        }
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const focusable = getFocusable(dialogRef.current);
        if (focusable.length === 0) {
          event.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const currentIndex = focusable.findIndex(el => el === document.activeElement);
        if (event.shiftKey) {
          const target = focusable[(currentIndex - 1 + focusable.length) % focusable.length];
          target?.focus();
          event.preventDefault();
        } else {
          const target = focusable[(currentIndex + 1) % focusable.length];
          target?.focus();
          event.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const stopScroll = () => {
      document.body.style.overflow = "hidden";
    };
    const restoreScroll = () => {
      document.body.style.overflow = "";
    };
    stopScroll();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreScroll();
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={event => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-addon-modal-title"
        ref={dialogRef}
        className="relative z-[90] max-h-[90vh] w-[min(640px,92vw)] overflow-hidden rounded-2xl bg-background shadow-xl focus:outline-none"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="profile-addon-modal-title" className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
            aria-label={t("Close")}
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <div className="border-t bg-muted/30 px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

function getFocusable(root: HTMLElement) {
  const elements = root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(elements).filter(el => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
}
