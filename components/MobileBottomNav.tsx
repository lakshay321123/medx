"use client";
import { MessageSquare, User, Activity, FileText, Settings } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare, panel: "chat" },
  { id: "profile", label: "Profile", icon: User, panel: "profile" },
  { id: "timeline", label: "Timeline", icon: Activity, panel: "timeline" },
  { id: "directory", label: "Directory", icon: FileText, panel: "directory" },
  { id: "settings", label: "Settings", icon: Settings, panel: "settings" },
];

export default function MobileBottomNav() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = searchParams.get("panel") || "chat";

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-[var(--so-bg,#fff)] dark:bg-[var(--so-bg,#000)] backdrop-blur-xl bg-opacity-90 safe-area-inset">
      <div className="flex items-center justify-around py-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.panel;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => router.push(`/?panel=${tab.panel}`)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                isActive ? "text-[var(--so-accent,#06B6D4)]" : "text-[var(--so-text-secondary,#8E8E93)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
