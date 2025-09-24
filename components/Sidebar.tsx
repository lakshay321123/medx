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
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] transform bg-slate-950 border-r border-slate-800 transition-transform duration-200 ease-out md:static md:translate-x-0 md:w-72 md:border-r md:border-slate-200/60 md:bg-transparent md:shadow-none ${
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
    window.dispatchEvent(new CustomEvent('search-chats', { detail: q }));
  };
  const filtered = threads.filter(t => t.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="sidebar-click-guard flex h-full w-full flex-col gap-4 px-4 pt-6 pb-0 text-medx">
      <button
        type="button"
        onClick={handleNew}
        className="w-full rounded-full bg-blue-600 px-4 py-2.5 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
      >
        + New Chat
      </button>

      <div>
        <div className="relative">
          <input
            className="w-full h-10 rounded-full border border-black/10 bg-white/70 pl-3 pr-8 text-sm text-slate-700 placeholder:text-slate-500 backdrop-blur dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Search chats"
            onChange={e => handleSearch(e.target.value)}
          />
          <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
        </div>
        <Tabs />
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
        {filtered.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-xl border border-black/5 bg-white/70 px-4 py-2.5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
          >
            <button
              onClick={() => router.push(`/?panel=chat&threadId=${t.id}`)}
              className="flex-1 text-left truncate text-sm"
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
            <div className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">AI Doc</div>
            {aidocThreads.map(t => (
              <div
                key={t.id}
                className="mt-2 flex items-center gap-2 rounded-xl border border-black/5 bg-white/70 px-4 py-2.5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
              >
                <button
                  onClick={() => router.push(`/?panel=ai-doc&threadId=${t.id}&context=profile`)}
                  className="flex-1 text-left truncate text-sm"
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
        <div className="sticky bottom-0 left-0 -mx-4 border-t border-black/5 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/50">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <Settings size={14} /> Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
