import { X } from "lucide-react";
import { useT } from "@/components/hooks/useI18n";

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
  const t = useT();
  const translatedHeader = header ? t(header) : undefined;
  const translatedBody = body ? t(body) : undefined;
  const translatedStatus = status ? t(status) : undefined;

  return (
    <div
      role="region"
      aria-label="Welcome"
      className={joinClassNames(
        "relative rounded-lg border p-3 shadow-sm text-sm",
        "bg-blue-600 text-white border-blue-500",
        "dark:bg-blue-700 dark:border-blue-600",
        "break-words",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Dismiss welcome"
        onClick={onDismiss}
        tabIndex={0}
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white/70"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="pr-6">
        <div className="text-[0.95rem] font-semibold">{translatedHeader ?? header}</div>
        <div className="mt-1 leading-snug text-blue-50 dark:text-blue-100">
          {translatedBody ?? body}
        </div>
        {status ? (
          <div className="mt-1 text-xs opacity-90">{translatedStatus ?? status}</div>
        ) : null}
      </div>
    </div>
  );
}
