import ChatMarkdown from "@/components/ChatMarkdown";
import { BRAND_NAME } from "@/lib/brand";
import { getShare } from "@/lib/share/store";
import { notFound } from "next/navigation";

interface SharePageProps {
  params: { id: string };
}

export default function SharePage({ params }: SharePageProps) {
  const data = getShare(params.id);
  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-100 py-16 px-4 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-xl dark:border-slate-800/70 dark:bg-slate-900/80">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Shared answer</h1>
          <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{BRAND_NAME}</span>
        </header>
        <div className="rounded-2xl bg-slate-50/80 p-6 text-slate-900 shadow-inner dark:bg-slate-950/40 dark:text-slate-100">
          <ChatMarkdown content={data.content} />
        </div>
        <footer className="mt-6 text-xs text-slate-500 dark:text-slate-500">
          Shared on {new Date(data.createdAt).toLocaleString()}
        </footer>
      </div>
    </div>
  );
}
