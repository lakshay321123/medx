'use client';

import ChatMarkdown from "@/components/ChatMarkdown";

type ShareViewerProps = {
  plainText: string;
  mdText?: string | null;
};

export default function ShareViewer({ plainText, mdText }: ShareViewerProps) {
  const content = (mdText && mdText.trim().length > 0 ? mdText : plainText) || plainText;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <ChatMarkdown content={content} />
    </div>
  );
}
