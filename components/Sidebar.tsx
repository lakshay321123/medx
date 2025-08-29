'use client';
export default function Sidebar({ onNew, onSearch }: { onNew:()=>void; onSearch:()=>void }) {
  return (
    <aside className="sidebar">
      <button onClick={onNew}>New</button>
      <button onClick={onSearch}>Search</button>
    </aside>
  );
}
