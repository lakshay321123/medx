"use client";

import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

const CHANNELS = [
  { key: "push", label: "Push notifications", sub: "Browser and mobile push alerts" },
  { key: "email", label: "Email notifications", sub: "Receive updates in your inbox" },
  { key: "sms", label: "SMS alerts", sub: "Text messages for critical alerts only" },
] as const;

const CATEGORIES = [
  { key: "med_reminders", label: "Medication reminders", sub: "Dose times, refill alerts", def: true },
  { key: "lab_alerts", label: "Lab result alerts", sub: "Out-of-range values, new results available", def: true },
  { key: "health_score", label: "Health score updates", sub: "Weekly score changes and milestones", def: true },
  { key: "appointment", label: "Appointment reminders", sub: "Upcoming visits and follow-ups", def: true },
  { key: "research", label: "Research updates", sub: "New clinical trials matching your profile", def: false },
  { key: "tips", label: "Health tips", sub: "Personalized wellness suggestions", def: false },
  { key: "family", label: "Family member alerts", sub: "Updates about family members you manage", def: true },
  { key: "system", label: "System notifications", sub: "Account security and policy updates", def: true },
] as const;

const DIGEST_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-300/60 transition peer-checked:bg-blue-600 dark:bg-slate-600" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </label>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/60">
      <div className="mb-1 text-[13px] font-semibold">{title}</div>
      {sub && <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
      {children}
    </div>
  );
}

export default function NotificationsPanel() {
  const { draft, set } = usePrefsDraft();

  const g = (k: string, def: boolean = false) => {
    const v = (draft as any)?.[k];
    return v === undefined ? def : Boolean(v);
  };
  const s = (k: string, v: unknown) => set(k as any, v);

  const digest = ((draft as any)?.["notify.digest"] as string) ?? "off";
  const quietStart = ((draft as any)?.["notify.quiet.start"] as string) ?? "22:00";
  const quietEnd = ((draft as any)?.["notify.quiet.end"] as string) ?? "07:00";

  return (
    <div className="space-y-4 p-5">
      <Section title="Channels" sub="Choose how you receive notifications.">
        {CHANNELS.map((ch) => (
          <div key={ch.key} className="flex items-center justify-between py-2.5 border-b border-black/5 last:border-0 dark:border-white/5">
            <div>
              <div className="text-sm">{ch.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{ch.sub}</div>
            </div>
            <Toggle checked={g(`notify.${ch.key}`, ch.key === "push")} onChange={() => s(`notify.${ch.key}`, !g(`notify.${ch.key}`, ch.key === "push"))} />
          </div>
        ))}
      </Section>

      <Section title="Alert categories" sub="Select which types of notifications to receive.">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex items-center justify-between py-2.5 border-b border-black/5 last:border-0 dark:border-white/5">
            <div>
              <div className="text-sm">{cat.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{cat.sub}</div>
            </div>
            <Toggle checked={g(`notify.cat.${cat.key}`, cat.def)} onChange={() => s(`notify.cat.${cat.key}`, !g(`notify.cat.${cat.key}`, cat.def))} />
          </div>
        ))}
      </Section>

      <Section title="Email digest" sub="Get a summary of your health updates delivered to your inbox.">
        <div className="flex items-center gap-2">
          {DIGEST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => s("notify.digest", opt.value)}
              className={[
                "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition",
                digest === opt.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-black/10 bg-white/70 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Quiet hours" sub="Silence non-critical notifications during these hours.">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">From</label>
            <input
              type="time"
              value={quietStart}
              onChange={(e) => s("notify.quiet.start", e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">To</label>
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => s("notify.quiet.end", e.target.value)}
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
