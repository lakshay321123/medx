"use client";
export default function AccountPanel() {
  const Card = ({ title, sub, cta }: { title: string; sub: string; cta: string }) => (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>
      </div>
      <button className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">{cta}</button>
    </div>
  );
  return (
    <div className="space-y-3 p-5">
      <div className="text-xs opacity-70">Plan</div>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 dark:border-white/10 dark:bg-slate-900/60">Current: Free</span>
      </div>
      <Card title="Free" sub="Up to 10 prompts/month" cta="Stay on Free" />
      <Card title="Pro — $1/month" sub="Includes access to everything" cta="Upgrade to Pro" />
      <div className="h-px w-full bg-black/5 dark:bg-white/10" />
      <div className="flex items-center justify-between">
        <div className="text-[13px]">Manage subscription</div>
        <button className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">Open</button>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[13px]">Sign out</div>
        <button className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">Sign out</button>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-red-600">Delete account</div>
        <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
          Delete
        </button>
      </div>
    </div>
  );
}
