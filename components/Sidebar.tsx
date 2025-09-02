'use client';
import { Plus, Search, Settings } from 'lucide-react';

export default function Sidebar({
  onNew, onSearch
}: { onNew: ()=>void; onSearch: (q:string)=>void; }) {
  return (
    <nav className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 hidden md:flex md:flex-col">
      <button className="mx-3 my-3 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center gap-2 focus-ring" onClick={onNew}>
        <Plus size={16}/> <span className="text-sm font-medium">New Chat</span>
      </button>
      <div className="px-3">
        <div className="relative mb-3">
          <input
            placeholder="Search chats"
            onChange={(e)=>onSearch(e.target.value)}
            className="h-10 w-full rounded-lg px-3 bg-slate-100 dark:bg-gray-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-ring"
          />
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        </div>
      </div>
      <div className="mt-auto mb-3">
        <button className="mx-3 h-10 w-[calc(100%-1.5rem)] rounded-lg px-3 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-gray-800 focus-ring">
          <Settings size={16}/> <span className="text-sm">Preferences</span>
        </button>
      </div>
    </nav>
  );
}
