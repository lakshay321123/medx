"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef } from "react";
import { usePanel } from "@/hooks/usePanel";
import Chat from "@/components/Chat/Chat";
import ImagingPanel from "@/components/Imaging/ImagingPanel";
import DocsPanel from "@/components/Docs/DocsPanel";
import SettingsPanel from "@/components/Settings/SettingsPanel";

export default function HomePage() {
  const { panel } = usePanel("chat");
  const chatInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (panel === "chat" && chatInputRef.current) chatInputRef.current.focus();
  }, [panel]);

  return (
    <>
      {panel === "chat" && <Chat inputRef={chatInputRef} />}
      {panel === "imaging" && <ImagingPanel />}
      {panel === "docs" && <DocsPanel />}
      {panel === "settings" && <SettingsPanel />}
    </>
  );
}
