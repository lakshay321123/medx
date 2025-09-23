'use client';

import { useEffect } from 'react';
import { Clipboard, Download, Link as LinkIcon, Share2, Twitter, Facebook } from 'lucide-react';

type SharePanelProps = {
  open: boolean;
  onClose: () => void;
  preview: string;
  onCopyLink: () => Promise<void>;
  onDownloadImage: () => Promise<void>;
  onShareX: () => void;
  onShareFacebook: () => void;
  onSystemShare?: () => Promise<void>;
  onCopyCaption: () => Promise<void>;
  canSystemShare: boolean;
  busyAction: null | 'link' | 'download' | 'caption' | 'system';
};

export default function SharePanel(props: SharePanelProps) {
  const {
    open,
    onClose,
    preview,
    onCopyLink,
    onDownloadImage,
    onShareX,
    onShareFacebook,
    onSystemShare,
    onCopyCaption,
    canSystemShare,
    busyAction,
  } = props;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center px-3 py-6 sm:items-center">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-black/10 bg-white/95 p-5 shadow-2xl backdrop-blur sm:rounded-2xl dark:border-white/10 dark:bg-slate-900/95">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Share answer</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-300 dark:hover:bg-slate-800/70 dark:focus-visible:ring-offset-slate-900"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
          Make sure this doesn’t include personal info.
        </p>
        <div className="mt-4 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          {preview || 'No preview available.'}
        </div>
        <div className="mt-5 grid gap-2 text-sm">
          <button
            type="button"
            onClick={onCopyLink}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={busyAction === 'link'}
          >
            <span className="inline-flex items-center gap-2"><LinkIcon size={16} /> Copy link</span>
            {busyAction === 'link' && <span className="text-xs text-slate-500">Working…</span>}
          </button>
          <button
            type="button"
            onClick={onDownloadImage}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={busyAction === 'download'}
          >
            <span className="inline-flex items-center gap-2"><Download size={16} /> Download image</span>
            {busyAction === 'download' && <span className="text-xs text-slate-500">Working…</span>}
          </button>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onShareX}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className="inline-flex items-center gap-2"><Twitter size={16} /> Share to X</span>
              <Share2 size={14} />
            </button>
            <button
              type="button"
              onClick={onShareFacebook}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className="inline-flex items-center gap-2"><Facebook size={16} /> Share to Facebook</span>
              <Share2 size={14} />
            </button>
          </div>
          {canSystemShare && onSystemShare && (
            <button
              type="button"
              onClick={onSystemShare}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={busyAction === 'system'}
            >
              <span className="inline-flex items-center gap-2"><Share2 size={16} /> Share via device</span>
              {busyAction === 'system' && <span className="text-xs text-slate-500">Working…</span>}
            </button>
          )}
          <button
            type="button"
            onClick={onCopyCaption}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={busyAction === 'caption'}
          >
            <span className="inline-flex items-center gap-2"><Clipboard size={16} /> Copy caption</span>
            {busyAction === 'caption' && <span className="text-xs text-slate-500">Copied</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
