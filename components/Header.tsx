'use client';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="relative mx-auto flex h-[62px] w-full max-w-screen-2xl items-center gap-4 px-6 md:justify-between">
        <div className="flex shrink-0 items-center gap-3 text-base font-semibold md:text-lg">
          <Brand />
        </div>

        <div className="flex flex-1 justify-center md:absolute md:left-1/2 md:top-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 md:-translate-y-1/2 md:px-4">
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
