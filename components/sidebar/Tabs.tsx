"use client";
import { useSearchParams, usePathname } from "next/navigation";

const tabs = [
  { key: "chat", label: "Chat" },
  { key: "profile", label: "Medical Profile" },
  { key: "timeline", label: "Timeline" },
  { key: "alerts", label: "Alerts" },
  { key: "settings", label: "Settings" },
];

function NavLink({ panel, children }: { panel: string; children: React.ReactNode }) {
  const params = useSearchParams();
  const pathname = usePathname();

  // build href string explicitly (no Link / no router)
  const qs = new URLSearchParams();
  qs.set("panel", panel);
  const threadId = params.get("threadId");
  if (threadId) qs.set("threadId", threadId);
  const href = `${pathname}?${qs.toString()}`;

  const active = ((params.get("panel") ?? "chat").toLowerCase()) === panel;

  // hard-fallback if someone prevents default click
  const clickCapture = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // only primary click without modifiers
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // if any ancestor already prevented default, force navigate
    if (e.defaultPrevented) {
      window.location.assign(href);
    }
  };

  // final guard in bubble phase (if something prevents after capture)
  const clickBubble = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.defaultPrevented) {
      window.location.assign(href);
    }
  };

  return (
    <a
      href={href}
      onClickCapture={clickCapture}
      onClick={clickBubble}
      className={`block w-full text-left rounded-md px-3 py-2 hover:bg-muted text-sm ${
        active ? "bg-muted font-medium" : ""
      }`}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </a>
  );
}

export default function Tabs() {
  return (
    <ul className="mt-3 space-y-1">
      {tabs.map((t) => (
        <li key={t.key}>
          <NavLink panel={t.key}>{t.label}</NavLink>
        </li>
      ))}
    </ul>
  );
}
