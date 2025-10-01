'use client';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="relative mx-auto flex h-[62px] w-full max-w-screen-2xl items-center gap-4 px-6 lg:h-16">
        <div className="flex shrink-0 items-center gap-3 text-base font-semibold md:text-lg">
          <Brand />
        </div>

        <div className="flex flex-1 justify-center lg:hidden">
          <ModeBar />
        </div>

        <div className="hidden lg:block lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
          <ModeBar />
        </div>

        <div className="flex items-center gap-3 lg:absolute lg:right-6 lg:top-1/2 lg:-translate-y-1/2">
          <ThemeToggle />
          <CountryGlobe />
        </div>
      </div>
    </header>
  );
}
