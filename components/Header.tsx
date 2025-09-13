'use client';
import ThemeToggle from './ThemeToggle';
import { ResearchToggle } from './ResearchToggle';
import TherapyToggle from './TherapyToggle';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';

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
    <header className="sticky top-0 z-40 h-14 md:h-16 medx-glass">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base md:text-lg font-semibold">
          <Brand />
          <CountryGlobe />
        </div>
        <div className="flex items-center gap-2">
          <TherapyToggle
            onChange={(on) => {
              if (on && mode !== 'patient') {
                document.dispatchEvent(
                  new CustomEvent('toast', { detail: { text: 'Therapy works only with Patient mode.' } })
                );
                onTherapyChange(false);
                return;
              }
              onTherapyChange(on);
            }}
          />
          <div className="inline-flex rounded-xl border p-1 dark:border-neutral-800">
            <button
              onClick={() => onModeChange('patient')}
              className={`px-3 py-1.5 rounded-lg ${mode==='patient' ? 'bg-blue-600 text-white' : 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'}`}
            >
              Patient
            </button>
            <button
              onClick={() => onModeChange('doctor')}
              className={`px-3 py-1.5 rounded-lg ${mode==='doctor' ? 'bg-blue-600 text-white' : 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'}`}
            >
              Doctor
            </button>
          </div>
          <ResearchToggle
            defaultOn={researchOn}
            onChange={(on) => {
              if (on && !mode) {
                document.dispatchEvent(
                  new CustomEvent('toast', { detail: { text: 'Select Patient or Doctor to use Research.' } })
                );
                onResearchChange(false);
                return;
              }
              onResearchChange(on);
            }}
          />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
