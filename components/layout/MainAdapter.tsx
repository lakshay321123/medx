"use client";

import { useEffect, useRef } from "react";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Get a quick second opinion</h1>
        <ul className="mt-3 list-disc pl-6 space-y-1 text-base opacity-90">
          {HERO_POINTS.map(point => (
            <li key={point}>{point}</li>
          ))}
          <li>{statusLine}</li>
        </ul>
      </div>

      {activePanel === "chat" && (
        <section className="block h-full">
          <ResearchFiltersProvider>
            <ChatPane inputRef={chatInputRef} showHeader={false} />
          </ResearchFiltersProvider>
        </section>
      )}

      {activePanel === "profile" && <MedicalProfile />}
      {activePanel === "timeline" && <Timeline />}
      {activePanel === "alerts" && <AlertsPane />}
      {activePanel === "settings" && <SettingsPane />}
      {activePanel === "ai-doc" && <AiDocPane />}
    </div>
  );
}
