'use client';
import type { AdCard } from '@/types/ads';

// Force a single blue accent for sponsored messaging
const CHIP = 'text-sky-700 bg-sky-50 dark:text-sky-200 dark:bg-sky-900/30';
const RING = 'ring-sky-200';

export default function InlineSponsoredCard({
  card,
  onCtaClick,
}: {
  card: AdCard;
  onCtaClick?: () => void;
}) {
  const safeHref = /^https?:\/\//i.test(card.cta.url) ? card.cta.url : '#';

  return (
    <div className="mt-3">
      <div className="min-h-[84px] pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${CHIP}`}
          title={card.labels?.whyThis ?? 'Contextual to your last message'}
        >
          <span className="uppercase tracking-wide">Sponsored partner</span>
          <span>•</span>
          <span className="capitalize">{card.category}</span>
        </div>

        <div
          className={`mt-2 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2 ring-1 ${RING}`}
        >
          <div className="text-sm">
            <div className="font-medium">{card.title}</div>
            {card.body && <div className="text-xs text-zinc-600 dark:text-zinc-400">{card.body}</div>}
          </div>

          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-label={`Sponsored: ${card.cta.label}`}
            className={[
              'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium',
              'backdrop-blur-md bg-white/50 dark:bg-white/10',
              'text-zinc-900 dark:text-white ring-1 ring-inset',
              RING,
              'transition-colors hover:bg-white/70 dark:hover:bg-white/20',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900',
            ].join(' ')}
            onClick={onCtaClick}
          >
            {card.cta.label}
          </a>
        </div>

        <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          Sponsored · {card.labels?.whyThis ?? 'Contextual to your last message'}
        </div>
      </div>
    </div>
  );
}
