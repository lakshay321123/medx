"use client";
import { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatPane from "@/components/panels/ChatPane";
import MedicalProfile from "@/components/panels/MedicalProfile";
import Timeline from "@/components/panels/Timeline";
import AlertsPane from "@/components/panels/AlertsPane";
import SettingsPane from "@/components/panels/SettingsPane";

function PageInner() {
  const params = useSearchParams();

  const panelRaw = (params.get("panel") ?? "chat").toLowerCase();
  const allowed = new Set(["chat", "profile", "timeline", "alerts", "settings"]);
  const panel = allowed.has(panelRaw) ? panelRaw : "chat";

  const threadId = params.get("threadId") ?? undefined;

  const chatInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener("focus-chat-input", handler);
    return () => window.removeEventListener("focus-chat-input", handler);
  }, []);

  return (
    <>
      <section className={panel === "chat" ? "block h-full" : "hidden"}>
        <ChatPane inputRef={chatInputRef} />
      </section>

      <section className={panel === "profile" ? "block" : "hidden"}>
        <MedicalProfile />
      </section>

      <section className={panel === "timeline" ? "block" : "hidden"}>
        <Timeline threadId={threadId} />
      </section>

      <section className={panel === "alerts" ? "block" : "hidden"}>
        <AlertsPane />
      </section>

      <section className={panel === "settings" ? "block" : "hidden"}>
        <SettingsPane />
      </section>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}

