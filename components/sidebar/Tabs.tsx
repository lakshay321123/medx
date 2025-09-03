"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useUI } from "@/lib/store/ui";
import { useEffect } from "react";

const tabs = [
  { key: "chat", label: "Chat" },
  { key: "profile", label: "Medical Profile" },
  { key: "timeline", label: "Timeline" },
  { key: "alerts", label: "Alerts" },
  { key: "settings", label: "Settings" },
] as const;

export default function Tabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const { setPanel, hydrate } = useUI();

  useEffect(() => { hydrate(); }, [hydrate]);

  function go(key: typeof tabs[number]["key"]) {
    const threadId = sp.get("threadId") ?? "default";
    setPanel(key as any);
    router.replace(`/?panel=${key}&threadId=${threadId}`, { scroll: false });
  }

  const active = sp.get("panel") ?? "chat";

  return (
    <div className="mt-2 flex flex-col gap-1">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => go(t.key)}
          className={`text-left px-3 py-2 rounded ${active === t.key ? "bg-neutral-200 dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-900"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
