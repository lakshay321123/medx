"use client";

const baseClass = "inline-flex items-center gap-1 text-current";
const dotClass = "h-2 w-2 rounded-full bg-current opacity-50";

export function ThinkingDots({ className }: { className?: string }) {
  const classes = className ? `${baseClass} ${className}` : baseClass;
  return (
    <span className={classes} aria-hidden="true">
      <span className={`${dotClass} animate-pulse`} style={{ animationDelay: "0ms" }} />
      <span className={`${dotClass} animate-pulse`} style={{ animationDelay: "150ms" }} />
      <span className={`${dotClass} animate-pulse`} style={{ animationDelay: "300ms" }} />
    </span>
  );
}

export default ThinkingDots;
