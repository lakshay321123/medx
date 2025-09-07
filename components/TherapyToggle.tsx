'use client';
import { useEffect, useState } from 'react';

type Props = {
  onChange: (enabled: boolean) => void;
  initial?: boolean;
  variant?: 'inline' | 'floating';
  className?: string;
};

export default function TherapyToggle({
  onChange,
  initial = false,
  variant = 'inline',
  className = '',
}: Props) {
  const [on, setOn] = useState<boolean>(initial);

  useEffect(() => {
    const saved = localStorage.getItem('therapyMode') === 'on';
    const val = saved ?? initial;
    setOn(val);
    onChange(val);
  }, [initial, onChange]);

  function toggle() {
    const next = !on;
    setOn(next);
    localStorage.setItem('therapyMode', next ? 'on' : 'off');
    onChange(next);
  }

  const baseChip = 'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border transition shadow-sm';
  const onChip = 'bg-[var(--p)] text-white border-transparent shadow';
  const offChip = 'bg-[var(--g50)] text-inherit border-[var(--g300)] opacity-85 hover:shadow dark:bg-[#0F172A] dark:text-[#CBD5E1] dark:border-[var(--g300)]';

  if (variant === 'floating') {
    return (
      <button
        onClick={toggle}
        aria-pressed={on}
        title="Therapy Mode"
        className={`fixed top-4 right-4 z-40 shadow ${baseChip} ${on ? onChip : offChip} ${className}`}
      >
        {on ? 'Therapy Mode: ON' : 'Therapy Mode'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      title="Therapy Mode"
      className={`${baseChip} ${on ? onChip : offChip} ${className}`}
    >
      {on ? 'Therapy Mode: ON' : 'Therapy Mode'}
    </button>
  );
}
