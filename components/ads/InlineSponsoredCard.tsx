'use client';
import type { AdCard } from '@/types/ads';

export default function InlineSponsoredCard({ card }: { card: AdCard }) {
  const safeHref = /^https?:\/\//i.test(card.cta.url) ? card.cta.url : '#';

  return (
    <div className="mt-3 pt-3 border-t border-zinc-200">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">
        Sponsored partner • {card.category}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
        <div className="text-sm">
          <div className="font-medium">{card.title}</div>
          {card.body && <div className="text-xs text-zinc-600">{card.body}</div>}
        </div>

        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`Sponsored: ${card.cta.label}`}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-black"
        >
          {card.cta.label}
        </a>
      </div>

      <div className="mt-2 text-[11px] text-zinc-500">
        Sponsored · {card.labels?.whyThis ?? 'Contextual to your last message'}
      </div>
    </div>
  );
}
