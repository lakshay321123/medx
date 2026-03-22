"use client";
import { useEffect } from "react";

import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

export default function AccountPanel() {
  const { draft, set } = usePrefsDraft();
  const resetWindowIfNeeded = draft.resetWindowIfNeeded as (() => boolean) | undefined;

  useEffect(() => {
    resetWindowIfNeeded?.();
  }, [resetWindowIfNeeded]);

  const plan = (draft.plan as "free" | "pro") ?? "free";
  const promptsUsed = typeof draft.promptsUsed === "number" ? draft.promptsUsed : 0;
  const remaining = Math.max(0, 10 - promptsUsed);

  const Card = ({
    title,
    sub,
    cta,
    primary = false,
    onClick,
  }: {
    title: string;
    sub: string;
    cta: string;
    primary?: boolean;
    onClick?: () => void;
  }) => (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-so-border bg-so-card px-4 py-3 dark:border-so-border dark:bg-so-card">
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-xs text-so-muted dark:text-so-muted">{sub}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={
          primary
            ? "rounded-lg bg-so-accent px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-so-accent/90"
            : "rounded-lg border border-so-border bg-so-card px-3.5 py-1.5 text-sm dark:border-so-border dark:bg-so-card"
        }
      >
        {cta}
      </button>
    </div>
  );

  return (
    <div className="space-y-3 p-5">
      <div className="text-xs opacity-70">Plan</div>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="rounded-full border border-so-border bg-so-card px-2 py-0.5 dark:border-so-border dark:bg-so-card">
          Current: {plan === "pro" ? "Pro" : "Free"}
        </span>
        {plan === "free" && (
          <span className="text-xs text-so-muted">Remaining this window: {remaining}</span>
        )}
      </div>
      <Card title="Free" sub="Up to 10 prompts/month" cta="Stay on Free" onClick={() => set("plan", "free")} />
      <Card
        title="Pro — $1/month"
        sub="Includes access to everything"
        cta="Upgrade to Pro"
        primary
        onClick={() => set("plan", "pro")}
      />
      <div className="h-px w-full bg-black/5 dark:bg-white/10" />
      {/* <div className="flex items-center justify-between"><div className="text-[13px]">Manage subscription</div><button className="rounded-lg border border-so-border bg-so-card px-3 py-1.5 text-sm dark:border-so-border dark:bg-so-card">Open</button></div> */}
      <div className="flex items-center justify-between">
        <div className="text-[13px]">Sign out</div>
        <button
          type="button"
          className="rounded-lg border border-so-border bg-so-card px-3 py-1.5 text-sm dark:border-so-border dark:bg-so-card"
        >
          Sign out
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-red-600">Delete account</div>
        <button
          type="button"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
