'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';

type Props = {
  onNew: () => void;
  onSearch: (query: string) => void;
};

export default function Sidebar({ onNew, onSearch }: Props){
  const [query, setQuery] = useState('');
  return (
    <aside className="sidebar">
      <div className="title">MedX</div>
      <div className="group">
        <button className="item" onClick={onNew}>
          <Plus size={16}/> New Chat
        </button>
      </div>
      <div className="group">
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={e=>{
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
        />
      </div>
    </aside>
  );
}
