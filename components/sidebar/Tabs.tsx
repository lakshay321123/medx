"use client";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const tabs = [
  { key: "chat", label: "Chat" },
  { key: "profile", label: "Medical Profile" },
  { key: "timeline", label: "Timeline" },
  { key: "alerts", label: "Alerts" },
  { key: "settings", label: "Settings" },
];

function NavLink({ panel, children }: { panel: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const threadId = params.get("threadId") ?? undefined;
  const query = threadId ? { panel, threadId } : { panel };

  const hrefObj = { pathname, query };
  const hrefStr = `${pathname}?panel=${panel}${threadId ? `&threadId=${encodeURIComponent(threadId)}` : ""}`;

  const active = ((params.get("panel") ?? "chat").toLowerCase()) === panel;

  const softNav = () => {
    try {
      router.push(hrefObj as any, { scroll: false });
      // verify panel changed soon; otherwise hard-fallback
      requestAnimationFrame(() => {
        const now = (new URLSearchParams(location.search).get("panel") ?? "chat").toLowerCase();
        if (now !== panel.toLowerCase()) location.assign(hrefStr);
      });
    } catch {
      location.assign(hrefStr);
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    // primary click only; allow cmd/ctrl/shift/alt & middle/right clicks
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();          // force client-side nav to preserve state
    softNav();
  };

  return (
    <Link
      href={hrefObj}
      prefetch={false}
      onClickCapture={onClickCapture}
      className={`block w-full text-left rounded-md px-3 py-2 hover:bg-muted text-sm ${active ? "bg-muted font-medium" : ""}`}
      data-testid={`nav-${panel}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
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
