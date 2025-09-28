"use client";
export default function PersonalizationPanel() {
  const Row = ({ title, sub, right }: any) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
  const Btn = (t: string) => (
    <button className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">{t}</button>
  );
  const Toggle = (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-300/60 transition peer-checked:bg-blue-600" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
    </label>
  );
  return (
    <>
      <Row
        title="Tone"
        sub="Plain / Clinical / Friendly"
        right={
          <div className="flex gap-2">
            {Btn("Plain")}
            {Btn("Clinical")}
            {Btn("Friendly")}
          </div>
        }
      />
      <Row title="Compact mode" sub="Denser lists and cards" right={Toggle} />
      <Row title="Show quick actions on Home" right={Toggle} />
    </>
  );
}
