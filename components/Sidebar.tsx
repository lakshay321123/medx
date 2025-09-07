'use client';
import { Plus, Search, Settings } from 'lucide-react';
import Tabs from './sidebar/Tabs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createNewThreadId, listThreads, Thread } from '@/lib/chatThreads';

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
    <nav className="sidebar-click-guard hidden md:flex md:flex-col !fixed inset-y-0 left-0 w-64 rounded-r-2xl border-r border-[var(--g300)] bg-[var(--g50)] shadow-sm dark:bg-[#111827] dark:text-[#F9FAFB] dark:border-white/25 p-3">
      <button
        type="button"
        onClick={handleNew}
        className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm border border-dashed border-[var(--g300)] dark:border-white/25"
      >
        <Plus size={16} /> New Chat
      </button>

      <div className="px-3">
        <div className="relative">
          <input className="w-full h-10 rounded-lg pl-3 pr-8 bg-white text-inherit placeholder:text-slate-500 border border-[var(--g300)] dark:bg-[#1F2937] dark:text-[#F9FAFB] dark:border-white/25 dark:placeholder:text-[#E5E7EB] text-sm" placeholder="Search chats" onChange={e => handleSearch(e.target.value)} />
          <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
        <Tabs />
      </div>

      <div className="mt-3 space-y-1 px-2 flex-1 overflow-y-auto">
        {filtered.map(t => (
          <button
            key={t.id}
            onClick={() => router.push(`/?panel=chat&threadId=${t.id}`)}
            className="w-full text-left rounded-md px-2 py-1 text-sm hover:bg-[var(--g50)] dark:hover:bg-white/10"
          >
            {t.title}
          </button>
        ))}
      </div>

      <button type="button" className="mx-3 mt-auto mb-3 h-10 rounded-lg px-3 text-left hover:bg-slate-100 dark:hover:bg-gray-800 flex items-center gap-2">
        <Settings size={16} /> Preferences
      </button>
    </nav>
  );
}
