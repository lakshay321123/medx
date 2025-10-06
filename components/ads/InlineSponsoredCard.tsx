'use client';
import type { AdCard } from '@/types/ads';

export function InlineSponsoredCard({ card }: { card: AdCard }) {
  return (
    <div className="mt-4 pt-3 border-t border-zinc-200">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Sponsored partner • {card.category}</div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
        <div className="text-sm">
          <div className="font-medium">{card.title}</div>
          {card.body && <div className="text-zinc-600 text-xs">{card.body}</div>}
        </div>
        <a href={card.cta.url} target="_blank" className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-black">
          {card.cta.label}
        </a>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500">
        <span>Sponsored</span><span>·</span>
        <span>{card.labels.whyThis ?? 'Contextual to your last message'}</span>
      </div>
    </div>
  );
}
