"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const tabs = [
  { key: 'chat', label: 'Chat' },
  { key: 'profile', label: 'Medical Profile' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'settings', label: 'Settings' },
];

export default function Tabs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [current, setCurrent] = useState(params.get("panel") ?? "chat");

  useEffect(() => {
    setCurrent(params.get("panel") ?? "chat");
  }, [params]);

  function onSelect(key: string) {
    const usp = new URLSearchParams(params);
    usp.set("panel", key);
    router.replace(`${pathname}?${usp.toString()}`, { scroll: false });
    setCurrent(key);
    if (key === "chat") window.dispatchEvent(new Event("focus-chat-input"));
  }

  return (
    <ul className="mt-3 space-y-1">
      {tabs.map((t) => (
        <li key={t.key}>
          <button
            onClick={() => onSelect(t.key)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-gray-800 ${current === t.key ? "bg-slate-100 dark:bg-gray-800 font-medium" : ""}`}
          >
            {t.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
