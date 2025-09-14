'use client';

const LABELS: Record<string,string> = {
  symptoms: "Symptoms",
  causes: "Causes",
  home_care: "Home care",
  prevention: "Prevention",
  when_to_seek_help: "When to see a doctor",
  red_flags: "Red flags",
  treatment: "Treatment",
  faq: "FAQs",
};

export function FollowUpChips({ options, onPick }:{
  options: string[]; onPick: (opt: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          className="rounded-full border px-3 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => onPick(opt)}
        >
          {LABELS[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}
