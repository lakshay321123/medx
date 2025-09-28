"use client";

const cards = [
  {
    name: "Free",
    description: "Up to 10 prompts",
    actionLabel: "Stay on Free",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "$1/month — includes access to everything",
    actionLabel: "Upgrade to Pro",
    highlighted: true,
  },
];

export default function AccountPanel() {
  return (
    <div className="flex flex-col gap-6 px-6 py-5 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200">
          Current plan
        </span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Free</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.name}
            className={`flex h-full flex-col justify-between rounded-2xl border px-5 py-5 shadow-sm transition ${
              card.highlighted
                ? "border-transparent"
                : "border-slate-200 bg-white/95 dark:border-neutral-800 dark:bg-neutral-900/70"
            }`}
            style={
              card.highlighted
                ? {
                    borderColor: "var(--medx-accent)",
                    background: "color-mix(in srgb, var(--medx-accent) 18%, transparent)",
                  }
                : undefined
            }
          >
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{card.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{card.description}</p>
            </div>
            <button
              type="button"
              className={`mt-5 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                card.highlighted
                  ? "bg-[var(--medx-accent)] text-white hover:opacity-90"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
              }`}
            >
              {card.actionLabel}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
        >
          Manage subscription
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
        >
          Sign out
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-start rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          Delete account
        </button>
      </div>
    </div>
  );
}
