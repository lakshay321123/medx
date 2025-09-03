'use client';
import { useEffect, useState } from 'react';

type Props = {
  onChange: (enabled: boolean) => void;
  initial?: boolean;
};

export default function TherapyToggle({ onChange, initial=false }: Props) {
  const [on, setOn] = useState<boolean>(initial);

  useEffect(() => {
    const saved = localStorage.getItem('therapyMode') === 'on';
    setOn(saved);
    onChange(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    localStorage.setItem('therapyMode', next ? 'on' : 'off');
    onChange(next);
  }

  return (
    <button
      onClick={toggle}
      className={`fixed top-4 right-4 z-50 rounded-full px-4 py-2 text-sm font-medium shadow ${on ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-white border border-neutral-300'}`}
      title="Therapy Mode"
      aria-pressed={on}
    >
      {on ? 'Therapy Mode: ON' : 'Therapy Mode'}
    </button>
  );
}
