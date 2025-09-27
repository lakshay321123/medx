type AnimatedDotProps = {
  label?: string;
  ariaHidden?: boolean;
};

export function AnimatedDot({ label = "Working…", ariaHidden = false }: AnimatedDotProps) {
  const accessibilityProps = ariaHidden
    ? { "aria-hidden": true }
    : { role: "status" as const, "aria-label": label };

  return (
    <span
      className="relative inline-flex h-2.5 w-2.5 items-center justify-center"
      {...accessibilityProps}
    >
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/30 motion-safe:animate-[pulse_1.1s_ease-in-out_infinite] motion-reduce:animate-none" aria-hidden="true" />
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
    </span>
  );
}
