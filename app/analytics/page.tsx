import dynamic from "next/dynamic";

const HealthAnalytics = dynamic(() => import("@/components/HealthAnalytics"), { ssr: false });
const DailyCheckin = dynamic(() => import("@/components/DailyCheckin"), { ssr: false });
const MedReminders = dynamic(() => import("@/components/MedReminders"), { ssr: false });
const HealthReportExport = dynamic(() => import("@/components/HealthReportExport"), { ssr: false });

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[var(--so-bg,#F2F2F7)] dark:bg-[var(--so-bg,#000)]">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-1">Health Analytics</h1>
          <p className="text-sm text-[var(--so-text-secondary,#8E8E93)]">Your health data, visualized.</p>
        </div>

        {/* Main analytics — score ring, charts, lab panels, AI predictions */}
        <HealthAnalytics />

        {/* Daily Check-in */}
        <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4">
          <DailyCheckin />
        </div>

        {/* Medication Reminders */}
        <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4">
          <MedReminders />
        </div>

        {/* Export Health Report */}
        <div className="flex justify-center pb-8">
          <HealthReportExport />
        </div>
      </div>
    </div>
  );
}
