'use client';
import Preferences from "../settings/Preferences";
import { MemorySettings } from "../settings/MemorySettings";

export default function SettingsPane() {
  return (
    <div className="p-4 space-y-4">
      <Preferences />
      <MemorySettings />
    </div>
  );
}
