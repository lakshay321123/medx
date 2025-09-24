'use client';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40 md:block">
      <div className="mx-auto flex h-[62px] w-full max-w-screen-2xl items-center gap-4 px-6">
        <div className="flex shrink-0 items-center gap-3 text-base font-semibold md:text-lg">
          <Brand />
        </div>

        <div className="flex flex-1 justify-center">
          <ModeBar />
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <CountryGlobe />
        </div>
      </div>
    </header>
  );
}

type HeaderMobileProps = {
  title?: string;
  onToggleSidebar?: () => void;
  onStartNewChat?: () => void;
  onOpenOverflow?: (anchor: HTMLElement) => void;
};

export function HeaderMobile({
  title = "Second Opinion",
  onToggleSidebar,
  onStartNewChat,
  onOpenOverflow,
}: HeaderMobileProps) {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-slate-950/90 backdrop-blur">
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-slate-200 shadow-sm ring-1 ring-white/5"
          aria-label="Open navigation"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex-1 px-1 text-center text-sm font-semibold tracking-wide text-slate-100">
          {title}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartNewChat}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-sm ring-1 ring-blue-400/40"
            aria-label="Start new chat"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <button
            type="button"
            onClick={event => {
              if (onOpenOverflow) {
                onOpenOverflow(event.currentTarget);
              }
            }}
            data-overflow-trigger
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-slate-200 shadow-sm ring-1 ring-white/5"
            aria-label="More options"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="6" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="18" r="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
