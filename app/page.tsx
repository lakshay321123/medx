'use client';
import { useEffect, useState } from 'react';
import Markdown from '../components/Markdown';

type BannerItem = { title: string; source: string; time: string; url: string };

export default function Home() {
  const [q, setQ] = useState('weight loss medications');
  const [role, setRole] = useState<'patient' | 'clinician'>('clinician');
  const [out, setOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<BannerItem[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    fetch('/api/banner').then(r => r.json()).then(setBanner).catch(() => {});
  }, []);

  async function ask() {
    setLoading(true);
    setOut('');
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, question: q })
    });
    const t = await r.text();
    setOut(t);
    setLoading(false);
  }

  return (
    <div className="wrap">
      <header>
        <h1 style={{ margin: 0 }}>MedX</h1>
        <select
          className="pill"
          onChange={e => {
            document.documentElement.className = e.target.value === 'light' ? 'light' : '';
            setTheme(e.target.value as any);
          }}
          value={theme}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </header>

      <div className="banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>Latest trusted updates</div>
          <a href="/api/banner" className="pill" target="_blank">See JSON</a>
        </div>
        <div className="tiles">
          {banner.map((b, i) => (
            <a key={i} className="tile" href={b.url} target="_blank" rel="noreferrer">
              <div className="src">{b.source} • {b.time || ''}</div>
              <div>{b.title}</div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="searchBar">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ask anything medical…"
        />
        <div className="seg">
          <button className={role === 'patient' ? 'active' : ''} onClick={() => setRole('patient')}>Patient</button>
          <button className={role === 'clinician' ? 'active' : ''} onClick={() => setRole('clinician')}>Clinician</button>
        </div>
        <button className="btn" onClick={ask} disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button>
      </div>

      <div className="response">
        {out ? (
          <Markdown text={out} />
        ) : (
          <div className="markdown" style={{ color: 'var(--muted)' }}>
            Your answer will appear here with **bold**, lists, and clickable links.
          </div>
        )}
      </div>
    </div>
  );
}
