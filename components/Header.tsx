'use client';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="relative mx-auto flex h-[62px] w-full max-w-screen-2xl items-center px-6">
        <div className="flex shrink-0 items-center gap-3 text-base font-semibold md:text-lg">
          <Brand />
        </div>

        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <ModeBar />
        </div>

        <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 items-center gap-3">
          <ThemeToggle />
          <CountryGlobe />
        </div>
      </div>
    </header>
  );
}
