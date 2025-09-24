export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ShareViewer from "@/components/share/ShareViewer";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BRAND_NAME } from "@/lib/brand";

const TITLE_FALLBACK = `${BRAND_NAME} • Shared answer`;

type PageParams = { params: { slug: string } };

type ShareRecord = {
  plain_text: string;
  md_text: string | null;
  mode: string | null;
  research: boolean | null;
  created_at: string | null;
};

const MODE_LABELS: Record<string, string> = {
  patient: "Patient mode",
  doctor: "Doctor mode",
  therapy: "Therapy answer",
  research: "Research mode",
};

function labelForMode(mode?: string | null) {
  if (!mode) return "Shared answer";
  return MODE_LABELS[mode] ?? "Shared answer";
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  try {
    const supabase = supabaseAdmin();
    const { data } = await supabase
      .from("shared_answers")
      .select("mode")
      .eq("slug", params.slug)
      .maybeSingle();

    if (!data) {
      return { title: TITLE_FALLBACK };
    }

    return { title: `${BRAND_NAME} • ${labelForMode(data.mode)}` };
  } catch {
    return { title: TITLE_FALLBACK };
  }
}

export default async function SharedAnswerPage({ params }: PageParams) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("shared_answers")
    .select("plain_text, md_text, mode, research, created_at")
    .eq("slug", params.slug)
    .maybeSingle<ShareRecord>();

  if (error || !data) {
    return notFound();
  }

  const createdAt = data.created_at ? new Date(data.created_at) : null;
  const modeLabel = labelForMode(data.mode);
  const showResearch = Boolean(data.research);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
        <header className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Shared answer</p>
          <h1 className="text-3xl font-semibold tracking-tight">{BRAND_NAME}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
              {modeLabel}
            </span>
            {showResearch ? (
              <span className="rounded-full border border-sky-200 bg-sky-50/70 px-3 py-1 font-medium text-sky-700 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                Research on
              </span>
            ) : null}
          </div>
          {createdAt ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generated {createdAt.toLocaleString()}
            </p>
          ) : null}
        </header>

        <ShareViewer plainText={data.plain_text} mdText={data.md_text} />

        <footer className="text-center text-xs text-slate-500 dark:text-slate-400">
          Not medical advice. For personal guidance, consult a clinician.
        </footer>
      </div>
    </div>
  );
}
