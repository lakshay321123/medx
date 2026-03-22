import dynamic from "next/dynamic";

const HealthAnalytics = dynamic(() => import("@/components/HealthAnalytics"), { ssr: false });

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[var(--so-bg,#F2F2F7)] dark:bg-[var(--so-bg,#000)]">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-bold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-1">Health Analytics</h1>
        <p className="text-sm text-[var(--so-text-secondary,#8E8E93)] mb-6">Your health data, visualized.</p>
        <HealthAnalytics />
      </div>
    </div>
  );
}
