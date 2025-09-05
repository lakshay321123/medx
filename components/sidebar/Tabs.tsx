"use client";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Tab = {
  key: string;
  label: string;
  panel: string;
  threadId?: string;
  context?: string;
};

const tabs: Tab[] = [
  { key: "chat", label: "Chat", panel: "chat" },
  {
    key: "ai-doc",
    label: "AI Doc",
    panel: "chat",
    threadId: "med-profile",
    context: "profile",
  },
  { key: "profile", label: "Medical Profile", panel: "profile" },
  { key: "timeline", label: "Timeline", panel: "timeline" },
  { key: "alerts", label: "Alerts", panel: "alerts" },
  { key: "settings", label: "Settings", panel: "settings" },
];

function NavLink({
  panel,
  children,
  threadId: threadIdProp,
  context,
}: {
  panel: string;
  children: React.ReactNode;
  threadId?: string;
  context?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentThread = params.get("threadId") ?? undefined;
  const threadId =
    threadIdProp !== undefined
      ? threadIdProp
      : panel === "chat"
      ? undefined
      : currentThread;
  const query: any = { panel };
  if (threadId) query.threadId = threadId;
  if (context) query.context = context;

  const hrefObj = { pathname, query };
  const hrefStr = `${pathname}?panel=${panel}${threadId ? `&threadId=${encodeURIComponent(threadId)}` : ""}${context ? `&context=${encodeURIComponent(context)}` : ""}`;

  const active =
    ((params.get("panel") ?? "chat").toLowerCase()) === panel &&
    ((threadIdProp ? params.get("threadId") === threadIdProp : !params.get("threadId")));

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
          <NavLink panel={t.panel} threadId={t.threadId} context={t.context}>
            {t.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
