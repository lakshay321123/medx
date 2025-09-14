'use client';
import Brand from '@/components/nav/Brand';
import ModeBar from '@/components/modes/ModeBar';
import type { ModeState } from '@/lib/modes/types';

export default function Header({ onModesChange }: { onModesChange?: (s: ModeState) => void }) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <Brand />
      <ModeBar onChange={onModesChange} />
    </header>
  );
}
