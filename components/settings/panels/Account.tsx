"use client";
import { useT } from "@/components/hooks/useI18n";
import { useEffect } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";

export default function AccountPanel(){
  const t = useT();
  const p = usePrefs();

  useEffect(() => {
    p.resetWindowIfNeeded();
  }, [p.resetWindowIfNeeded]);

  const remaining = Math.max(0, 10 - p.promptsUsed);

  const Card = ({title, sub, cta, primary=false, onClick}:{title:string; sub:string; cta:string; primary?:boolean; onClick?:()=>void;}) => (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
      <div><div className="text-[13px] font-semibold">{title}</div><div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div></div>
      <button type="button" onClick={onClick} className={primary ? "rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500" : "rounded-lg border border-black/10 bg-white/70 px-3.5 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"}>{cta}</button>
    </div>
  );

  return (
    <div className="space-y-3 p-5">
      <div className="text-xs opacity-70">Plan</div>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 dark:border-white/10 dark:bg-slate-900/60">{t("Current: {{plan}}", { plan: p.plan === "pro" ? t("Pro") : t("Free") })}</span>
        {p.plan === "free" && <span className="text-xs text-slate-500">{t("Remaining this window: {{count}}", { count: remaining })}</span>}
      </div>
      <Card title={t("Free")} sub={t("Up to 10 prompts/month")} cta={t("Stay on Free")} onClick={()=> p.setPlan("free")} />
      <Card title={t("Pro — $1/month")} sub={t("Includes access to everything")} cta={t("Upgrade to Pro")} primary onClick={()=> p.setPlan("pro")} />
      <div className="h-px w-full bg-black/5 dark:bg-white/10"/>
      {/* <div className="flex items-center justify-between"><div className="text-[13px]">Manage subscription</div><button className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">{t("Open")}</button></div> */}
      <div className="flex items-center justify-between"><div className="text-[13px]">Sign out</div><button type="button" className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60">{t("Sign out")}</button></div>
      <div className="flex items-center justify-between"><div className="text-[13px] text-red-600">Delete account</div><button type="button" className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">{t("Delete")}</button></div>
    </div>
  );
}
