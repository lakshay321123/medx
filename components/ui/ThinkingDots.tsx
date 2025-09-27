'use client';

type ThinkingDotsProps = {
  active: boolean;
  label?: string;
  className?: string;
};

export function ThinkingDots({ active, label = 'Analyzing…', className }: ThinkingDotsProps) {
  const classes = [
    'inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-300 transition-opacity duration-150',
    active ? 'opacity-100' : 'opacity-0 pointer-events-none',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      aria-live="polite"
      aria-busy={active}
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-slate-400/90 dark:bg-slate-500/80 animate-[think-dot_1.1s_ease-in-out_infinite]" />
      </span>
      <span>{label}</span>
      <style jsx>{`
        @keyframes think-dot {
          0%, 100% { opacity: 0.25; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

export default ThinkingDots;
