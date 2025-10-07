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
    <div className="min-h-screen bg-white py-16 px-4 dark:bg-black">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-[#121212]">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Shared answer</h1>
          <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{BRAND_NAME}</span>
        </header>
        <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-inner dark:bg-[#1f1f1f] dark:text-[#ececf1]">
          <ChatMarkdown content={data.content} />
        </div>
        <footer className="mt-6 text-xs text-slate-500 dark:text-slate-500">
          Shared on {new Date(data.createdAt).toLocaleString()}
        </footer>
      </div>
    </div>
  );
}
