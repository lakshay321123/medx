"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings/store";
import { t } from "@/lib/i18n/dictionaries";

const Card = ({
  title,
  sub,
  cta,
  onClick,
  primary = false,
}: {
  title: string;
  sub: string;
  cta: string;
  onClick?: () => void;
  primary?: boolean;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
    <div>
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
    <button
      onClick={onClick}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-500"
          : "border border-black/10 bg-white/70 dark:border-white/10 dark:bg-slate-900/60"
      }`}
    >
      {cta}
    </button>
  </div>
);

export default function AccountPanel() {
  const { plan, promptsUsed, setPlan, resetWindowIfNeeded, lang } = useSettingsStore((state) => ({
    plan: state.plan,
    promptsUsed: state.promptsUsed,
    setPlan: state.setPlan,
    resetWindowIfNeeded: state.resetWindowIfNeeded,
    lang: state.lang,
  }));

  useEffect(() => {
    resetWindowIfNeeded();
  }, [resetWindowIfNeeded]);

  const remaining = Math.max(0, 10 - promptsUsed);
  const isFree = plan === "free";

  return (
    <div className="space-y-3 p-5">
      <div className="text-xs opacity-70">Plan</div>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 dark:border-white/10 dark:bg-slate-900/60">
          {plan === "pro" ? "Pro" : t(lang, "Current: Free")}
        </span>
        {isFree ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Remaining this window: {remaining}
          </span>
        ) : null}
      </div>
      <Card
        title={t(lang, "Free")}
        sub={t(lang, "Up to 10 prompts/month")}
        cta="Stay on Free"
        onClick={() => setPlan("free")}
      />
      <Card
        title={t(lang, "Pro — $1/month")}
        sub={t(lang, "Includes access to everything")}
        cta={t(lang, "Upgrade to Pro")}
        primary
        onClick={() => setPlan("pro")}
      />
      <div className="h-px w-full bg-black/5 dark:bg-white/10" />
      <div className="flex items-center justify-between">
        <div className="text-[13px]">{t(lang, "Manage subscription")}</div>
        <button className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
          Open
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[13px]">{t(lang, "Sign out")}</div>
        <button className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">
          {t(lang, "Sign out")}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-red-600">{t(lang, "Delete account")}</div>
        <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
          {t(lang, "Delete account")}
        </button>
      </div>
    </div>
  );
}
