"use client";

import clsx from "clsx";
import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

const CHANNELS = [
  { key: "push", label: "Push notifications", sub: "Browser and mobile push alerts", def: true },
  { key: "email", label: "Email notifications", sub: "Receive updates in your inbox", def: false },
  { key: "sms", label: "SMS alerts", sub: "Text messages for critical alerts only", def: false },
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
      <span className="h-6 w-11 rounded-full bg-so-border transition peer-checked:bg-so-accent dark:bg-so-card" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </label>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-so-border bg-so-card p-4 dark:border-so-border dark:bg-so-card">
      <div className="mb-1 text-[13px] font-semibold">{title}</div>
      {sub && <div className="mb-3 text-xs text-so-muted dark:text-so-muted">{sub}</div>}
      {children}
    </div>
  );
}

export default function NotificationsPanel() {
  const { draft, set } = usePrefsDraft();

  const getBoolean = (key: string, fallback: boolean): boolean => {
    const raw = (draft as Record<string, unknown>)?.[key];
    return raw === undefined ? fallback : Boolean(raw);
  };
  const setKey = (key: string, value: unknown) => set(key as keyof typeof draft, value);

  const digest = String((draft as Record<string, unknown>)?.["notify.digest"] ?? "off");
  const quietStart = String((draft as Record<string, unknown>)?.["notify.quiet.start"] ?? "22:00");
  const quietEnd = String((draft as Record<string, unknown>)?.["notify.quiet.end"] ?? "07:00");

  return (
    <div className="space-y-4 p-5">
      <Section title="Channels" sub="Choose how you receive notifications.">
        {CHANNELS.map((ch) => (
          <div key={ch.key} className="flex items-center justify-between py-2.5 border-b border-so-border last:border-0 dark:border-so-border">
            <div>
              <div className="text-sm">{ch.label}</div>
              <div className="text-xs text-so-muted dark:text-so-muted">{ch.sub}</div>
            </div>
            <Toggle checked={getBoolean(`notify.${ch.key}`, ch.def)} onChange={() => setKey(`notify.${ch.key}`, !getBoolean(`notify.${ch.key}`, ch.def))} />
          </div>
        ))}
      </Section>

      <Section title="Alert categories" sub="Select which types of notifications to receive.">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex items-center justify-between py-2.5 border-b border-so-border last:border-0 dark:border-so-border">
            <div>
              <div className="text-sm">{cat.label}</div>
              <div className="text-xs text-so-muted dark:text-so-muted">{cat.sub}</div>
            </div>
            <Toggle checked={getBoolean(`notify.cat.${cat.key}`, cat.def)} onChange={() => setKey(`notify.cat.${cat.key}`, !getBoolean(`notify.cat.${cat.key}`, cat.def))} />
          </div>
        ))}
      </Section>

      <Section title="Email digest" sub="Get a summary of your health updates delivered to your inbox.">
        <div className="flex items-center gap-2">
          {DIGEST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setKey("notify.digest", opt.value)}
              className={clsx(
                "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition",
                digest === opt.value
                  ? "border-so-accent bg-so-accent text-white"
                  : "border-so-border bg-so-card text-so-text hover:bg-so-bg dark:border-so-border dark:bg-so-card dark:text-so-text dark:hover:bg-so-accent/10"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Quiet hours" sub="Silence non-critical notifications during these hours.">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-so-muted">From</label>
            <input
              type="time"
              value={quietStart}
              onChange={(e) => setKey("notify.quiet.start", e.target.value)}
              className="rounded-lg border border-so-border bg-white px-2.5 py-1.5 text-sm dark:border-so-border dark:bg-so-card dark:text-so-text"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-so-muted">To</label>
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => setKey("notify.quiet.end", e.target.value)}
              className="rounded-lg border border-so-border bg-white px-2.5 py-1.5 text-sm dark:border-so-border dark:bg-so-card dark:text-so-text"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
