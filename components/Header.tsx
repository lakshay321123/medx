'use client';
import type { MouseEvent } from 'react';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-[#E2E8F0] bg-[#F8FAFC]/90 text-[#0F172A] backdrop-blur-md dark:border-[#1E3A5F] dark:bg-[#0F1B2D]/90 dark:text-[#E6EDF7] md:block">
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
  const logError = (error: unknown) => {
    console.error('HeaderMobile handler error', error);
  };

  const handleToggleSidebar = () => {
    try {
      onToggleSidebar?.();
    } catch (error) {
      logError(error);
    }
  };

  const handleStartNewChat = () => {
    try {
      onStartNewChat?.();
    } catch (error) {
      logError(error);
    }
  };

  const handleOpenOverflow = (event: MouseEvent<HTMLButtonElement>) => {
    try {
      onOpenOverflow?.(event.currentTarget);
    } catch (error) {
      logError(error);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F8FAFC]/95 text-[#0F172A] backdrop-blur md:hidden dark:bg-[#0F1B2D]/95 dark:text-[#E6EDF7]">
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm transition hover:bg-[#F1F5F9] dark:border-[#1E3A5F] dark:bg-[#13233D] dark:text-[#E6EDF7] dark:hover:bg-[#172A46]"
          aria-label="Open navigation"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex-1 px-1 text-center text-sm font-semibold tracking-wide">
          {title}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartNewChat}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-sm transition hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB]"
            aria-label="Start new chat"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleOpenOverflow}
            data-overflow-trigger
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A] shadow-sm transition hover:bg-[#F1F5F9] dark:border-[#1E3A5F] dark:bg-[#13233D] dark:text-[#E6EDF7] dark:hover:bg-[#172A46]"
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
