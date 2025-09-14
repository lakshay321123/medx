'use client';

import { useEffect, useRef } from 'react';
import ChatPane from '@/components/panels/ChatPane';
import MedicalProfile from '@/components/panels/MedicalProfile';
import Timeline from '@/components/panels/Timeline';
import AlertsPane from '@/components/panels/AlertsPane';
import SettingsPane from '@/components/panels/SettingsPane';
import AiDocPane from '@/components/panels/AiDocPane';
import { ResearchFiltersProvider } from '@/store/researchFilters';

interface PanelRouterProps {
  searchParams?: { panel?: string };
}

export default function PanelRouter({ searchParams }: PanelRouterProps) {
  const panel = searchParams?.panel?.toLowerCase();
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => chatInputRef.current?.focus();
    window.addEventListener('focus-chat-input', handler);
    return () => window.removeEventListener('focus-chat-input', handler);
  }, []);

  if (!panel) return null;

  return (
    <main className="flex-1 overflow-y-auto content-layer">
      {panel === 'chat' && (
        <section className="block h-full">
          <ResearchFiltersProvider>
            <ChatPane inputRef={chatInputRef} />
          </ResearchFiltersProvider>
        </section>
      )}
      {panel === 'profile' && <MedicalProfile />}
      {panel === 'timeline' && <Timeline />}
      {panel === 'alerts' && <AlertsPane />}
      {panel === 'settings' && <SettingsPane />}
      {panel === 'ai-doc' && <AiDocPane />}
    </main>
  );
}

