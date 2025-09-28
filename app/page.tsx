"use client";
import { useEffect, useRef } from "react";
import PreferencesModal from "@/components/settings/PreferencesModal";
import { useRouter } from "next/navigation";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";
import AiDocPane from "@/components/panels/AiDocPane";
import DirectoryPane from "@/components/panels/DirectoryPane";

type Search = { panel?: string };

export default function Page({ searchParams }: { searchParams: Search }) {
  const panel = searchParams.panel?.toLowerCase() || "chat";
  const showPrefs = panel === "settings" || panel === "preferences";
  const defaultTab = (searchParams as any).tab || "General";
  const mainPanel = showPrefs ? "chat" : panel;
  const router = useRouter();
  const chatInputRef = useRef<HTMLInputElement>(null);

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
        onClose={() => router.push("/?panel=chat")}
      />
    </div>
  );
}
