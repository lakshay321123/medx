'use client';
import { Plus, Search, Settings } from 'lucide-react';

type Result = { id:number; title:string; snippet:string };

export default function Sidebar({
  onNew, onSearch, results
}: { onNew: ()=>void; onSearch: (q:string)=>void; results: Result[]; }) {
  return (
    <aside className="sidebar">
      <div className="title">MedX</div>
      <button className="item" onClick={onNew}><Plus size={16}/> New Chat</button>

      <div className="group">
        <div style={{ fontSize:12, color:'var(--muted)' }}>Search chats</div>
        <div style={{ display:'flex', gap:6 }}>
          <input placeholder="Search…" onChange={(e)=>onSearch(e.target.value)} />
          <div className="item" style={{ justifyContent:'center' }}><Search size={16}/></div>
        </div>
      </div>

      {results.length>0 && (
        <div className="group">
          <div style={{ fontSize:12, color:'var(--muted)' }}>Matches</div>
          {results.map(r=>(
            <div key={r.id} className="item" style={{ flexDirection:'column', alignItems:'flex-start' }}>
              <div>{r.title}</div>
              {r.snippet && <div style={{ fontSize:12, color:'var(--muted)' }}>{r.snippet}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="group">
        <div style={{ fontSize:12, color:'var(--muted)' }}>Settings</div>
        <button className="item"><Settings size={16}/> Preferences</button>
      </div>
    </aside>
  );
}
