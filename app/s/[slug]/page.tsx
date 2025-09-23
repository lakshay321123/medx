import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import ShareViewer from "@/components/share/ShareViewer";
import { BRAND_NAME } from "@/lib/brand";

const TITLE_FALLBACK = `${BRAND_NAME} • Shared answer`;

type PageParams = { params: { slug: string } };

type ShareRecord = {
  content: string;
  mode: string;
  created_at: string | null;
};

export async function generateMetadata({ params }: PageParams) {
  try {
    const supabase = supabaseServer();
    const { data } = await supabase
      .from("shared_answers")
      .select("mode")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!data) {
      return { title: TITLE_FALLBACK };
    }
    const label =
      data.mode === "doctor"
        ? "Doctor mode"
        : data.mode === "patient"
        ? "Patient mode"
        : data.mode === "therapy"
        ? "Therapy answer"
        : data.mode === "research"
        ? "Research mode"
        : "Shared answer";
    return { title: `${BRAND_NAME} • ${label}` };
  } catch {
    return { title: TITLE_FALLBACK };
  }
}

export default async function SharedAnswerPage({ params }: PageParams) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("shared_answers")
    .select("content, mode, created_at")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error) {
    console.error("Shared answer fetch error", error);
  }

  if (!data) {
    notFound();
  }

  const record = data as ShareRecord;
  const createdAt = record.created_at ? new Date(record.created_at) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Shared answer</p>
          <h1 className="text-3xl font-semibold tracking-tight">{BRAND_NAME}</h1>
          {createdAt ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generated {createdAt.toLocaleString()}
            </p>
          ) : null}
        </header>

        <ShareViewer content={record.content} />

        <footer className="text-center text-xs text-slate-500 dark:text-slate-400">
          Not medical advice. For personal guidance, consult a clinician.
        </footer>
      </div>
    </div>
  );
}
