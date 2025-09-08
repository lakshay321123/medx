'use client';
import { Search, Settings } from 'lucide-react';
import Tabs from './sidebar/Tabs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createNewThreadId, listThreads, Thread } from '@/lib/chatThreads';
import ThreadKebab from '@/components/chat/ThreadKebab';

export default function Sidebar() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
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
    <aside
      className="sidebar-click-guard hidden md:flex md:flex-col !fixed inset-y-0 left-0 h-full justify-between medx-glass"
      style={{ width: 280, color: "var(--medx-text)" }}
    >
      <div>
        <button
          type="button"
          onClick={handleNew}
          className="w-full text-left px-4 py-3 rounded-xl mb-4 font-medium medx-btn-accent"
        >
          + New Chat
        </button>

        <div className="px-3">
          <div className="relative">
            <input
              className="w-full h-10 rounded-lg pl-3 pr-8 bg-slate-100 dark:bg-gray-800 placeholder:text-slate-500 dark:placeholder:text-slate-500 text-sm"
              placeholder="Search chats"
              onChange={e => handleSearch(e.target.value)}
            />
            <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <Tabs />
        </div>

        <div className="mt-3 space-y-1 px-2 flex-1 overflow-y-auto">
          {filtered.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-1.5 hover:opacity-90 cursor-pointer medx-surface"
              style={{ color: "var(--medx-text)" }}
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
        </div>
      </div>

      <button
        type="button"
        className="mx-3 mt-auto mb-3 h-10 rounded-lg px-3 text-left hover:bg-slate-100 dark:hover:bg-gray-800 flex items-center gap-2"
      >
        <Settings size={16} /> Preferences
      </button>
    </aside>
  );
}
