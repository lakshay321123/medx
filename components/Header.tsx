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
    <header className="sticky top-0 z-40 h-14 md:h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-b border-slate-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base md:text-lg font-semibold">
          <div>MedX</div>
          <CountryGlobe />
        </div>
        <div className="flex items-center gap-2">
          <TherapyToggle onChange={onTherapyChange} />
          <button
            onClick={() => onModeChange(mode === 'patient' ? 'doctor' : 'patient')}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
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
