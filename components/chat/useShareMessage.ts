"use client";
import { useState, useCallback, useEffect } from "react";
import { exportMessageToPng } from "@/lib/share/snapshot";
import { pushToast } from "@/lib/ui/toast";

type ShareTarget = { id: string; content: string } | null;
type ShareBusy = null | "link" | "download" | "system";

export function useShareMessage() {
  const [shareTarget, setShareTarget] = useState<ShareTarget>(null);
  const [shareBusy, setShareBusy] = useState<ShareBusy>(null);
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({});
  const [systemShareSupported, setSystemShareSupported] = useState(false);
  const [canCopyLink, setCanCopyLink] = useState(false);

  useEffect(() => {
    setSystemShareSupported(typeof navigator !== "undefined" && !!navigator.share);
    setCanCopyLink(typeof navigator !== "undefined" && !!navigator.clipboard);
  }, []);

  const shareAsLink = useCallback(
    async (content: string, messageId: string) => {
      if (shareUrls[messageId]) {
        await navigator.clipboard.writeText(shareUrls[messageId]);
        pushToast("Link copied!");
        return;
      }
      setShareBusy("link");
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        });
        const data = await res.json();
        if (data?.url) {
          setShareUrls((prev) => ({ ...prev, [messageId]: data.url }));
          await navigator.clipboard.writeText(data.url);
          pushToast("Link copied!");
        }
      } catch {
        pushToast("Failed to create share link");
      } finally {
        setShareBusy(null);
      }
    },
    [shareUrls],
  );

  const shareAsImage = useCallback(
    async (messageId: string, messageEl: HTMLDivElement | null) => {
      if (!messageEl) return;
      setShareBusy("download");
      try {
        await exportMessageToPng(messageEl, `opinion-labs-${messageId}.png`);
      } catch {
        pushToast("Failed to export image");
      } finally {
        setShareBusy(null);
      }
    },
    [],
  );

  const shareViaSystem = useCallback(
    async (content: string) => {
      if (!navigator.share) return;
      setShareBusy("system");
      try {
        await navigator.share({ text: content, title: "Opinion Labs" });
      } catch {
        // user cancelled — not an error
      } finally {
        setShareBusy(null);
      }
    },
    [],
  );

  return {
    shareTarget,
    setShareTarget,
    shareBusy,
    shareUrls,
    systemShareSupported,
    canCopyLink,
    shareAsLink,
    shareAsImage,
    shareViaSystem,
  };
}
