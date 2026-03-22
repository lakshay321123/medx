import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getStats() {
  const sb = supabaseAdmin();
  const results = await Promise.allSettled([
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("observations").select("id", { count: "exact", head: true }),
    sb.from("predictions").select("id", { count: "exact", head: true }),
    sb.from("chat_threads").select("id", { count: "exact", head: true }),
    sb.from("daily_checkins").select("id", { count: "exact", head: true }),
    sb.from("health_scores").select("id", { count: "exact", head: true }),
  ]);
  const val = (i: number) => results[i].status === "fulfilled" ? (results[i] as any).value?.count || 0 : 0;
  return {
    profiles: val(0),
    observations: val(1),
    predictions: val(2),
    threads: val(3),
    checkins: val(4),
    scores: val(5),
  };
}

export default async function AdminPage() {
  const stats = await getStats();

  const cards = [
    { label: "Profiles", value: stats.profiles, color: "#06B6D4" },
    { label: "Observations", value: stats.observations, color: "#8B5CF6" },
    { label: "Predictions", value: stats.predictions, color: "#F59E0B" },
    { label: "Chat Threads", value: stats.threads, color: "#10B981" },
    { label: "Daily Check-ins", value: stats.checkins, color: "#EC4899" },
    { label: "Health Scores", value: stats.scores, color: "#3B82F6" },
  ];

  return (
    <div className="min-h-screen bg-[var(--so-bg,#F2F2F7)] dark:bg-[var(--so-bg,#000)] p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-1">
          Admin Dashboard
        </h1>
        <p className="text-sm text-[var(--so-text-secondary,#8E8E93)] mb-8">
          Second Opinion system overview
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map(c => (
            <div key={c.label} className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-white dark:bg-[#1C1C1E] p-5">
              <p className="text-xs font-medium text-[var(--so-text-secondary,#8E8E93)] uppercase tracking-wider">{c.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-white dark:bg-[#1C1C1E] p-5">
          <h2 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-3">System Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--so-text-secondary,#8E8E93)]">Database</span>
              <span className="text-emerald-500 font-medium">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--so-text-secondary,#8E8E93)]">OpenAI API</span>
              <span className="text-emerald-500 font-medium">{process.env.OPENAI_API_KEY ? "Active" : "Not configured"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--so-text-secondary,#8E8E93)]">Model</span>
              <span className="font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">{process.env.OPENAI_TEXT_MODEL || "gpt-4o"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
