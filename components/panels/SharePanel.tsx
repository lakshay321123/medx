"use client";

import { useEffect } from "react";
import { X, Link as LinkIcon, Download, Share2, Share as ShareIcon, Copy } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { trackAnalyticsEvent } from "@/lib/analytics";

type SharePanelProps = {
  open: boolean;
  onClose: () => void;
  onCopyLink?: () => Promise<void>;
  onDownloadImage: () => Promise<void>;
  onShareX: () => Promise<void> | void;
  onShareFacebook: () => Promise<void> | void;
  onSystemShare?: () => Promise<void>;
  onCopyCaption: () => Promise<void>;
  busyAction?: "link" | "download" | "system" | null;
  canCopyLink: boolean;
  canSystemShare: boolean;
};

export default function SharePanel({
  open,
  onClose,
  onCopyLink,
  onDownloadImage,
  onShareFacebook,
  onShareX,
  onSystemShare,
  onCopyCaption,
  busyAction = null,
  canCopyLink,
  canSystemShare,
}: SharePanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const makeActionClass = (disabled?: boolean) =>
    `flex w-full items-center gap-3 rounded-lg border border-so-border/80 px-3 py-2 text-sm transition dark:border-so-border/70 ${
      disabled
        ? "opacity-60"
        : "hover:border-so-border hover:bg-so-bg/70 dark:hover:border-so-border dark:hover:bg-so-accent/10/60"
    }`;

  const handleClick = async (cb?: () => Promise<void> | void, eventName?: string) => {
    if (!cb) return;
    if (eventName) trackAnalyticsEvent(eventName);
    await cb();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#131316]/40 px-4 pb-6 pt-10 sm:items-center sm:bg-[#131316]/60">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl ring-1 ring-so-border transition dark:bg-[#131316] dark:ring-so-border sm:p-6">
        <div className="mb-4 flex items-start">
          <div>
            <div className="text-xs uppercase tracking-wide text-so-muted dark:text-so-muted">Share safely</div>
            <h2 className="text-lg font-semibold text-so-text dark:text-so-text">Privacy check</h2>
            <p className="mt-2 text-sm text-so-muted dark:text-so-muted">
              Make sure this doesn’t include personal info before sharing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full p-1 text-so-muted transition hover:bg-so-bg hover:text-so-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-so-accent dark:text-so-muted dark:hover:bg-so-accent/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {canCopyLink && (
            <button
              type="button"
              className={makeActionClass(busyAction === "link")}
              onClick={() => handleClick(onCopyLink, "share_copy_link")}
              disabled={busyAction === "link"}
            >
              <LinkIcon size={16} />
              <span>Copy link</span>
            </button>
          )}

          <button
            type="button"
            className={makeActionClass(busyAction === "download")}
            onClick={() => handleClick(onDownloadImage, "share_download_image")}
            disabled={busyAction === "download"}
          >
            <Download size={16} />
            <span>Download image</span>
          </button>

          <button
            type="button"
            className={makeActionClass(false)}
            onClick={() => handleClick(async () => onShareX(), "share_x")}
          >
            <Share2 size={16} />
            <span>Share to X</span>
          </button>

          <button
            type="button"
            className={makeActionClass(false)}
            onClick={() => handleClick(async () => onShareFacebook(), "share_facebook")}
          >
            <ShareIcon size={16} />
            <span>Share to Facebook</span>
          </button>

          {canSystemShare && onSystemShare && (
            <button
              type="button"
              className={makeActionClass(busyAction === "system")}
              onClick={() => handleClick(onSystemShare, "share_system")}
              disabled={busyAction === "system"}
            >
              <ShareIcon size={16} />
              <span>Share via device</span>
            </button>
          )}

          <button
            type="button"
            className={makeActionClass(false)}
            onClick={() => handleClick(onCopyCaption)}
          >
            <Copy size={16} />
            <span>Copy caption for Instagram</span>
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-so-muted dark:text-so-muted">
          Sharing from {BRAND_NAME}
        </p>
      </div>
    </div>
  );
}
