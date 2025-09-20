"use client";

import { useEffect, useMemo, useRef } from "react";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";
import AiDocPane from "@/components/panels/AiDocPane";
import { ResearchFiltersProvider } from "@/store/researchFilters";
import type { UiState } from "./ShellLive";

const HERO_POINTS = [
  "Upload labs, prescriptions, or scans",
  "Ask questions in plain English",
];

type Props = {
  ui: UiState;
  panel: string;
};

export default function MainAdapter({ ui, panel }: Props) {
  const chatInputRef = useRef<HTMLInputElement>(null);
  const activePanel = panel.toLowerCase();

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  const statusLine = ui.aiDoc
    ? "AI Doc is active — Click any other mode to switch back"
    : ui.research
      ? "Research assist: ON"
      : "Research assist: OFF";

  const panelContent = useMemo(() => {
    switch (activePanel) {
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
      default:
        return null;
    }
  }, [activePanel]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0">
        <h1 className="text-3xl font-semibold">Get a quick second opinion</h1>
        <ul className="mt-3 list-disc pl-6 space-y-1 text-base opacity-90">
          {HERO_POINTS.map(point => (
            <li key={point}>{point}</li>
          ))}
          <li>{statusLine}</li>
        </ul>
      </div>

      <div className="mt-6 flex-1 min-h-0">
        {activePanel === "chat" ? (
          <div className="flex h-full flex-col">
            <ResearchFiltersProvider>
              <ChatPane inputRef={chatInputRef} showHeader={false} />
            </ResearchFiltersProvider>
          </div>
        ) : (
          <div className="h-full overflow-y-auto pr-1">{panelContent}</div>
        )}
      </div>
    </div>
  );
}
