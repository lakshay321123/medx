"use client";
const Connector = ({ name, sub }: { name: string; sub: string }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-4">
    <div>
      <div className="text-[13px] font-semibold">{name}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
    <button className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
      Connect
    </button>
  </div>
);
export default function ConnectorsPanel() {
  return (
    <>
      <Connector name="Fitbit" sub="Steps, HR, sleep" />
      <Connector name="Apple Health" sub="iOS health data" />
      <Connector name="Google Fit" sub="Android health data" />
    </>
  );
}
