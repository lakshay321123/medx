'use client';
import CountryGlobe from '@/components/CountryGlobe';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';

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
        <ModeBar
          onChange={(s) => {
            if (s.ui === 'patient' || s.ui === 'doctor') onModeChange(s.ui);
            onResearchChange(s.research);
            onTherapyChange(s.therapy);
          }}
        />
      </div>
    </header>
  );
}
