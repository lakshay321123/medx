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
    <header className="sticky top-0 z-40 h-14 md:h-16 medx-glass flex items-center">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-base md:text-lg font-semibold">
          <div>MedX</div>
          <CountryGlobe />
        </div>
        <div className="flex items-center gap-2">
          <TherapyToggle onChange={onTherapyChange} />
          <button
            onClick={() => onModeChange(mode === 'patient' ? 'doctor' : 'patient')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm medx-surface text-medx"
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
