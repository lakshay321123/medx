"use client";
import { useEffect, useRef } from "react";
import PreferencesModal from "@/components/settings/PreferencesModal";
import { useRouter } from "next/navigation";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import { ResearchFiltersProvider } from "@/store/researchFilters";
import AiDocPane from "@/components/panels/AiDocPane";
import DirectoryPane from "@/components/panels/DirectoryPane";
import { useUIStore, type PreferencesTab } from "@/components/hooks/useUIStore";

type Search = Record<string, string | string[] | undefined>;

const getFirst = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const PREFERENCE_TABS = new Set<PreferencesTab>([
  "General",
  "Notifications",
  "Personalization",
  "Connectors",
  "Schedules",
  "Data controls",
  "Security",
  "Account",
]);

const isPreferencesTab = (value: string): value is PreferencesTab =>
  PREFERENCE_TABS.has(value as PreferencesTab);

export default function Page({ searchParams }: { searchParams: Search }) {
  const panelValue = getFirst(searchParams.panel);
  const panel = typeof panelValue === "string" ? panelValue.toLowerCase() : "chat";
  const mainPanel = panel === "settings" || panel === "preferences" ? "chat" : panel;
  const router = useRouter();
  const chatInputRef = useRef<HTMLInputElement>(null);
  const openPrefs = useUIStore((state) => state.openPrefs);

  const requestedTabValue = getFirst(searchParams.tab);
  const requestedTab =
    typeof requestedTabValue === "string" && isPreferencesTab(requestedTabValue)
      ? (requestedTabValue as PreferencesTab)
      : undefined;

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    if (typeof window !== "undefined") {
      import("@/lib/theme").then((mod) => {
        if (cancelled) return;
        dispose = mod.initTheme();
      });
    }
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  useEffect(() => {
    if (panel === "settings" || panel === "preferences") {
      openPrefs(requestedTab);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        params.delete("panel");
        params.delete("tab");
        const query = params.toString();
        router.replace(query ? `/?${query}` : "/", { scroll: false });
      }
    }
  }, [panel, requestedTab, openPrefs, router]);

  const renderPane = () => {
    switch (mainPanel) {
      case "profile":
        return <MedicalProfile />;
      case "timeline":
        return <Timeline />;
      case "ai-doc":
        return <AiDocPane />;
      case "directory":
        return <DirectoryPane />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {mainPanel === "chat" ? (
        <ResearchFiltersProvider>
          <ChatPane inputRef={chatInputRef} />
        </ResearchFiltersProvider>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto mobile-scroll-safe">
          <div className="m-6 rounded-2xl bg-white p-6 ring-1 ring-black/5 md:bg-white/80 md:backdrop-blur dark:bg-slate-950 md:dark:bg-slate-900/60 dark:ring-white/10">
            {renderPane()}
          </div>
        </div>
      )}
      <PreferencesModal />
    </div>
  );
}
