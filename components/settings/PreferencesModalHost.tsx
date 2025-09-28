"use client";

import { useCallback, useEffect, useState } from "react";
import PreferencesModal, { PreferenceTab } from "./PreferencesModal";

type PreferencesOpenDetail = {
  tab?: PreferenceTab;
};

export default function PreferencesModalHost() {
  const [open, setOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<PreferenceTab>("General");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<PreferencesOpenDetail>).detail;
      setDefaultTab(detail?.tab ?? "General");
      setOpen(true);
    };

    const handleCloseRequest = () => {
      setOpen(false);
      window.dispatchEvent(new Event("preferences-modal:closed"));
    };

    window.addEventListener("preferences-modal:open", handleOpen as EventListener);
    window.addEventListener("preferences-modal:close", handleCloseRequest);

    return () => {
      window.removeEventListener("preferences-modal:open", handleOpen as EventListener);
      window.removeEventListener("preferences-modal:close", handleCloseRequest);
    };
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("preferences-modal:closed"));
    }
  }, []);

  return <PreferencesModal open={open} defaultTab={defaultTab} onClose={handleClose} />;
}
