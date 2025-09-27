"use client";

type RowProps = {
  label: string;
  value: string;
  emphasize?: boolean;
};

export default function Row({ label, value, emphasize = false }: RowProps) {
  const trimmed = value.trim();
  const isPlaceholder = trimmed === "—" || trimmed === "No data available";
  const classes = [
    "text-[14px] leading-6",
    isPlaceholder ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-100",
    emphasize && !isPlaceholder ? "font-semibold" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <span className={classes}>{value}</span>
    </div>
  );
}
