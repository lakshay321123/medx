'use client';
import { Search, Settings } from 'lucide-react';
import Tabs from './sidebar/Tabs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createNewThreadId, listThreads, Thread } from '@/lib/chatThreads';
import ThreadKebab from '@/components/chat/ThreadKebab';

type SidebarDrawerProps = {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
};

export function SidebarDrawer({ open, onClose, children }: SidebarDrawerProps) {
  const handleClose = () => {
    try {
      onClose?.();
    } catch (error) {
      console.error('SidebarDrawer close error', error);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ease-out md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden={!open}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] transform border-r border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] shadow-xl transition-transform duration-200 ease-out dark:border-[#1E3A5F] dark:bg-[#0F1B2D] dark:text-[#E6EDF7] md:static md:block md:translate-x-0 md:w-72 md:border-r md:border-[#E2E8F0] md:bg-[#F8FAFC] md:text-[#0F172A] md:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto px-4 pb-6 pt-4 md:h-auto md:overflow-visible md:px-0 md:pt-0">
          {children}
        </div>
      </aside>
    </>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [aidocThreads, setAidocThreads] = useState<{ id: string; title: string | null }[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const load = () => setThreads(listThreads());
    load();
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', load);
    window.addEventListener('chat-threads-updated', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('chat-threads-updated', load);
    };
  }, []);

  useEffect(() => {
    fetch('/api/aidoc/threads')
      .then(r => r.json())
      .then(setAidocThreads)
      .catch(() => {});
  }, []);

  const handleNew = () => {
    const id = createNewThreadId();
    router.push(`/?panel=chat&threadId=${id}`);
  };
  const handleSearch = (q: string) => {
    setQ(q);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-chats', { detail: q }));
    }
  };
  const filtered = threads.filter(t => (t.title ?? '').toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="sidebar-click-guard flex h-full w-full flex-col gap-4 px-4 pt-6 pb-0 text-sm text-[#0F172A] dark:text-[#E6EDF7]">
      <button
        type="button"
        onClick={handleNew}
        className="w-full rounded-full bg-[#2563EB] px-4 py-2.5 text-left font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB]"
      >
        + New Chat
      </button>

      <div>
        <div className="relative">
          <input
            className="h-10 w-full rounded-full border border-[#E2E8F0] bg-white pl-3 pr-8 text-sm text-[#0F172A] placeholder:text-[#64748B] transition focus:border-[#2563EB] focus:outline-none dark:border-[#1E3A5F] dark:bg-[#0F1B2D] dark:text-[#E6EDF7] dark:placeholder:text-[#94A3B8] dark:focus:border-[#3B82F6]"
            placeholder="Search chats"
            onChange={e => handleSearch(e.target.value)}
          />
          <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]" />
        </div>
        <Tabs />
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
        {filtered.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm shadow-sm transition hover:border-[#2563EB] hover:shadow-md dark:border-[#1E3A5F] dark:bg-[#13233D] dark:hover:border-[#3B82F6]"
          >
            <button
              onClick={() => router.push(`/?panel=chat&threadId=${t.id}`)}
              className="flex-1 truncate text-left font-medium text-[#0F172A] transition hover:text-[#2563EB] dark:text-[#E6EDF7] dark:hover:text-[#3B82F6]"
              title={t.title}
            >
              {t.title}
            </button>
            <ThreadKebab
              id={t.id}
              title={t.title}
              onRenamed={nt => {
                setThreads(prev =>
                  prev.map(x => (x.id === t.id ? { ...x, title: nt, updatedAt: Date.now() } : x))
                );
              }}
              onDeleted={() => {
                setThreads(prev => prev.filter(x => x.id !== t.id));
              }}
            />
          </div>
        ))}

        {aidocThreads.length > 0 && (
          <div className="mt-4">
            <div className="px-2 text-xs font-semibold uppercase tracking-wide text-[#334155] dark:text-[#94A3B8]">AI Doc</div>
            {aidocThreads.map(t => (
              <div
                key={t.id}
                className="mt-2 flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm shadow-sm transition hover:border-[#2563EB] hover:shadow-md dark:border-[#1E3A5F] dark:bg-[#13233D] dark:hover:border-[#3B82F6]"
              >
                <button
                  onClick={() => router.push(`/?panel=ai-doc&threadId=${t.id}&context=profile`)}
                  className="flex-1 truncate text-left font-medium text-[#0F172A] transition hover:text-[#2563EB] dark:text-[#E6EDF7] dark:hover:text-[#3B82F6]"
                  title={t.title ?? ''}
                >
                  {t.title ?? 'AI Doc — New Case'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="sticky bottom-0 left-0 -mx-4 border-t border-[#E2E8F0] bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur-sm dark:border-[#1E3A5F] dark:bg-[#0F1B2D]/95">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] shadow-sm transition hover:border-[#2563EB] hover:text-[#2563EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] dark:border-[#1E3A5F] dark:bg-[#13233D] dark:text-[#E6EDF7] dark:hover:border-[#3B82F6] dark:hover:text-[#3B82F6] dark:focus-visible:outline-[#3B82F6]"
          >
            <Settings size={14} /> Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
