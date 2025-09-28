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
    <div className="flex flex-col gap-6 px-4 py-4 text-white">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Current plan
        </span>
        <span className="text-sm font-medium text-neutral-200">Free</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.name}
            className={`flex h-full flex-col justify-between rounded-2xl border px-5 py-5 transition ${
              card.highlighted
                ? "border-sky-500/60 bg-sky-500/10"
                : "border-neutral-700 bg-neutral-900/60"
            }`}
          >
            <div className="space-y-2">
              <p className="text-lg font-semibold">{card.name}</p>
              <p className="text-sm text-neutral-300">{card.description}</p>
            </div>
            <button
              type="button"
              className={`mt-5 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                card.highlighted
                  ? "bg-sky-500 text-white hover:bg-sky-400"
                  : "border border-neutral-600 bg-neutral-800/60 text-neutral-100 hover:border-neutral-500 hover:bg-neutral-800"
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
          className="inline-flex items-center justify-start rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800"
        >
          Manage subscription
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-start rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800"
        >
          Sign out
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-start rounded-full border border-red-700/60 bg-red-900/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-500 hover:bg-red-900/20"
        >
          Delete account
        </button>
      </div>
    </div>
  );
}
