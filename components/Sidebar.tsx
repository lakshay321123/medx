'use client';
import { Plus, Search, Settings } from 'lucide-react';
import Tabs from './sidebar/Tabs';

export default function Sidebar() {
  const handleNew = () => window.dispatchEvent(new Event('new-chat'));
  const handleSearch = (q: string) => window.dispatchEvent(new CustomEvent('search-chats', { detail: q }));
  return (
    <nav
      className="sidebar-click-guard hidden md:flex md:flex-col w-64 shrink-0 md:sticky md:top-0 md:h-screen bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 z-10"
      role="navigation"
    >
      <button type="button" onClick={handleNew} className="mx-3 my-3 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center gap-2">
        <Plus size={16} /> New Chat
      </button>

      <div className="px-3">
        <div className="relative">
          <input className="w-full h-10 rounded-lg pl-3 pr-8 bg-slate-100 dark:bg-gray-800 placeholder:text-slate-500 dark:placeholder:text-slate-500 text-sm" placeholder="Search chats" onChange={e => handleSearch(e.target.value)} />
          <Search size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
        <Tabs />
      </div>

      <div className="mt-3 space-y-1 px-2 flex-1 overflow-y-auto">
        {/* history items (keep existing) */}
      </div>

      <button type="button" className="mx-3 mt-auto mb-3 h-10 rounded-lg px-3 text-left hover:bg-slate-100 dark:hover:bg-gray-800 flex items-center gap-2">
        <Settings size={16} /> Preferences
      </button>
    </nav>
  );
}
