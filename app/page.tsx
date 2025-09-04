"use client";
import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";

function PageContent() {
  const params = useSearchParams();
  const panel = (params.get("panel") ?? "chat").toLowerCase();
  const threadId = params.get("threadId") ?? undefined;
  const allowed = new Set(["chat", "profile", "timeline", "alerts", "settings"]);
  const activePanel = allowed.has(panel) ? panel : "chat";
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  return (
    <>
      <section className={activePanel === "chat" ? "block h-full" : "hidden"}>
        <ChatPane inputRef={chatInputRef} />
      </section>

      <section className={activePanel === "profile" ? "block" : "hidden"}>
        <MedicalProfile />
      </section>

      <section className={activePanel === "timeline" ? "block" : "hidden"}>
        <Timeline threadId={threadId} />
      </section>

      <section className={activePanel === "alerts" ? "block" : "hidden"}>
        <AlertsPane />
      </section>

      <section className={activePanel === "settings" ? "block" : "hidden"}>
        <SettingsPane />
      </section>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}
