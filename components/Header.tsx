'use client';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';
import { StopButton } from '@/components/ui/StopButton';
import { useChatRunState } from '@/stores/useChatRunState';

export default function Header() {
  const isBusy = useChatRunState(state => state.isBusy);
  const abortAll = useChatRunState(state => state.abortAll);

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="mx-auto flex h-[62px] w-full max-w-screen-2xl items-center gap-4 px-6">
        <div className="flex shrink-0 items-center gap-3 text-base font-semibold md:text-lg">
          <Brand />
        </div>

        <div className="flex flex-1 justify-center">
          <ModeBar />
        </div>

        <div className="flex items-center gap-3">
          {isBusy ? (
            <StopButton onClick={abortAll} />
          ) : null}
          <ThemeToggle />
          <CountryGlobe />
        </div>
      </div>
    </header>
  );
}
