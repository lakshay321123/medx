"use client";
import { useRouter, useSearchParams } from "next/navigation";

const tabs = [
  { key: "chat",     label: "Chat" },
  { key: "profile",  label: "Medical Profile" },
  { key: "timeline", label: "Timeline" },
  { key: "alerts",   label: "Alerts" },
  { key: "settings", label: "Settings" },
] as const;

export default function SidebarTabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const active   = (sp.get("panel") ?? "chat") as typeof tabs[number]["key"];
  const threadId = sp.get("threadId") ?? "default";

  const go = (key: typeof tabs[number]["key"]) => {
    router.replace(`/?panel=${key}&threadId=${threadId}`, { scroll: false });
  };

  return (
    <div className="mt-2 flex flex-col gap-1">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => go(t.key)}
          className={`text-left px-3 py-2 rounded
            ${active === t.key
              ? "bg-neutral-200 dark:bg-neutral-800"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-900"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
