'use client';
import { useState } from "react";
import PreferencesModal from "../settings/PreferencesModal";

export default function SettingsPane() {
  const [open, setOpen] = useState(true);

  return <PreferencesModal open={open} defaultTab="General" onClose={() => setOpen(false)} />;
}
