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
    `flex w-full items-center gap-3 rounded-lg border border-slate-200/80 px-3 py-2 text-sm transition dark:border-slate-700/70 ${
      disabled
        ? "opacity-60"
        : "hover:border-slate-300 hover:bg-slate-100/70 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
    }`;

  const handleClick = async (cb?: () => Promise<void> | void, eventName?: string) => {
    if (!cb) return;
    if (eventName) trackAnalyticsEvent(eventName);
    await cb();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 pb-6 pt-10 sm:items-center sm:bg-slate-900/60">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-200 transition dark:bg-slate-950 dark:ring-slate-800 sm:p-6">
        <div className="mb-4 flex items-start">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Share safely</div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Privacy check</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Make sure this doesn’t include personal info before sharing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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

        <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-500">
          Sharing from {BRAND_NAME}
        </p>
      </div>
    </div>
  );
}
