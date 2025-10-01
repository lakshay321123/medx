'use client';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="relative mx-auto flex h-[62px] w-full max-w-screen-2xl items-center gap-4 px-6">
        <div className="flex shrink-0 items-center gap-3 text-base font-semibold md:text-lg">
          <Brand />
        </div>

        <div className="flex flex-1 justify-center md:hidden">
          <ModeBar />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <CountryGlobe />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 justify-center md:left-[calc(50%+1.25rem)] md:flex">
          <div className="pointer-events-auto">
            <ModeBar />
          </div>
        </div>
      </div>
    </header>
  );
}
