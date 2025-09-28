'use client';

import { useEffect } from "react";
import type { PreferenceTab } from "../settings/PreferencesModal";

const DATA_CONTROLS_TAB: PreferenceTab = "Data controls";

export default function SettingsPane() {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("preferences-modal:open", { detail: { tab: DATA_CONTROLS_TAB } })
    );

    return () => {
      window.dispatchEvent(new Event("preferences-modal:close"));
    };
  }, []);

  return null;
}
