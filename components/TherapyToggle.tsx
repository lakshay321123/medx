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

  const baseChip = 'rounded-full px-3 h-9 inline-flex items-center text-sm border transition';
  const onChip   = 'bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:border-blue-600';
  const offChip  = 'bg-white text-neutral-800 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700';

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
