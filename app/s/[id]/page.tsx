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
    <div className="min-h-screen bg-so-bg py-16 px-4 dark:bg-[#131316]">
      <div className="mx-auto max-w-3xl rounded-3xl border border-so-border/80 bg-white/95 p-8 shadow-xl dark:border-so-border/70 dark:bg-so-card/80">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-so-text dark:text-so-text">Shared answer</h1>
          <span className="text-xs uppercase tracking-wide text-so-muted dark:text-so-muted">{BRAND_NAME}</span>
        </header>
        <div className="rounded-2xl bg-so-bg/80 p-6 text-so-text shadow-inner dark:bg-[#131316]/40 dark:text-so-text">
          <ChatMarkdown content={data.content} />
        </div>
        <footer className="mt-6 text-xs text-so-muted dark:text-so-muted">
          Shared on {new Date(data.createdAt).toLocaleString()}
        </footer>
      </div>
    </div>
  );
}
