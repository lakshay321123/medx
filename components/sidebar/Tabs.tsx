"use client";
import { useSearchParams } from "next/navigation";
import NavLink from "@/components/nav/NavLink";

const tabs = [
  { key: "chat", label: "Chat" },
  { key: "profile", label: "Medical Profile" },
  { key: "timeline", label: "Timeline" },
  { key: "alerts", label: "Alerts" },
  { key: "settings", label: "Settings" },
];

export default function Tabs() {
  const params = useSearchParams();
  const current = params.get("panel") ?? "chat";
  return (
    <ul className="mt-3 space-y-1">
      {tabs.map((t) => {
        const active = current === t.key;
        return (
          <li key={t.key}>
            <NavLink
              panel={t.key}
              className={`block w-full text-left rounded-md px-3 py-2 hover:bg-muted text-sm ${active ? "bg-muted font-medium" : ""}`}
            >
              {t.label}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}
