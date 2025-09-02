'use client';
import { Plus, Search, Settings } from 'lucide-react';

export default function Sidebar({
  onNew, onSearch
}: { onNew: ()=>void; onSearch: (q:string)=>void; }) {
  return (
    <div className="sidebar">
      <div className="title">MedX</div>
      <button className="item" onClick={onNew}><Plus size={16}/> New Chat</button>

      <div className="group">
        <div style={{ fontSize:12, color:'var(--muted)' }}>Search chats</div>
        <div style={{ display:'flex', gap:6 }}>
          <input placeholder="Search…" onChange={(e)=>onSearch(e.target.value)} />
          <div className="item" style={{ justifyContent:'center' }}><Search size={16}/></div>
        </div>
      </div>

      <div className="group">
        <div style={{ fontSize:12, color:'var(--muted)' }}>Settings</div>
        <button className="item"><Settings size={16}/> Preferences</button>
      </div>
    </div>
  );
}
