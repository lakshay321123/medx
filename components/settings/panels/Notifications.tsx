"use client";
export default function NotificationsPanel() {
  const Row = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-slate-300/60 transition peer-checked:bg-blue-600" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </label>
    </div>
  );
  return (
    <>
      <Row title="Medication reminders" sub="Schedule push reminders." />
      <Row title="Lab report updates" sub="Alert when new results arrive." />
      <Row title="Weekly health digest" sub="Summary of activity & trends." />
    </>
  );
}
