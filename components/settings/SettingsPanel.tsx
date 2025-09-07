import Preferences from "./Preferences";
import { MemorySettings } from "@/components/settings/MemorySettings";

export default function SettingsPanel() {
  return (
    <div className="space-y-4">
      <Preferences />
      <MemorySettings /> {/* show Smart Memory toggle */}
    </div>
  );
}

