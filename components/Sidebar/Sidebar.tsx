"use client";
import { usePanel } from "@/hooks/usePanel";

export default function Sidebar() {
  const { panel, setPanel } = usePanel();

  const Item = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setPanel(id)}
      className={`w-full text-left px-4 py-2 hover:bg-muted ${panel === id ? "bg-muted" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <Item id="chat" label="Chat" />
      <Item id="imaging" label="Imaging" />
      <Item id="docs" label="Docs" />
      <Item id="settings" label="Settings" />
    </div>
  );
}
