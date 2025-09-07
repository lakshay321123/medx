'use client';
import { User, Stethoscope } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { ResearchToggle } from './ResearchToggle';
import TherapyToggle from './TherapyToggle';
import CountryGlobe from '@/components/CountryGlobe';

export default function Header({
  mode,
  onModeChange,
  researchOn,
  onResearchChange,
  onTherapyChange,
}: {
  mode: 'patient' | 'doctor';
  onModeChange: (m: 'patient' | 'doctor') => void;
  researchOn: boolean;
  onResearchChange: (v: boolean) => void;
  onTherapyChange: (v: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-40 h-14 md:h-16 bg-gradient-to-b from-[#f8fbff] to-white dark:from-[rgba(5,100,245,0.3)] dark:to-[rgba(5,100,245,0.1)] border-b border-[var(--g300)] dark:border-white/25">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base md:text-lg font-semibold">
          <div>MedX</div>
          <CountryGlobe />
        </div>
        <div className="flex items-center gap-2">
          <TherapyToggle onChange={onTherapyChange} />
          <button
            onClick={() => onModeChange(mode === 'patient' ? 'doctor' : 'patient')}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border border-transparent transition shadow-sm bg-[var(--p)] text-white shadow"
          >
            {mode === 'patient' ? (
              <>
                <User size={16} /> Patient
              </>
            ) : (
              <>
                <Stethoscope size={16} /> Doctor
              </>
            )}
          </button>
          <ResearchToggle defaultOn={researchOn} onChange={onResearchChange} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
