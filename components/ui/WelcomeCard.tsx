import { X } from "lucide-react";

export type WelcomeCardProps = {
  header: string;
  body: string;
  status?: string;
  onDismiss: () => void;
  className?: string;
};

function joinClassNames(...values: (string | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export default function WelcomeCard({
  header,
  body,
  status,
  onDismiss,
  className,
}: WelcomeCardProps) {
  return (
    <div
      role="region"
      aria-label="Welcome"
      className={joinClassNames(
        "relative rounded-lg border p-3 shadow-sm text-sm",
        "bg-blue-50 border-blue-100 text-slate-700",
        "dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100",
        "break-words",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Dismiss welcome"
        onClick={onDismiss}
        tabIndex={0}
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="pr-6">
        <div className="text-[0.95rem] font-semibold">{header}</div>
        <div className="mt-1 leading-snug">{body}</div>
        {status ? <div className="mt-1 text-xs opacity-80">{status}</div> : null}
      </div>
    </div>
  );
}
