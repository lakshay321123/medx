"use client";
import Preferences from "../settings/Preferences";
import { MemorySettings } from "../settings/MemorySettings";
import { LanguageSettings } from "../settings/LanguageSettings";

export default function SettingsPane() {
  return (
    <div className="space-y-4 p-4">
      <LanguageSettings />
      <Preferences />
      <MemorySettings />
    </div>
  );
}
