'use client';
import CountryGlobe from '@/components/CountryGlobe';
import ModeBar from '@/components/modes/ModeBar';
import ThemeToggle from '@/components/ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--so-border,#E5E5EA)] bg-[var(--so-card,#fff)]/95 backdrop-blur-md dark:border-[#2C2C2E] dark:bg-[#1C1C1E]/95">
      <div className="flex h-[48px] w-full items-center justify-center px-4 relative">
        {/* Mode bar — centered */}
        <ModeBar />

        {/* Right controls */}
        <div className="absolute right-4 flex items-center gap-1">
          <ThemeToggle />
          <CountryGlobe />
        </div>
      </div>
    </header>
  );
}
