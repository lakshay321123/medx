'use client';
import CountryGlobe from '@/components/CountryGlobe';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--so-border,#E5E5EA)] bg-[var(--so-card,#fff)] dark:border-[#2C2C2E] dark:bg-[#1C1C1E]">
      <div className="mx-auto flex h-[52px] w-full items-center justify-center px-4 relative">
        {/* Mode bar — centered */}
        <ModeBar />

        {/* Right controls — absolute positioned */}
        <div className="absolute right-4 flex items-center gap-2">
          <ThemeToggle />
          <CountryGlobe />
        </div>
      </div>
    </header>
  );
}
