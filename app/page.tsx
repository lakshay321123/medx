"use client";
import { useEffect, useRef } from "react";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";
import AiDocPane from "@/components/panels/AiDocPane";
import DirectoryPane from "@/components/panels/DirectoryPane";
import PreferencesModal from "@/components/settings/PreferencesModal";
import { useRouter, useSearchParams } from "next/navigation";

type Search = { panel?: string; tab?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const router = useRouter();
  const params = useSearchParams();
  const panel = searchParams.panel?.toLowerCase() || "chat";
  const showPrefs = panel === "settings" || panel === "preferences";
  const defaultTab = searchParams.tab ?? "General";
  const mainPanel = showPrefs ? "chat" : panel;
  const chatInputRef = useRef<HTMLInputElement>(null);
  const handleClosePreferences = () => {
    const next = new URLSearchParams(params.toString());
    next.set("panel", "chat");
    next.delete("tab");
    router.push(`/?${next.toString()}`);
  };

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  const renderPane = () => {
    switch (mainPanel) {
      case "profile":
        return <MedicalProfile />;
      case "timeline":
        return <Timeline />;
      case "alerts":
        return <AlertsPane />;
      case "settings":
        return <SettingsPane />;
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
          <div className="m-6 rounded-2xl p-6 ring-1 ring-black/5 bg-white/80 dark:bg-slate-900/60 dark:ring-white/10">
            {renderPane()}
          </div>
        </div>
      )}
      <PreferencesModal
        open={showPrefs}
        defaultTab={defaultTab as any}
        onClose={handleClosePreferences}
      />
    </div>
  );
}
